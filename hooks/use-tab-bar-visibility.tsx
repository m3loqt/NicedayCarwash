import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface TabBarVisibilityValue {
  hidden: boolean;
  hideTabBar: () => void;
  showTabBar: () => void;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityValue | null>(null);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const hideTabBar = useCallback(() => setHidden(true), []);
  const showTabBar = useCallback(() => setHidden(false), []);

  return (
    <TabBarVisibilityContext.Provider value={{ hidden, hideTabBar, showTabBar }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    // Default no-op fallback for anything rendered outside the provider.
    return { hidden: false, hideTabBar: () => {}, showTabBar: () => {} };
  }
  return ctx;
}
