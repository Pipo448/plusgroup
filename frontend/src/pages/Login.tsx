import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';

const LoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    slug:     '',
    email:    '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug) {
      setError('Non entreprise (slug) obligatwa.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // ✅ Voye slug, email, password nan login
      await login(formData.slug.trim().toLowerCase(), formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #0A0A0F 0%, #1A0A00 45%, #2D1100 100%)' }}>

      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,69,0,0.15), transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #F0D080)', boxShadow: '0 8px 30px rgba(201,168,76,0.4)' }}>
            <span className="text-4xl font-black" style={{ color: '#0A0A0F' }}>P+</span>
          </div>
          <h1 className="text-4xl font-black mb-2 text-white">PLUS GROUP</h1>
          <p className="text-sm font-bold" style={{ color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Innovation & Tech — SaaS
          </p>
        </div>

        {/* Card login */}
        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <h2 className="text-2xl font-black mb-6 text-white">{t('auth.welcome', 'Konekte nan kont ou')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,69,0,0.2)', border: '1px solid rgba(255,69,0,0.4)' }}>
                <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>
              </div>
            )}

            {/* ✅ Champ Slug */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Non Entreprise (slug)
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input
                  type="text"
                  name="slug"
                  placeholder="moncoeur-auto-parts"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-400"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(201,168,76,0.2)', outline: 'none' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Egzanp: moncoeur-auto-parts
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t('auth.email', 'Email')}
              </label>
              <input
                type="email"
                name="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400"
                style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(201,168,76,0.2)', outline: 'none' }}
              />
            </div>

            {/* Modpas */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t('auth.password', 'Modpas')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 pr-12"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(201,168,76,0.2)', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black flex items-center justify-center gap-2 mt-6"
              style={{
                background: loading ? '#666' : 'linear-gradient(135deg, #C0392B, #FF4500)',
                color: '#FFFFFF',
                boxShadow: '0 6px 30px rgba(255,69,0,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.loading', 'Chajman...')}
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  {t('auth.loginButton', 'Konekte')}
                </>
              )}
            </button>
          </form>

          {/* Demo info */}
          <div className="mt-6 p-3 rounded-xl text-center text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            Demo → slug: <strong>moncoeur-auto-parts</strong> · email: moncoeur@gmail.com · mdp: Moncoeur2024!
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © 2026 PLUS GROUP — Innovation & Tech
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
