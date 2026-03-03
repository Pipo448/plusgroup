// src/components/NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ShoppingCart, CreditCard, Package, AlertTriangle, Info } from 'lucide-react';
import api from '../services/api'; // axios instance ou genyen deja

// ─── helpers ───────────────────────────────────────────────────────────────
const POLL_INTERVAL = 30_000; // 30 segonn

function timeAgo(dateStr, lang = 'ht') {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return lang === 'fr' ? 'À l\'instant' : lang === 'en' ? 'Just now' : 'Kounye a';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === 'fr' ? `Il y a ${m}min` : lang === 'en' ? `${m}m ago` : `${m}min pase`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === 'fr' ? `Il y a ${h}h` : lang === 'en' ? `${h}h ago` : `${h}h pase`;
  }
  const d = Math.floor(diff / 86400);
  return lang === 'fr' ? `Il y a ${d}j` : lang === 'en' ? `${d}d ago` : `${d}j pase`;
}

function getIcon(type) {
  switch (type) {
    case 'invoice_created': return <ShoppingCart size={16} />;
    case 'invoice_paid':    return <CheckCheck size={16} />;
    case 'payment_received': return <CreditCard size={16} />;
    case 'low_stock':       return <AlertTriangle size={16} />;
    default:                return <Info size={16} />;
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'invoice_created':  return '#1B2A8F';
    case 'invoice_paid':     return '#16a34a';
    case 'payment_received': return '#0891b2';
    case 'low_stock':        return '#ea580c';
    default:                 return '#6b7280';
  }
}

// ─── composant principal ────────────────────────────────────────────────────
export default function NotificationBell({ lang = 'ht' }) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState([]);
  const [unreadCount, setUnread]      = useState(0);
  const [loading, setLoading]         = useState(false);
  const [page, setPage]               = useState(0);
  const [hasMore, setHasMore]         = useState(false);
  const [total, setTotal]             = useState(0);
  const panelRef                      = useRef(null);
  const LIMIT                         = 15;

  // ── fetch notifikasyon ──────────────────────────────────────────────────
  const fetchNotifs = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const offset = reset ? 0 : page * LIMIT;
      const { data } = await api.get('/notifications', {
        params: { limit: LIMIT, offset },
      });
      if (data.success) {
        setNotifs(prev => reset ? data.notifications : [...prev, ...data.notifications]);
        setUnread(data.unreadCount);
        setTotal(data.total);
        setHasMore((reset ? LIMIT : (page + 1) * LIMIT) < data.total);
        if (reset) setPage(0);
      }
    } catch (err) {
      console.error('Notifikasyon pa chaje:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // ── poll pou konte pa li ────────────────────────────────────────────────
  const pollUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      if (data.success) setUnread(data.unreadCount);
    } catch {}
  }, []);

  useEffect(() => {
    pollUnread();
    const interval = setInterval(pollUnread, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [pollUnread]);

  // ── louvri panel → chaje ────────────────────────────────────────────────
  useEffect(() => {
    if (open) fetchNotifs(true);
  }, [open]);

  // ── fèmen si klike deyò ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── mache 1 kòm li ─────────────────────────────────────────────────────
  const handleRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  // ── mache tout kòm li ──────────────────────────────────────────────────
  const handleMarkAll = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {}
  };

  // ── efase ──────────────────────────────────────────────────────────────
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
      setTotal(prev => prev - 1);
    } catch {}
  };

  // ── load more ──────────────────────────────────────────────────────────
  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchNotifs(false);
  };

  // ── tèks seleksyone selon lang ─────────────────────────────────────────
  const t = (n, field) => n[`${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`] || n[`${field}Ht`] || n[`${field}Fr`] || '';

  // ── label "Notifikasyon" ────────────────────────────────────────────────
  const panelTitle = lang === 'fr' ? 'Notifications' : lang === 'en' ? 'Notifications' : 'Notifikasyon';
  const markAllLabel = lang === 'fr' ? 'Tout lu' : lang === 'en' ? 'Mark all read' : 'Mache tout li';
  const emptyLabel = lang === 'fr' ? 'Aucune notification' : lang === 'en' ? 'No notifications yet' : 'Pa gen notifikasyon pou kounye a';
  const loadMoreLabel = lang === 'fr' ? 'Voir plus' : lang === 'en' ? 'Load more' : 'Wè plis';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={panelRef}>
      {/* ─── BOUTON KLÒCH ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? '#1B2A8F' : '#6b7280',
          transition: 'color 0.2s',
        }}
        aria-label={panelTitle}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            borderRadius: '10px',
            padding: '1px 5px',
            minWidth: '18px',
            textAlign: 'center',
            lineHeight: '16px',
            border: '1.5px solid #fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ─── PANEL ────────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '380px',
          maxWidth: 'calc(100vw - 20px)',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
            background: '#fafafa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#1B2A8F" />
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{panelTitle}</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#1B2A8F', color: '#fff', borderRadius: '12px',
                  padding: '2px 8px', fontSize: '11px', fontWeight: '700',
                }}>{unreadCount}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll} style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px',
                  cursor: 'pointer', padding: '4px 10px', fontSize: '12px',
                  color: '#1B2A8F', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <CheckCheck size={13} /> {markAllLabel}
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', borderRadius: '6px', color: '#9ca3af',
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
                Chajman...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '14px' }}>{emptyLabel}</div>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '14px 20px',
                    background: n.isRead ? '#fff' : '#eff6ff',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s',
                    cursor: 'default',
                  }}
                >
                  {/* Icone type */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: getTypeColor(n.type) + '18',
                    color: getTypeColor(n.type),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {getIcon(n.type)}
                  </div>

                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.isRead ? '500' : '700', fontSize: '13px', color: '#111827', lineHeight: '1.3' }}>
                      {t(n, 'title')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px', lineHeight: '1.4' }}>
                      {t(n, 'message')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>
                      {timeAgo(n.createdAt, lang)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleRead(n.id, e)}
                        title={lang === 'fr' ? 'Marquer comme lu' : 'Mache li'}
                        style={{
                          background: '#1B2A8F18', border: 'none', borderRadius: '6px',
                          cursor: 'pointer', padding: '4px', color: '#1B2A8F',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      title={lang === 'fr' ? 'Supprimer' : 'Efase'}
                      style={{
                        background: '#fee2e2', border: 'none', borderRadius: '6px',
                        cursor: 'pointer', padding: '4px', color: '#ef4444',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Load more */}
            {hasMore && (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <button onClick={loadMore} disabled={loading} style={{
                  background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px',
                  cursor: 'pointer', padding: '6px 20px', fontSize: '12px', color: '#6b7280',
                }}>
                  {loading ? '...' : loadMoreLabel}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {total > 0 && (
            <div style={{
              padding: '10px 20px', borderTop: '1px solid #f3f4f6',
              background: '#fafafa', textAlign: 'center',
              fontSize: '12px', color: '#9ca3af',
            }}>
              {total} {lang === 'fr' ? 'notification(s)' : lang === 'en' ? 'notification(s)' : 'notifikasyon'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
