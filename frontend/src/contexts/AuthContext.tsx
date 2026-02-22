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
  login: (email: string, password: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('plusgroup-token');
        const savedUser = localStorage.getItem('plusgroup-user');
        
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          
          // Fetch fresh user data from backend
          const response = await authAPI.getMe();
          if (response.data.success) {
            setUser(response.data.user);
            setTenant(response.data.tenant);
            localStorage.setItem('plusgroup-user', JSON.stringify(response.data.user));
            localStorage.setItem('plusgroup-tenant', JSON.stringify(response.data.tenant));
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        // Clear invalid token
        localStorage.removeItem('plusgroup-token');
        localStorage.removeItem('plusgroup-user');
        localStorage.removeItem('plusgroup-tenant');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.data.success && response.data.token) {
        // Save token
        localStorage.setItem('plusgroup-token', response.data.token);
        localStorage.setItem('plusgroup-user', JSON.stringify(response.data.user));
        
        // Set state
        setUser(response.data.user);
        
        // Set language preference
        if (response.data.user.preferredLang) {
          localStorage.setItem('plusgroup-lang', response.data.user.preferredLang);
        }
        
        // Fetch tenant info
        try {
          const meResponse = await authAPI.getMe();
          if (meResponse.data.success && meResponse.data.tenant) {
            setTenant(meResponse.data.tenant);
            localStorage.setItem('plusgroup-tenant', JSON.stringify(meResponse.data.tenant));
          }
        } catch (err) {
          console.error('Failed to fetch tenant:', err);
        }
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(
        error?.message || 
        'Email oswa modpas pa kòrèk. / Email ou mot de passe incorrect.'
      );
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state
      setUser(null);
      setTenant(null);
      
      // Clear storage
      localStorage.removeItem('plusgroup-token');
      localStorage.removeItem('plusgroup-user');
      localStorage.removeItem('plusgroup-tenant');
      
      // Navigate to login
      navigate('/login');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('plusgroup-user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    tenant,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
