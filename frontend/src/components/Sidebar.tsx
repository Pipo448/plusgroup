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
  GitBranch,
  CreditCard,
  Smartphone,
  Phone,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

// ✅ Retire "/api/v1" pou jwenn base URL pou uploads
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '');

const Sidebar = () => {
  const { t } = useTranslation();
  const { tenant, user } = useAuth();
  const location = useLocation();

  // ✅ Fonction pou konstwi URL logo a kòrèkteman
  const getLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http')) return logoUrl;
    return `${BASE_URL}${logoUrl}`;
  };

  // Verifye si itilizatè a se admin
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

  // Verifye si plan se Antepriz
  const planName = tenant?.plan?.name || '';
  const isEnterprise = ['Antepriz', 'Entreprise', 'Enterprise'].includes(planName);

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

  // Seksyon Branch — admin sèlman
  const branchItem = {
    path: '/branches',
    icon: GitBranch,
    label: t('nav.branches') || 'Branches',
    color: '#C9A84C',
  };

  // Seksyon Antepriz — tout plan wè yo (lock si pa Antepriz)
  const enterpriseItems = [
    {
      path: '/kane',
      icon: CreditCard,
      label: t('nav.kane') || 'Ti Kanè Kès',
      color: '#C9A84C',
    },
    {
      path: '/sabotay',
      icon: Smartphone,
      label: t('nav.sabotay') || 'Sabotay',
      color: '#38bdf8',
    },
    {
      path: '/mobilpay',
      icon: Phone,
      label: t('nav.mobilpay') || 'MonCash / NatCash',
      color: '#a78bfa',
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
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
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

      {/* Navigation prensipal */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{ '--item-color': item.color } as React.CSSProperties}
            >
              <div className="sidebar-link-icon">
                <Icon size={20} />
              </div>
              <span className="sidebar-link-label">{item.label}</span>
              {isActive && <ChevronRight className="sidebar-link-arrow" size={16} />}
              {isActive && <div className="sidebar-link-active-bar" />}
            </NavLink>
          );
        })}

        {/* ── Branch (admin sèlman) */}
        {isAdmin && (() => {
          const isActive = location.pathname === branchItem.path;
          const Icon = branchItem.icon;
          return (
            <NavLink
              to={branchItem.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{ '--item-color': branchItem.color } as React.CSSProperties}
            >
              <div className="sidebar-link-icon">
                <Icon size={20} />
              </div>
              <span className="sidebar-link-label">{branchItem.label}</span>
              {isActive && <ChevronRight className="sidebar-link-arrow" size={16} />}
              {isActive && <div className="sidebar-link-active-bar" />}
            </NavLink>
          );
        })()}

        {/* ── Seksyon Antepriz */}
        <div className="sidebar-section-divider">
          <span className="sidebar-section-label">
            {isEnterprise ? '✦ ANTEPRIZ' : '✦ ANTEPRIZ'}
          </span>
        </div>

        {enterpriseItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const locked = !isEnterprise;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''} ${locked ? 'sidebar-link-locked' : ''}`}
              style={{ '--item-color': locked ? '#334155' : item.color } as React.CSSProperties}
            >
              <div className="sidebar-link-icon">
                <Icon size={20} />
              </div>
              <span className="sidebar-link-label">{item.label}</span>
              {/* Montre kle si pa Antepriz */}
              {locked && (
                <Lock
                  size={12}
                  style={{ marginLeft: 'auto', color: '#475569', flexShrink: 0 }}
                />
              )}
              {isActive && !locked && <ChevronRight className="sidebar-link-arrow" size={16} />}
              {isActive && <div className="sidebar-link-active-bar" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Badge plan aktyèl */}
        <div style={{
          padding: '6px 10px',
          borderRadius: 8,
          background: isEnterprise ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isEnterprise ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}`,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: isEnterprise ? '#C9A84C' : '#475569', fontWeight: 600 }}>
            {planName || 'Free'}
          </span>
          {!isEnterprise && (
            <NavLink
              to="/settings/billing"
              style={{ fontSize: 10, color: '#C9A84C', textDecoration: 'none', fontWeight: 700 }}
            >
              Upgrade →
            </NavLink>
          )}
        </div>
        <div className="sidebar-version">
          <span>v2.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
