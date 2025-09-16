import { NavigationState, PathnameState } from "./TinkerableContext";


export const getOuterHostname = () => Array.from(window.location.ancestorOrigins)[0];

export const getSearchParams = (search?: string): Record<string, string> => Object.fromEntries(
  [...(new URLSearchParams(search ?? window.location.search).entries())]);


export const parseTarget = (target: string, navigation: NavigationState): NavigationState => {
  const newNavigation = { ...navigation };
  let [prehash, hash] = target.split("#")
  if (prehash) {
    let [path, search] = prehash.split("?")
    if (path) {
      newNavigation.path = path
    }
    newNavigation.search = search ? search : '';
  }
  newNavigation.hash = hash ? hash : '';
  return newNavigation
}


export const maybeParseUrl = (str: string): URL | null => {
  try {
    return new URL(str);
  } catch (_) {
    return null;
  }
}

export const isAbsolutePath = (path: string) => path.startsWith('/');

export const isInternalHref = (target: string) => {
  const parsedUrl = maybeParseUrl(target);
  if (parsedUrl) {
    return target.startsWith(getOuterHostname());
  }
  return true;
}

export type PathSegment = {
  name: string,
  pattern: string,
  transform?: (pathSegment: string) => string
}

const PATH_SEGMENTS: PathSegment[] = [
  { name: 'mode', pattern: '\\w+' },
  { name: 'namespace', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'site', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'routeprefix', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'path', pattern: '.*', transform: s => `/${s}` }
];

const OUTER_HREF_REGEXP = new RegExp('^' + PATH_SEGMENTS.map(({ name, pattern }) => `\/(?<${name}>${pattern})`).join('') + "$");

const getDefaultFromSearchParams = (name: string, searchParams: Record<string, string>): string|undefined => {
    const default_key = `default_${name}`;
    return searchParams[default_key]
}

export const parsePath = (pathname: string, searchParams: Record<string, string>): PathnameState => {
  const matchResults = pathname.match(OUTER_HREF_REGEXP)?.groups ?? {};
  return PATH_SEGMENTS.reduce((acc: Partial<PathnameState>, { name, transform }: PathSegment) => {
    let value: string | undefined = undefined;
    if (name in matchResults) {
      value = matchResults[name];
    }
    if (!value) {
      // fall back to default value if var not present in
      value = getDefaultFromSearchParams(name, searchParams);
    }
    if (value) {
      acc[name] = transform ? transform(value) : value;
    }
    return acc;
  }, {}) as PathnameState;
}

export const parseHref = (href: string, searchParams: Record<string, string>): NavigationState => {
  const parsedUrl = new URL(href);
  const pathnameState = parsePath(parsedUrl.pathname, searchParams);
  return {
    ...pathnameState,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
  } as NavigationState
}

const stripSlashPrefix = (s: string): string => s.startsWith('/') ? s.substring(1) : s;

export const constructUrl = (navigationState: NavigationState): string => {
  const searchParams = getSearchParams();
  const path = PATH_SEGMENTS.map(({ name }) => {
    let value = navigationState[name];
    if (!value) {
      value = getDefaultFromSearchParams(name, searchParams);
    }
    return stripSlashPrefix(value ?? '');
  }).join('/');
  const host = getOuterHostname()
  let url = `${host}/${path}`
  if (navigationState.search) {
    url += navigationState.search
  }
  if (navigationState.hash) {
    url += navigationState.hash
  }
  return url;
}
