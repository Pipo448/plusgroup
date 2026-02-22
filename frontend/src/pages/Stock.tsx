import React from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const Stock = () => {
  const { t } = useTranslation();

  const stockItems = [
    { id: 1, product: 'Filtre à huile', code: 'P001', current: 45, min: 20, max: 100, status: 'good' },
    { id: 2, product: 'Plaquettes de frein', code: 'P002', current: 12, min: 15, max: 50, status: 'low' },
    { id: 3, product: 'Batterie 12V', code: 'P003', current: 8, min: 10, max: 30, status: 'low' },
    { id: 4, product: 'Pneu 185/65R15', code: 'P004', current: 0, min: 5, max: 40, status: 'out' }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      good: { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/30', label: 'Stock normal', icon: TrendingUp },
      low: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/30', label: t('dashboard.lowStock'), icon: AlertTriangle },
      out: { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/30', label: t('products.outOfStock'), icon: TrendingDown }
    };

    const { color, bg, border, label, icon: Icon } = config[status as keyof typeof config];

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${bg} ${color} ${border}`}>
        <Icon size={14} />
        {label}
      </div>
    );
  };

  const getStockPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('nav.stock')}</h1>
          <p className="text-gray-400 mt-1">{t('dashboard.stockAlerts')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} className="text-green-400" />
            <h3 className="text-gray-400 text-sm font-semibold">Stock normal</h3>
          </div>
          <p className="text-2xl font-bold text-white">1 {t('dashboard.products')}</p>
          <p className="text-green-400 text-sm mt-1">Stock suffisant</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={24} className="text-yellow-400" />
            <h3 className="text-gray-400 text-sm font-semibold">{t('dashboard.lowStock')}</h3>
          </div>
          <p className="text-2xl font-bold text-white">2 {t('dashboard.products')}</p>
          <p className="text-yellow-400 text-sm mt-1">{t('dashboard.needRestock')}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown size={24} className="text-red-400" />
            <h3 className="text-gray-400 text-sm font-semibold">{t('products.outOfStock')}</h3>
          </div>
          <p className="text-2xl font-bold text-white">1 {t('dashboard.products')}</p>
          <p className="text-red-400 text-sm mt-1">Rupture</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.code')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.name')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Stock actuel</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Min / Max</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('dashboard.stockLevel')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {stockItems.map((item) => {
              const percentage = getStockPercentage(item.current, item.max);
              return (
                <tr key={item.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Archive size={20} className="text-gray-400" />
                      <span className="text-white font-mono">{item.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{item.product}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${
                      item.current === 0 ? 'text-red-400' :
                      item.current < item.min ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {item.current} pcs
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{item.min} / {item.max}</td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          percentage === 0 ? 'bg-red-500' :
                          percentage < 30 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percentage}%</p>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stock;