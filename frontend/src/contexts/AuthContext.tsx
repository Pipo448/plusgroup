import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  preferredLang: string;
  avatarUrl?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  defaultCurrency: string;
  defaultLanguage: string;
  exchangeRate: number;
  taxRate: number;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (slug: string, email: string, password: string) => Promise<void>; // ✅ slug ajoute
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser]     = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Kle localStorage inifye
  const STORAGE = {
    token:  'plusgroup-token',
    user:   'plusgroup-user',
    tenant: 'plusgroup-tenant',
    slug:   'plusgroup-slug',
    lang:   'plusgroup-lang',
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem(STORAGE.token);
        const savedUser = localStorage.getItem(STORAGE.user);

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));

          // Fetch fresh user data from backend
          const response = await authAPI.me();
          if (response.data.success) {
            setUser(response.data.user);
            setTenant(response.data.tenant);
            localStorage.setItem(STORAGE.user,   JSON.stringify(response.data.user));
            localStorage.setItem(STORAGE.tenant, JSON.stringify(response.data.tenant));
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ✅ login kounye a aksepte slug kòm premye paramèt
  const login = async (slug: string, email: string, password: string) => {
    try {
      const response = await authAPI.login({ slug, email, password });

      if (response.data.success && response.data.token) {
        // Sove token + slug
        localStorage.setItem(STORAGE.token, response.data.token);
        localStorage.setItem(STORAGE.user,  JSON.stringify(response.data.user));
        localStorage.setItem(STORAGE.slug,  slug);

        setUser(response.data.user);

        if (response.data.user.preferredLang) {
          localStorage.setItem(STORAGE.lang, response.data.user.preferredLang);
        }

        // Fetch tenant info (slug deja nan localStorage, interceptor ap jwenn li)
        try {
          const meResponse = await authAPI.me();
          if (meResponse.data.success && meResponse.data.tenant) {
            setTenant(meResponse.data.tenant);
            localStorage.setItem(STORAGE.tenant, JSON.stringify(meResponse.data.tenant));
          }
        } catch (err) {
          console.error('Failed to fetch tenant:', err);
        }

        navigate('/dashboard');
      } else {
        throw new Error(response.data.message || 'Login echwe.');
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Email oswa modpas pa kòrèk.';
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTenant(null);
      Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
      navigate('/login');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(STORAGE.user, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
