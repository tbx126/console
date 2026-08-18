import apiClient, { cachedGet } from './api';

const financeApi = {
  // Expenses
  getExpenses: async () => {
    const response = await cachedGet('/finance/expenses');
    return response.data;
  },

  getExpense: async (id) => {
    const response = await cachedGet(`/finance/expenses/${id}`);
    return response.data;
  },

  createExpense: async (expense) => {
    const response = await apiClient.post('/finance/expenses', expense);
    return response.data;
  },

  updateExpense: async (id, expense) => {
    const response = await apiClient.put(`/finance/expenses/${id}`, expense);
    return response.data;
  },

  deleteExpense: async (id) => {
    const response = await apiClient.delete(`/finance/expenses/${id}`);
    return response.data;
  },

  // Income
  getIncome: async () => {
    const response = await cachedGet('/finance/income');
    return response.data;
  },

  createIncome: async (income) => {
    const response = await apiClient.post('/finance/income', income);
    return response.data;
  },

  updateIncome: async (id, income) => {
    const response = await apiClient.put(`/finance/income/${id}`, income);
    return response.data;
  },

  deleteIncome: async (id) => {
    const response = await apiClient.delete(`/finance/income/${id}`);
    return response.data;
  },

  // Bills
  getBills: async () => {
    const response = await cachedGet('/finance/bills');
    return response.data;
  },

  createBill: async (bill) => {
    const response = await apiClient.post('/finance/bills', bill);
    return response.data;
  },

  updateBill: async (id, bill) => {
    const response = await apiClient.put(`/finance/bills/${id}`, bill);
    return response.data;
  },

  deleteBill: async (id) => {
    const response = await apiClient.delete(`/finance/bills/${id}`);
    return response.data;
  },

  // Budgets
  getBudgets: async () => {
    const response = await cachedGet('/finance/budgets');
    return response.data;
  },

  createBudget: async (budget) => {
    const response = await apiClient.post('/finance/budgets', budget);
    return response.data;
  },

  updateBudget: async (id, budget) => {
    const response = await apiClient.put(`/finance/budgets/${id}`, budget);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await apiClient.delete(`/finance/budgets/${id}`);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await cachedGet('/finance/categories');
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await cachedGet('/finance/statistics');
    return response.data;
  },

  // Exchange Rates
  getExchangeRates: async (base = 'USD') => {
    const response = await cachedGet('/finance/exchange-rates', { params: { base } });
    return response.data;
  },

  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    const response = await cachedGet('/finance/convert', {
      params: { amount, from_currency: fromCurrency, to_currency: toCurrency }
    });
    return response.data;
  },
};

export default financeApi;
