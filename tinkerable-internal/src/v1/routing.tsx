import * as React from 'react';
import { RouteObject, RouterProvider, createBrowserRouter, useParams } from 'react-router';

import { defaultErrorComponent, defaultLoadingComponent, withAsyncComponent } from './AsyncComponent';

const makeProxy = (obj: any) =>
  new Proxy(obj, {
    get(target, key) {
      console.log('get', obj, ...arguments);
      return target[key] ?? undefined;
    },
    set(target, key, value) {
      console.log('set', obj, ...arguments);
      if (key in target) {
        return false;
      }
      return (target[key] = value);
    },
  });

const makeLocation = (myLocation = window.location, pathname?: string) => {
  return {
    ...JSON.parse(JSON.stringify(myLocation)),
    pathname: pathname ?? myLocation.pathname,
    assign: (...args: any[]) => {
      console.log('assign', args);
    },
  } as typeof window.location;
};

const makeWindow = (myLocation: typeof window.location) => {
  return {
    location: myLocation,
    history: {
      replaceState: (...args: any[]) => {
        console.log('replaceState', args);
      },
      length: 1,
      scrollRestoration: 'auto',
      state: null
    } as (typeof window.history.state),
    addEventListener: (...args: any[]) => {
      console.log('addEventListener', args);
    },
  } as typeof window;
};

export const SandboxRouterProvider = ({ routes, initialPath }: { routes: RouteObject[]; initialPath?: string }) => {
  const memoizedRouter = React.useMemo(() => {
    const pathname = initialPath ?? new URLSearchParams(window.location.search).get('path') ?? '/';
    const myLocation = makeLocation(window.location, pathname);
    const myWindow = makeWindow(myLocation);
    const router = createBrowserRouter(routes, { window: myWindow });
    return router;
  }, [routes]);

  return <RouterProvider router={memoizedRouter} />;
};

export const Path: React.FC = ({
  loadingComponent = defaultLoadingComponent,
  errorComponent = defaultErrorComponent,
}: {
  loadingComponent?: typeof defaultLoadingComponent;
  errorComponent?: typeof defaultErrorComponent;
}) => {
  // TODO: error handling
  let params = useParams();
  // prefix with '/' to make URL more natural
  let filePath = '/' + params['*'];
  const Component = withAsyncComponent(
    // module.dynamicImport is defined in the sandbox environment.
    // Note that dynamicImport is always relative to the current module,
    // in this case @tinkerable/internal/v1, but this is ok since
    // <Path> only makes sense with absolute module paths.
    // @ts-ignore
    module.dynamicImport(filePath),
    loadingComponent,
    errorComponent
  );
  return <Component />;
};
