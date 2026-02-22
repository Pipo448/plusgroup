import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

const Invoices = () => {
  const { t } = useTranslation();

  const invoices = [
    { id: 1, number: 'FAC-2026-001', client: 'Jean Baptiste', date: '2026-02-15', amount: '15,000 HTG', status: 'paid' },
    { id: 2, number: 'FAC-2026-002', client: 'Marie Carmel', date: '2026-02-17', amount: '8,500 HTG', status: 'partial' },
    { id: 3, number: 'FAC-2026-003', client: 'Pierre Louis', date: '2026-02-19', amount: '12,000 HTG', status: 'unpaid' }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/30', label: t('dashboard.paid') },
      partial: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/30', label: t('dashboard.partial') },
      unpaid: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/30', label: t('dashboard.unpaid') }
    };

    const { icon: Icon, color, bg, border, label } = config[status as keyof typeof config];

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${bg} ${color} ${border}`}>
        <Icon size={14} />
        {label}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('nav.invoices')}</h1>
          <p className="text-gray-400 mt-1">{t('common.total')}: {invoices.length} {t('dashboard.invoices')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus size={20} />
          {t('dashboard.newInvoice')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle size={24} className="text-green-400" />
            <h3 className="text-gray-400 text-sm font-semibold">{t('dashboard.paid')}</h3>
          </div>
          <p className="text-2xl font-bold text-white">1 {t('dashboard.invoices')}</p>
          <p className="text-green-400 text-sm mt-1">15,000 HTG</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={24} className="text-yellow-400" />
            <h3 className="text-gray-400 text-sm font-semibold">{t('dashboard.partial')}</h3>
          </div>
          <p className="text-2xl font-bold text-white">1 {t('dashboard.invoices')}</p>
          <p className="text-yellow-400 text-sm mt-1">8,500 HTG</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <XCircle size={24} className="text-red-400" />
            <h3 className="text-gray-400 text-sm font-semibold">{t('dashboard.unpaid')}</h3>
          </div>
          <p className="text-2xl font-bold text-white">1 {t('dashboard.invoices')}</p>
          <p className="text-red-400 text-sm mt-1">12,000 HTG</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">#</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.name')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.date')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.amount')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.status')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-white font-mono">{invoice.number}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-medium">{invoice.client}</td>
                <td className="px-6 py-4 text-gray-300">{invoice.date}</td>
                <td className="px-6 py-4 text-white font-semibold">{invoice.amount}</td>
                <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                    {t('common.viewDetails')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoices;