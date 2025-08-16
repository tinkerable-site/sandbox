import {createContext} from 'react';
import { RoutingSpec } from './RoutingSpec';

export type PathnameState = {
  mode:string,
  namespace:string,
  site:string,
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
  routingSpec: RoutingSpec
}

export type TinkerableContextType = {
  context: TinkerableState,
  setContext: React.Dispatch<React.SetStateAction<TinkerableState>>
}

export const TinkerableContext = createContext<TinkerableContextType>({} as TinkerableContextType);
