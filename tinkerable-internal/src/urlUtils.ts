import { NavigationState, PathnameState } from "./TinkerableContext";


export const getOuterHostname = () => Array.from(window.location.ancestorOrigins)[0];


export const parseTarget = (target:string, navigation:NavigationState):NavigationState => {
  const newNavigation = {...navigation};
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


export const maybeParseUrl = (str: string):URL|null => {
  try {
    return new URL(str);
  } catch (_) {
    return null;
  }
}

export const isAbsolutePath = (path:string) => path.startsWith('/');

export const isInternalHref = (target:string) => {
  const parsedUrl = maybeParseUrl(target);
  if (parsedUrl) {
    return target.startsWith(getOuterHostname());
  }
  return true;
}

export type PathSegment = {
  name: string,
  pattern: string,
  toUrlSegment?: (pathSegment: string)=>string
}

const PATH_SEGMENTS:PathSegment[] = [
  {name: 'mode', pattern: '\\w+'},
  {name: 'namespace', pattern: '[a-zA-Z0-9-_]+'},
  {name: 'site', pattern: '[a-zA-Z0-9-_]+'},
  {name: 'routeprefix', pattern: '[a-zA-Z0-9-_]+'},
  {name: 'path', pattern: '.*', toUrlSegment: s => `/${s}`}
];

const OUTER_HREF_REGEXP = new RegExp('^' + PATH_SEGMENTS.map(({name, pattern}) => `\/(?<${name}>${pattern})`).join('') + "$");

export const parsePath = (pathname:string): PathnameState => {
  const matchResults = pathname.match(OUTER_HREF_REGEXP)?.groups ?? {};
  return PATH_SEGMENTS.reduce((acc:Partial<PathnameState>, {name, toUrlSegment}:PathSegment) => {
    if (name in matchResults) {
      acc[name] = toUrlSegment ? toUrlSegment(matchResults[name]) : matchResults[name];
    }
    return acc;
  }, {}) as PathnameState;
}

export const parseOuterHref = (parentHref:string):NavigationState => {
  const parsedUrl = new URL(parentHref);
  const pathnameState = parsePath(parsedUrl.pathname);
  return {
    ...pathnameState,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
  } as NavigationState
}

const stripSlashPrefix = (s:string):string => s.startsWith('/') ? s.substring(1) : s;

export const constructUrl = (navigationState: NavigationState): string => {
  const path = PATH_SEGMENTS.map(({name}) => stripSlashPrefix(navigationState[name])).join('/');
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
