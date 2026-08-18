export const isWithinDateRange = (dateValue, range) => {
  if (range === 'all') return true;

  const date = new Date(dateValue);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (range) {
    case 'thisMonth':
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;

    case 'lastMonth': {
      const lastMonth = new Date(currentYear, currentMonth - 1);
      return date.getFullYear() === lastMonth.getFullYear() &&
             date.getMonth() === lastMonth.getMonth();
    }

    case 'last3Months': {
      const threeMonthsAgo = new Date(currentYear, currentMonth - 3);
      return date >= threeMonthsAgo;
    }

    case 'thisYear':
      return date.getFullYear() === currentYear;

    default:
      return true;
  }
};
