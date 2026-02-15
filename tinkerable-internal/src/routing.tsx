import { use, useContext } from 'react';

import { sendMessage } from './sandboxUtils';
import { NavigationState, TinkerableContext } from './TinkerableContext';
import { RoutingRule, RoutingSpec } from './RoutingSpec';
import { constructUrl, isAbsolutePath, parseTarget } from './urlUtils';
import { joinPaths } from './pathUtils';

export type AppliedRoutingRule = {
  routingRule: RoutingRule,
  pathParameters?: Record<string, string>;
}

export const useTinkerableLink = (newSandboxLocation: string) => {
  const { outerHref, navigationState: navigation } = use(TinkerableContext);
  let newNavigationState = parseTarget(newSandboxLocation, navigation);
  if (!isAbsolutePath(newSandboxLocation)) {
    newNavigationState.sandboxPath = joinPaths(navigation.sandboxPath, newSandboxLocation)
  } else {
    newNavigationState.sandboxPath = newSandboxLocation
  }
  return constructUrl(outerHref, newNavigationState);
}

export const applyRoutingRule = (routingSpec:RoutingSpec, navigationState: NavigationState): AppliedRoutingRule | undefined => {
  const { sandboxPath } = navigationState;
  for (const routingRule of routingSpec.routes) {
    if (typeof routingRule.pattern === 'string') {
      if (routingRule.pattern === sandboxPath) {
        return {routingRule};
      }
    } else {
      const match = sandboxPath.match(routingRule.pattern);
      if (routingRule.pattern.test(sandboxPath)) {
        return {
          routingRule,
          pathParameters: match?.groups
        }
      }
    }
  }
  return undefined;
}

export const Router = () => {
  const context = useContext(TinkerableContext);
  const {navigationState: {routingRule}} = context;
  if (!routingRule) {
    // TODO: better error
    throw new Error(`No route registered for path ${context.navigationState.sandboxPath}!`);
  }

  return routingRule.reactNode;
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
