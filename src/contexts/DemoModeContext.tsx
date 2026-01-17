import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
  demoUserEmail: string | null;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  demoUserEmail: null,
});

// Demo accounts for App Store reviewers
const DEMO_ACCOUNTS = [
  'appstore-customer@trustlinkventures.com',
  'appstore-admin@trustlinkventures.com',
];

export function DemoModeProvider({ children, userEmail }: { children: ReactNode; userEmail?: string | null }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (userEmail && DEMO_ACCOUNTS.includes(userEmail.toLowerCase())) {
      setIsDemoMode(true);
    } else {
      setIsDemoMode(false);
    }
  }, [userEmail]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, demoUserEmail: isDemoMode ? userEmail || null : null }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}

export function isDemoAccount(email: string): boolean {
  return DEMO_ACCOUNTS.includes(email.toLowerCase());
}
