import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Receipt,
  Archive,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

// ✅ Retire "/api/v1" pou jwenn base URL pou uploads
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '');

const Sidebar = () => {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const location = useLocation();

  // ✅ Fonction pou konstwi URL logo a kòrèkteman
  const getLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http')) return logoUrl; // deja yon URL konplè
    return `${BASE_URL}${logoUrl}`;                 // ajoute base URL devan
  };

  const menuItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      color: '#6366f1',
    },
    {
      path: '/products',
      icon: Package,
      label: t('nav.products'),
      color: '#8b5cf6',
    },
    {
      path: '/clients',
      icon: Users,
      label: t('nav.clients'),
      color: '#ec4899',
    },
    {
      path: '/quotes',
      icon: FileText,
      label: t('nav.quotes'),
      color: '#f59e0b',
    },
    {
      path: '/invoices',
      icon: Receipt,
      label: t('nav.invoices'),
      color: '#10b981',
    },
    {
      path: '/stock',
      icon: Archive,
      label: t('nav.stock'),
      color: '#06b6d4',
    },
    {
      path: '/reports',
      icon: BarChart3,
      label: t('nav.reports'),
      color: '#f97316',
    },
    {
      path: '/settings',
      icon: Settings,
      label: t('nav.settings'),
      color: '#64748b',
    },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-brand">
        {tenant?.logoUrl ? (
          <img
            src={getLogoUrl(tenant.logoUrl)}
            alt={tenant.name}
            className="sidebar-logo"
            onError={(e) => {
              // ✅ Si imaj la pa chaje, montre placeholder a
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Placeholder — parèt si logo pa chaje oswa pa egziste */}
        <div
          className="sidebar-logo-placeholder"
          style={{ display: tenant?.logoUrl ? 'none' : 'flex' }}
        >
          <Package size={32} />
        </div>
        <div className="sidebar-brand-info">
          <h2 className="sidebar-brand-name">{tenant?.name || 'PLUS GROUP'}</h2>
          <p className="sidebar-brand-subtitle">Innov@tion & Tech</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={
                {
                  '--item-color': item.color,
                } as React.CSSProperties
              }
            >
              <div className="sidebar-link-icon">
                <Icon size={20} />
              </div>
              <span className="sidebar-link-label">{item.label}</span>
              {isActive && (
                <ChevronRight className="sidebar-link-arrow" size={16} />
              )}
              {isActive && <div className="sidebar-link-active-bar" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-version">
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
