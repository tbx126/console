import { Calendar, DollarSign, Tag, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';

export default function ExpenseFilters({ filters, onFilterChange, categories = [], currencySymbol = '$' }) {
  const dateRangeOptions = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  const handleReset = () => {
    onFilterChange({
      dateRange: 'thisMonth',
      categories: [],
      minAmount: 0,
      maxAmount: 10000
    });
  };

  return (
    <div className="w-64 bg-white dark:bg-zinc-800 rounded-2xl shadow-air p-6 sticky top-6 h-fit space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Calendar className="h-4 w-4" />
          Date Range
        </Label>
        <Select
          value={filters.dateRange}
          onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
          className="w-full"
        >
          {dateRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Tag className="h-4 w-4" />
          Categories
        </Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {categories.map(category => (
            <label
              key={category.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 p-2 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(category.id)}
                onChange={(e) => {
                  const newCategories = e.target.checked
                    ? [...filters.categories, category.id]
                    : filters.categories.filter(id => id !== category.id);
                  onFilterChange({ ...filters, categories: newCategories });
                }}
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amount Range */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <DollarSign className="h-4 w-4" />
          Amount Range
        </Label>
        <div className="space-y-3">
          <div>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={filters.maxAmount}
              onChange={(e) => onFilterChange({ ...filters, maxAmount: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>{currencySymbol}0</span>
              <span>{currencySymbol}{filters.maxAmount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
