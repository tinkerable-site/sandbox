import type { FC } from 'react';
import { useContext } from 'react';

import { sendMessage } from './sandboxUtils';
import { TinkerableContext } from './TinkerableContext';
import { RoutingSpec } from './RoutingSpec';
import { defaultErrorComponent, defaultLoadingComponent, Include } from './include';

export const Router = () => {
  const {navigation, routingSpec} = useContext(TinkerableContext);
  const Component = routingSpec[navigation.routeprefix];
  if (!Component) {
    // TODO: better error
    throw new Error(`RoutePrefix ${navigation.routeprefix} undefined!`);
  }
  return <Component />;
};


export const FileRouter: FC = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
}) => {
  const { navigation } = useContext(TinkerableContext);
  return <Include
    filename={navigation.path}
    LoadingComponent={LoadingComponent}
    ErrorComponent={ErrorComponent}
  />
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
