import type { ReactNode } from 'react';

export type RoutingRule = {
  name?: string;
  pattern: string | RegExp;
  reactNode: ReactNode | string;
};

export type RoutingSpec = {
  routes: RoutingRule[];
}
