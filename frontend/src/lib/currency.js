export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', CNY: '¥', JPY: '¥', GBP: '£', SGD: 'S$'
};

export const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'SGD'];

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function convertAmount(amount, fromCurrency, toCurrency, exchangeRates) {
  if (!exchangeRates || !amount) return amount;
  if (fromCurrency === toCurrency) return amount;
  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;
  return amount * (toRate / fromRate);
}
