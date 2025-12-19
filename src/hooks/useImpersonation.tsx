import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ImpersonatedUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  class_name: string | null;
  city: string | null;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  getEffectiveUserId: (realUserId: string | undefined) => string | undefined;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'impersonated_user';

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  // Charger l'état d'impersonnation depuis le sessionStorage au démarrage
  useEffect(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        setImpersonatedUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(IMPERSONATION_KEY);
      }
    }
  }, []);

  const startImpersonation = (user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(user));
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  };

  const getEffectiveUserId = (realUserId: string | undefined): string | undefined => {
    if (impersonatedUser) {
      return impersonatedUser.user_id;
    }
    return realUserId;
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUser,
        isImpersonating: !!impersonatedUser,
        startImpersonation,
        stopImpersonation,
        getEffectiveUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};
