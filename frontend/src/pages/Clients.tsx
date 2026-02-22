import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, UserCircle } from 'lucide-react';

const Clients = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - replace with real API call
  const clients = [
    {
      id: 1,
      name: 'Jean Baptiste',
      company: 'Baptiste Motors',
      email: 'jean@baptiste.ht',
      phone: '+509 3456-7890',
      balance: '15,000 HTG'
    },
    {
      id: 2,
      name: 'Marie Carmel',
      company: 'Carmel Auto',
      email: 'marie@carmel.ht',
      phone: '+509 3456-7891',
      balance: '8,500 HTG'
    },
    {
      id: 3,
      name: 'Pierre Louis',
      company: 'Louis Parts',
      email: 'pierre@louis.ht',
      phone: '+509 3456-7892',
      balance: '0 HTG'
    }
  ];

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('clients.title')}</h1>
          <p className="text-gray-400 mt-1">{t('common.total')}: {clients.length} {t('nav.clients').toLowerCase()}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus size={20} />
          {t('clients.addNew')}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('clients.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.name')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.company')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.email')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.phone')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('clients.balance')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                      <UserCircle size={24} className="text-white" />
                    </div>
                    <span className="text-white font-medium">{client.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{client.company}</td>
                <td className="px-6 py-4 text-gray-300">{client.email}</td>
                <td className="px-6 py-4 text-gray-300">{client.phone}</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${client.balance === '0 HTG' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {client.balance}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-orange-400 hover:text-orange-300 text-sm font-medium">
                    {t('clients.viewDetails')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">{t('common.noData')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;