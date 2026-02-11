import { NavigationState, PathState } from "./TinkerableContext";

export const getOuterHostname = () => Array.from(window.location.ancestorOrigins)[0];

export const getSearchParams = (search?: string): Record<string, string> => Object.fromEntries(
  [...(new URLSearchParams(search ?? window.location.search).entries())]);


export const parseTarget = (target: string, navigation: NavigationState): NavigationState => {
  const newNavigation = { ...navigation };
  let [prehash, hash] = target.split("#")
  if (prehash) {
    let [path, search] = prehash.split("?")
    if (path) {
      newNavigation.sandboxPath = path
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
  { name: 'provider', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'namespace', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'repository', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'ref', pattern: '[a-zA-Z0-9-_]+' },
  { name: 'sandboxPath', pattern: '.*', transform: s => `/${s}` }
];

const OUTER_HREF_REGEXP = new RegExp('^' + PATH_SEGMENTS.map(({ name, pattern }) => `\/(?<${name}>${pattern})`).join('') + "$");


export const parsePath = (pathname: string): PathState => {
  const matchResults = pathname.match(OUTER_HREF_REGEXP)?.groups ?? {};
  return PATH_SEGMENTS.reduce((acc: Partial<PathState>, { name, transform }: PathSegment) => {
    let value: string | undefined = undefined;
    if (name in matchResults) {
      value = matchResults[name];
    }
    if (!value) {
      // fall back to default value if var not present in
      value = '';
    }
    if (typeof value === 'string') {
      acc[name] = transform ? transform(value) : value;
    }
    return acc;
  }, {}) as PathState;
}

export const parseHref = (href: string): NavigationState => {
  const parsedUrl = new URL(href);
  const pathnameState = parsePath(parsedUrl.pathname);
  return {
    ...pathnameState,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
  } as NavigationState
}

const stripSlashPrefix = (s: string): string => s.startsWith('/') ? s.substring(1) : s;

export const constructUrl = (navigationState: NavigationState): string => {
  const path = PATH_SEGMENTS.map(({ name }) => {
    let value = navigationState[name];
    return stripSlashPrefix(value ?? '');
  }).join('/');
  const host = getOuterHostname()
  let url = `${host}/${path}`
  if (navigationState.search) {
    url += '?' + navigationState.search
  }
  if (navigationState.hash) {
    url += '#' + navigationState.hash
  }
  return url;
}
