import { useEffect, useState } from 'react';
import financeApi from '../../services/financeApi';

const CURRENCIES = ['USD', 'EUR', 'CNY', 'JPY', 'GBP', 'SGD', 'HKD'];

const ExpenseForm = ({ expense, onSuccess, onCancel }) => {
  const isEditMode = Boolean(expense);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    amount: expense?.amount || '',
    currency: expense?.currency || 'USD',
    category: expense?.category || '',
    merchant: expense?.merchant || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    notes: expense?.notes || '',
    tags: expense?.tags || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await financeApi.getCategories();
        if (cancelled) {
          return;
        }

        setCategories(data);
        if (data.length > 0 && !isEditMode) {
          setFormData((previous) => (
            previous.category ? previous : { ...previous, category: data[0].id }
          ));
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load categories');
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (isEditMode) {
        await financeApi.updateExpense(expense.id, data);
      } else {
        await financeApi.createExpense(data);
      }

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} expense`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Merchant
        </label>
        <input
          type="text"
          name="merchant"
          value={formData.merchant}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Expense')}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
