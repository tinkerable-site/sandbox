import { FC, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DEFAULT_MDX_COMPONENTS } from './components';
import { getInitialContext, updateContext } from './contextUtils';
import { MDXProvider } from './MDXProvider';
import { ModuleCache, ModuleCacheContextProvider } from './moduleCache';
import { Router, createRoutingSpec } from './routing';
import { RoutingSpec } from './RoutingSpec';
import { addListener } from './sandboxUtils';
import { TinkerableContext, TinkerableState } from './TinkerableContext';
import { FilesMetadata } from './sandboxTypes';

export type BootProps = {
  mdxComponents?: Record<string, FC>;
  routingSpec?: Partial<RoutingSpec>;
};

const updateAlreadyApplied = (filesMetadata: FilesMetadata, update: FilesMetadata) => {
  for (let [key, value] of Object.entries(update)) {
    if (filesMetadata[key] !== value) {
      return false
    }
  }
  return true;
}

export const TinkerableApp = ({ routingSpec }: { routingSpec: RoutingSpec }) => {
  const [context, setContext] = useState<TinkerableState>(getInitialContext(routingSpec));
  useEffect(
    () =>
      addListener('urlchange', ({ url }) => {
        setContext((context) => updateContext(context, url));
      }),
    [setContext]
  );
  useEffect(() => {
    const dispose = addListener(
      'metadata-update',
      ({ update }: Record<string, any>) => {
        setContext(prevContext => updateAlreadyApplied(prevContext.filesMetadata, update) ? prevContext : ({
          ...prevContext,
          filesMetadata: {
            // TODO: file deletion!
            ...(prevContext.filesMetadata),
            ...update,
          },
        }));
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

export const boot = ({ mdxComponents, routingSpec }: BootProps) => {
  const effectiveRoutingSpec = createRoutingSpec(routingSpec);
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('boot requires root HTML element to exist');
  }
  const moduleCache = new ModuleCache();
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ModuleCacheContextProvider moduleCache={moduleCache}>
        <MDXProvider components={{ ...DEFAULT_MDX_COMPONENTS, ...(mdxComponents ?? {}) }}>
          <TinkerableApp routingSpec={effectiveRoutingSpec} />
        </MDXProvider>
      </ModuleCacheContextProvider>
    </StrictMode>
  );
};
