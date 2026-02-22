import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User, Bell, Lock, Globe, CreditCard } from 'lucide-react';

const Settings = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-6">{t('nav.settings')}</h1>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Company Settings */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Entreprise</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Gérez les informations de votre entreprise, logo et coordonnées
          </p>
          <button className="text-orange-400 hover:text-orange-300 text-sm font-medium">
            {t('common.edit')} →
          </button>
        </div>

        {/* Profile Settings */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">{t('header.profile')}</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Modifiez vos informations personnelles et préférences
          </p>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            {t('common.edit')} →
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">{t('header.notifications')}</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Configurez vos préférences de notifications par email et SMS
          </p>
          <button className="text-green-400 hover:text-green-300 text-sm font-medium">
            {t('common.edit')} →
          </button>
        </div>

        {/* Security */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Sécurité</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Changez votre mot de passe et configurez l'authentification
          </p>
          <button className="text-red-400 hover:text-red-300 text-sm font-medium">
            {t('common.edit')} →
          </button>
        </div>

        {/* Language */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Globe size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">{t('header.language')}</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Choisissez la langue de l'interface: Kreyòl, Français, English
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              🇭🇹 HT
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              🇫🇷 FR
            </button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              🇺🇸 EN
            </button>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Facturation</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Gérez votre abonnement et méthodes de paiement
          </p>
          <button className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
            {t('common.viewDetails')} →
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Zone dangereuse</h3>
        <p className="text-gray-400 text-sm mb-4">
          Actions irréversibles qui affecteront votre compte de manière permanente
        </p>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
};

export default Settings;