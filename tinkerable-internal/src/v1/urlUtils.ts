import { NavigationState } from "./TinkerableContext";


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

const PATH_SEGMENTS = [
  ['mode', '\\w+'],
  ['namespace', '[a-zA-Z0-9-_]+'],
  ['site', '[a-zA-Z0-9-_]+'],
  ['routeprefix', '[a-zA-Z0-9-_]+'],
  ['path', '.*']
];

const OUTER_HREF_REGEXP = new RegExp('^' + PATH_SEGMENTS.map(([name, pattern]) => `\/(?<${name}>${pattern})`).join('') + "$");

export const parseOuterHref = (parentHref:string):NavigationState => {
  const parsedUrl = new URL(parentHref);
  const {path, ...rest} = parsedUrl.pathname.match(OUTER_HREF_REGEXP)?.groups ?? {};
  return {
    ...rest,
    path: '/' + path,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
  } as NavigationState
}

const stripSlashPrefix = (s:string):string => s.startsWith('/') ? s.substring(1) : s;

export const constructUrl = (navigationState: NavigationState): string => {
  const path = PATH_SEGMENTS.map(([name, _pattern]) => stripSlashPrefix(navigationState[name])).join('/');
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
