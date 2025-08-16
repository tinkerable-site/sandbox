import type { FC } from 'react';
import { Suspense, lazy, useContext } from 'react';

import { sendMessage } from './sandboxUtils';
import { NavigationState, TinkerableContext } from './TinkerableContext';
import { RoutingSpec } from './RoutingSpec';

export const Router = () => {
  const {context: {navigation, routingSpec}} = useContext(TinkerableContext);
  const Component = routingSpec[navigation.routeprefix];
  if (!Component) {
    // TODO: better error
    throw new Error(`RoutePrefix ${navigation.routeprefix} undefined!`);
  }
  return <Component />;
};

export const defaultLoadingComponent = () => <>loading...</>;

export const defaultErrorComponent = ({ error }: { error: string }) => <>{error}</>;

export const FileRouter: FC = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
}) => {
  const { context } = useContext(TinkerableContext);

  const MyComponent = lazy(async () => {
    try {
      // @ts-ignore
      return await module.dynamicImport(context.navigation.path, '*');
    } catch (e) {
      return {
        default: () => <ErrorComponent error={String(e)} />,
      };
    }
  });
  // TODO: add react error boundary
  return (
    <Suspense fallback={<LoadingComponent />}>
      <MyComponent />
    </Suspense>
  );
};

// Perform in-site navigation.
// Top level frame is messaged to updated URL, after which a message will be
// sent wit the new href, triggering the actual navigation.
export const navigate = (target: string) => {
  sendMessage('urlchange', {
    url: target,
    back: false,
    forward: false,
  });
};

export const createRoutingSpec = (routes?: RoutingSpec): RoutingSpec => {
  return {
    files: FileRouter,
    ...(routes ?? {}),
  };
};
