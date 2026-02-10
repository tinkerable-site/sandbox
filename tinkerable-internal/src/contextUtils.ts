import type { RoutingSpec } from './RoutingSpec';
import { type TinkerableState } from './TinkerableContext';
import { parseHref, getSearchParams } from './urlUtils';
import { FilesMetadata } from './sandboxTypes';
import { applyRoutingRule } from './routing';

export const getContextFromUrl = (routingSpec: RoutingSpec, outerHref: string, filesMetadata?: FilesMetadata):TinkerableState => {
  const navigationState = parseHref(outerHref);
  const appliedRoutingRule = applyRoutingRule(routingSpec, navigationState);
    if (!appliedRoutingRule) {
      // TODO: better error
      throw new Error(`No route registered for path ${navigationState.sandboxPath}!`);
    }
  return {
    filesMetadata: filesMetadata ?? {},
    routingSpec,
    outerHref,
    navigation: {
      ...navigationState,
      ...appliedRoutingRule
    }
  }
}

export const getInitialContext = (routingSpec: RoutingSpec):(() => TinkerableState) => {
  const searchParams = getSearchParams()
  // initial href is passed in 'href' search param value
  return () => getContextFromUrl(routingSpec, searchParams['href']);
}

export const updateContext = (context: TinkerableState, href: string):TinkerableState => {
  // No update is necessary if outerHref has not changed.
  if (href === context.outerHref) {
    return context;
  }
  return getContextFromUrl(context.routingSpec, href, context.filesMetadata);
}
