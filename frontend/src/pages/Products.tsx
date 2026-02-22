import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Package } from 'lucide-react';

const Products = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const products: Array<{ id: number; code: string; name: string; category: string; price: string; stock: number; unit: string; status: 'active' | 'lowStock' | 'outOfStock' }> = [
    { id: 1, code: 'P001', name: 'Filtre à huile', category: 'Filtres', price: '250 HTG', stock: 45, unit: 'pcs', status: 'active' },
    { id: 2, code: 'P002', name: 'Plaquettes de frein', category: 'Freins', price: '1,200 HTG', stock: 12, unit: 'pcs', status: 'lowStock' },
    { id: 3, code: 'P003', name: 'Batterie 12V', category: 'Électrique', price: '3,500 HTG', stock: 8, unit: 'pcs', status: 'active' },
    { id: 4, code: 'P004', name: 'Pneu 185/65R15', category: 'Pneus', price: '4,500 HTG', stock: 0, unit: 'pcs', status: 'outOfStock' }
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: 'active' | 'lowStock' | 'outOfStock') => {
    const styles = {
      active: 'bg-green-900/30 text-green-400 border-green-500/30',
      lowStock: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
      outOfStock: 'bg-red-900/30 text-red-400 border-red-500/30'
    };
    
    const labels = {
      active: t('products.active'),
      lowStock: t('products.lowStock'),
      outOfStock: t('products.outOfStock')
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('products.title')}</h1>
          <p className="text-gray-400 mt-1">{t('products.total')}: {products.length} {t('dashboard.products')}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus size={20} />
          {t('products.addNew')}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('products.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.code')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.name')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.category')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.price')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.stock')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('products.status')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 text-gray-300 font-mono">{product.code}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Package size={20} className="text-white" />
                    </div>
                    <span className="text-white font-medium">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{product.category}</td>
                <td className="px-6 py-4 text-white font-semibold">{product.price}</td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${product.stock === 0 ? 'text-red-400' : product.stock < 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                      {t('products.edit')}
                    </button>
                    <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                      {t('products.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">{t('common.noData')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;