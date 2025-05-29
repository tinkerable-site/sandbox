import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { FC, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from "next-themes"
import { DEFAULT_MDX_COMPONENTS } from './MDXComponents';
import { MDXProvider } from './MDXProvider';


export type BootProps = {
  App: FC;
  components?: Record<string, FC>;
};

export const boot = ({ App, components }: BootProps) => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('boot requires root HTML element to exist');
  }
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ChakraProvider value={defaultSystem}>
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <MDXProvider components={{ ...DEFAULT_MDX_COMPONENTS, ...(components ?? {}) }}>
            <App />
          </MDXProvider>
        </ThemeProvider>
      </ChakraProvider>
    </StrictMode>
  );
};
