import {createContext} from 'react';
import { RoutingRule, RoutingSpec } from './RoutingSpec';
import { FilesMetadata } from './sandboxTypes';


export type PathState = {
  mode:string,
  namespace:string,
  provider:string,
  repository:string,
  ref:string,
  sandboxPath:string,
  pathParameters?: Record<string, string>
  routingRule?: RoutingRule
}

export type NavigationState = PathState & {
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
