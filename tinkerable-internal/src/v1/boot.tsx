import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { FC, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { RouteObject } from 'react-router';

import { SandboxRouterProvider } from './routing';
import { MDXProvider } from './MDXProvider';
import { DEFAULT_MDX_COMPONENTS } from './MDXComponents';

export type BootProps = {
  App?: FC;
  routes?: RouteObject[];
  components?: Record<string, FC>;
}

export const boot = ({App,routes,components}:BootProps) => {
  if ((!App) && (!routes)) {
    throw new Error("boot requires App or routes to be set");
  }
  const r = routes ?? [
    // By default, route everything to App
    // @ts-expect-error
    { path: '*', element: <App /> },
  ];
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("boot requires root HTML element to exist");
  }
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ChakraProvider value={defaultSystem}>
        <MDXProvider components={{...DEFAULT_MDX_COMPONENTS, ...(components ?? {})}}>
          <SandboxRouterProvider routes={r} />
        </MDXProvider>
      </ChakraProvider>
    </StrictMode>
  );
};
