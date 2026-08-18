import { useState } from 'react';
import portfolioApi from '../../services/portfolioApi';

const InvestmentForm = ({ investment, onSuccess, onCancel }) => {
  const isEditMode = !!investment;
  const [formData, setFormData] = useState({
    name: investment?.name || '',
    type: investment?.type || 'stock',
    symbol: investment?.symbol || '',
    quantity: investment?.quantity || '',
    purchase_price: investment?.purchase_price || '',
    current_price: investment?.current_price || '',
    purchase_date: investment?.purchase_date || new Date().toISOString().split('T')[0],
    notes: investment?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const investmentData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        current_price: formData.current_price ? parseFloat(formData.current_price) : null
      };
      if (isEditMode) {
        await portfolioApi.updateInvestment(investment.id, investmentData);
      } else {
        await portfolioApi.createInvestment(investmentData);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} investment`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Apple Inc."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Type *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="stock">Stock</option>
            <option value="crypto">Cryptocurrency</option>
            <option value="bond">Bond</option>
            <option value="etf">ETF</option>
            <option value="mutual_fund">Mutual Fund</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Symbol
        </label>
        <input
          type="text"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          placeholder="e.g., AAPL"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            step="0.00000001"
            min="0"
            placeholder="10"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Purchase Price *
          </label>
          <input
            type="number"
            name="purchase_price"
            value={formData.purchase_price}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            placeholder="150.00"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Current Price
          </label>
          <input
            type="number"
            name="current_price"
            value={formData.current_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            placeholder="175.00"
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Purchase Date *
          </label>
          <input
            type="date"
            name="purchase_date"
            value={formData.purchase_date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Any additional notes..."
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Investment')}
        </button>
      </div>
    </form>
  );
};

export default InvestmentForm;
