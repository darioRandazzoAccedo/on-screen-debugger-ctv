import { createContext, useContext } from 'react';
import type { NavigationAdapter } from './types';

export const NavigationContext = createContext<NavigationAdapter | null>(null);

export function useNavigationAdapter(): NavigationAdapter {
  const adapter = useContext(NavigationContext);

  if (!adapter) {
    throw new Error(
      '[OnScreenDebugger] NavigationAdapter not found in context. ' +
        'Make sure to pass a navigationAdapter prop to <OnScreenDebugger>.',
    );
  }

  return adapter;
}
