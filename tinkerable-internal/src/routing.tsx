import type { FC } from 'react';
import { useContext } from 'react';

import { sendMessage } from './sandboxUtils';
import { TinkerableContext } from './TinkerableContext';
import { RoutingSpec } from './RoutingSpec';
import { defaultErrorComponent, defaultLoadingComponent, Include } from './include';

export const Router = () => {
  const {navigation, routingSpec} = useContext(TinkerableContext);
  const reactNode = routingSpec.routePrefixes[navigation.routeprefix];
  if (!reactNode) {
    // TODO: better error
    throw new Error(`RoutePrefix ${navigation.routeprefix} undefined!`);
  }
  return reactNode;
};


export const FileRouter: FC = ({
  LoadingComponent = defaultLoadingComponent,
  ErrorComponent = defaultErrorComponent,
}: {
  LoadingComponent?: typeof defaultLoadingComponent;
  ErrorComponent?: typeof defaultErrorComponent;
}) => {
  const { navigation, routingSpec } = useContext(TinkerableContext);
  const resolvedPath = (navigation.path in routingSpec.aliases) ? routingSpec.aliases[navigation.path] : navigation.path;
  return <Include
    filename={resolvedPath}
    LoadingComponent={LoadingComponent}
    ErrorComponent={ErrorComponent}
    // @ts-ignore
    baseModule={module}
  />
};

// Perform in-site navigation.
// Top level frame is messaged to updated URL, after which a message will be
// sent wit the new href, triggering the actual navigation.
export const navigate = (target: string) => {
  console.log(`[Sandbox] Navigating to ${target}`)
  sendMessage('urlchange', {
    url: target,
    back: false,
    forward: false,
  });
};

export const createRoutingSpec = (routes: Partial<RoutingSpec> = {}): RoutingSpec => {
  return {
    routePrefixes: {
      files: <FileRouter />,
      ...(routes?.routePrefixes ?? {}),
    },
    aliases: routes.aliases ?? {}
  };
};
