/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@baixometro/shared-types';

export const AUTH_TOKEN_KEY = 'baixometro_token';
export const AUTH_USER_KEY = 'baixometro_user';
export const UNAUTHORIZED_EVENT = 'baixometro:unauthorized';

export type AuthModalTab = 'login' | 'register';

export interface OpenAuthModalOptions {
  defaultTab?: AuthModalTab;
  onSuccess?: () => void | Promise<void>;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  authModalOpen: boolean;
  authModalDefaultTab: AuthModalTab;
  login: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  completeAuthModal: (token: string, user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] =
    useState<AuthModalTab>('register');
  const pendingOnSuccessRef = useRef<(() => void | Promise<void>) | undefined>(
    undefined,
  );

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    setAuthModalDefaultTab(options?.defaultTab ?? 'register');
    pendingOnSuccessRef.current = options?.onSuccess;
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    pendingOnSuccessRef.current = undefined;
  }, []);

  const completeAuthModal = useCallback(
    async (newToken: string, newUser: User) => {
      login(newToken, newUser);
      setAuthModalOpen(false);
      const callback = pendingOnSuccessRef.current;
      pendingOnSuccessRef.current = undefined;
      if (callback) {
        await callback();
      }
    },
    [login],
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      authModalOpen,
      authModalDefaultTab,
      login,
      updateUser,
      logout,
      openAuthModal,
      closeAuthModal,
      completeAuthModal,
    }),
    [
      user,
      token,
      authModalOpen,
      authModalDefaultTab,
      login,
      updateUser,
      logout,
      openAuthModal,
      closeAuthModal,
      completeAuthModal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
