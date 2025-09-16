import type { RoutingSpec } from './RoutingSpec';
import { type TinkerableState } from './TinkerableContext';
import { parseHref, getSearchParams } from './urlUtils';
import { FilesMetadata } from './sandboxTypes';

export const getContextFromUrl = (routingSpec: RoutingSpec, outerHref: string, searchParams: Record<string, string>, filesMetadata?: FilesMetadata):TinkerableState => {
  const navigation = parseHref(outerHref, searchParams);
  return {
    filesMetadata: filesMetadata ?? {},
    routingSpec,
    outerHref,
    navigation
  }
}

export const getInitialContext = (routingSpec: RoutingSpec):(() => TinkerableState) => {
  const searchParams = getSearchParams()
  // initial href is passed in 'href' search param value
  return () => getContextFromUrl(routingSpec, searchParams['href'], searchParams);
}

export const updateContext = (context: TinkerableState, href: string):TinkerableState => {
  // No update is necessary if outerHref has not changed.
  if (href === context.outerHref) {
    return context;
  }
  const searchParams = getSearchParams()
  // the existing context is currently ignored
  return getContextFromUrl(context.routingSpec, href, searchParams, context.filesMetadata);
}
