import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, DollarSign, Package, Users } from 'lucide-react';

const Reports = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-6">{t('nav.reports')}</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-semibold">{t('dashboard.monthlySales')}</h3>
            <TrendingUp size={20} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">125,000 HTG</p>
          <p className="text-green-400 text-sm mt-1">+12% vs mois dernier</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-semibold">{t('nav.invoices')}</h3>
            <BarChart3 size={20} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">45</p>
          <p className="text-blue-400 text-sm mt-1">Ce mois</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-semibold">{t('nav.products')}</h3>
            <Package size={20} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">156</p>
          <p className="text-purple-400 text-sm mt-1">En stock</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-sm font-semibold">{t('nav.clients')}</h3>
            <Users size={20} className="text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">87</p>
          <p className="text-orange-400 text-sm mt-1">Clients actifs</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Rapport de ventes</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">Analysez vos ventes par période, produit ou client</p>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            {t('dashboard.seeReport')} →
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Rapport financier</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">Consultez vos revenus, dépenses et bénéfices</p>
          <button className="text-green-400 hover:text-green-300 text-sm font-medium">
            {t('dashboard.seeReport')} →
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Package size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Rapport d'inventaire</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">Gérez votre stock et identifiez les produits à commander</p>
          <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
            {t('dashboard.seeReport')} →
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.sales7days')}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          <p>Graphique des ventes (à implémenter avec une bibliothèque de charts)</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;