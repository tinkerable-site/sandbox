import {createContext} from 'react';
import { RoutingSpec } from './RoutingSpec';
import { FilesMetadata } from './sandboxTypes';


export type PathnameState = {
  mode:string,
  namespace:string,
  provider:string,
  repository:string,
  ref:string,
  routeprefix:string,
  path:string,
}

export type NavigationState = PathnameState & {
  hash:string,
  search:string,
}

export type TinkerableState = {
  outerHref: string,
  navigation: NavigationState,
  routingSpec: RoutingSpec,
  filesMetadata: FilesMetadata;
}

export const TinkerableContext = createContext<TinkerableState>({} as TinkerableState);
