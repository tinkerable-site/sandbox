import { FC, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ErrorNotFound } from './components/errors';
import { FileRouter } from './components/FileRouter';
import { MainContent } from './components/MainContent';
import { DEFAULT_MDX_COMPONENTS } from './components/MDXComponents';
import { getInitialContext, updateContext } from './contextUtils';
import { MDXProvider } from './MDXProvider';
import { ModuleCache, ModuleCacheContextProvider } from './moduleCache';
import { Router } from './routing';
import type { RoutingSpec } from './RoutingSpec';
import { FilesMetadata } from './sandboxTypes';
import { addListener } from './sandboxUtils';
import { TinkerableContext, TinkerableState } from './TinkerableContext';
import { FILES_PREFIX } from './urlUtils';

export type BootProps = {
  mdxComponents?: Record<string, FC>;
  routingSpec?: RoutingSpec;
};

const updateAlreadyApplied = (filesMetadata: FilesMetadata, update: FilesMetadata) => {
  for (let [key, value] of Object.entries(update)) {
    if (filesMetadata[key] !== value) {
      return false;
    }
  }
  return true;
};

export const TinkerableApp = ({ routingSpec }: { routingSpec: RoutingSpec }) => {
  const [context, setContext] = useState<TinkerableState>(getInitialContext(routingSpec));
  useEffect(() => {
    const removeListener = addListener('urlchange', ({ url }) => {
      setContext((context) => {
        const updatedContext = updateContext(context, url);
        if (updatedContext !== context) {
          console.log(
            `[Sandbox] Updating path from ${context.navigationState.sandboxPath} to ${updatedContext.navigationState.sandboxPath}`
          );
        }
        return updatedContext;
      });
    });
    return removeListener;
  }, [setContext]);
  useEffect(() => {
    const dispose = addListener(
      'metadata-update',
      ({ update }: Record<string, any>) => {
        setContext((prevContext) =>
          updateAlreadyApplied(prevContext.filesMetadata, update)
            ? prevContext
            : {
                ...prevContext,
                filesMetadata: {
                  // TODO: file deletion!
                  ...prevContext.filesMetadata,
                  ...update,
                },
              }
        );
      },
      // @ts-ignore
      module.evaluation.module.bundler.onMetadataChange
    );
    // @ts-ignore
    module.evaluation.module.bundler.onMetadataChangeEmitter.enable();
    return dispose;
  }, [setContext]);

  return (
    <TinkerableContext value={context}>
      <Router />
    </TinkerableContext>
  );
};

// from: https://stackoverflow.com/a/63838890
const escapeForRegexp = (str: string) => str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');

export const DEFAULT_ROUTING_SPEC: RoutingSpec = {
  routes: [
    { name: 'MainContent', pattern: /^\/$/, reactNode: <MainContent /> },
    {
      name: 'FileRouter',
      pattern: new RegExp(`^${escapeForRegexp(FILES_PREFIX)}(?<filename>\/.+)$`),
      reactNode: <FileRouter />,
    },
    { name: 'ErrorNotFound', pattern: /^(?<path>.+)$/, reactNode: <ErrorNotFound /> },
  ],
};

export const boot = ({
  mdxComponents = DEFAULT_MDX_COMPONENTS,
  routingSpec = DEFAULT_ROUTING_SPEC,
}: BootProps = {}) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('boot requires root HTML element to exist');
  }
  const moduleCache = new ModuleCache();
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ModuleCacheContextProvider moduleCache={moduleCache}>
        <MDXProvider components={mdxComponents}>
          <TinkerableApp routingSpec={routingSpec} />
        </MDXProvider>
      </ModuleCacheContextProvider>
    </StrictMode>
  );
};
