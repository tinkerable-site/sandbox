import type { RoutingSpec } from './RoutingSpec';
import { type TinkerableState } from './TinkerableContext';
import { parseOuterHref } from './urlUtils';
import { FilesMetadata } from './sandboxTypes';

export const getContextFromUrl = (routingSpec: RoutingSpec, outerHref: string, filesMetadata?: FilesMetadata):TinkerableState => {
  return {
    filesMetadata: filesMetadata ?? {},
    routingSpec,
    outerHref,
    navigation: parseOuterHref(outerHref)
  }
}

export const getInitialContext = (routingSpec: RoutingSpec):(() => TinkerableState) => {
  return () => getContextFromUrl(routingSpec, new URLSearchParams(window.location.search).get('href')!);
}

export const updateContext = (context: TinkerableState, href: string):TinkerableState => {
  // No update is necessary if outerHref has not changed.
  if (href === context.outerHref) {
    return context;
  }
  // the existing context is currently ignored
  return getContextFromUrl(context.routingSpec, href, context.filesMetadata);
}
