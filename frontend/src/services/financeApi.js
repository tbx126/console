import apiClient from './api';

const financeApi = {
  // Expenses
  getExpenses: async () => {
    const response = await apiClient.get('/finance/expenses');
    return response.data;
  },

  getExpense: async (id) => {
    const response = await apiClient.get(`/finance/expenses/${id}`);
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
    const response = await apiClient.get('/finance/income');
    return response.data;
  },

  createIncome: async (income) => {
    const response = await apiClient.post('/finance/income', income);
    return response.data;
  },

  // Bills
  getBills: async () => {
    const response = await apiClient.get('/finance/bills');
    return response.data;
  },

  createBill: async (bill) => {
    const response = await apiClient.post('/finance/bills', bill);
    return response.data;
  },

  // Budgets
  getBudgets: async () => {
    const response = await apiClient.get('/finance/budgets');
    return response.data;
  },

  createBudget: async (budget) => {
    const response = await apiClient.post('/finance/budgets', budget);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await apiClient.get('/finance/categories');
    return response.data;
  },

  // Statistics
  getStatistics: async () => {
    const response = await apiClient.get('/finance/statistics');
    return response.data;
  },

  // Exchange Rates
  getExchangeRates: async (base = 'USD') => {
    const response = await apiClient.get(`/finance/exchange-rates?base=${base}`);
    return response.data;
  },

  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    const response = await apiClient.get(
      `/finance/convert?amount=${amount}&from_currency=${fromCurrency}&to_currency=${toCurrency}`
    );
    return response.data;
  },
};

export default financeApi;
