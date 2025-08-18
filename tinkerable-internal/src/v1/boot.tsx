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

export type BootProps = {
  mdxComponents?: Record<string, FC>;
  routes?: RoutingSpec;
};

export const TinkerableApp = ({ routingSpec }: { routingSpec: RoutingSpec }) => {
  const [context, setContext] = useState<TinkerableState>(getInitialContext(routingSpec));
  useEffect(
    () =>
      addListener('urlchange', ({ url }) => {
        setContext((context) => updateContext(context, url));
      }),
    []
  );
  return (
    <TinkerableContext value={{ context, setContext }}>
      <Router />
    </TinkerableContext>
  );
};

export const boot = ({ mdxComponents, routes }: BootProps) => {
  const routingSpec = createRoutingSpec(routes);
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
          <TinkerableApp routingSpec={routingSpec} />
        </MDXProvider>
      </ModuleCacheContextProvider>
    </StrictMode>
  );
};
