import type { ReactNode } from 'react';
export type RoutingSpec = {
  aliases: Record<string, string>;
  routePrefixes: Record<string, ReactNode>;
}
