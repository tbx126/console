import { Calendar, Tag, TrendingUp, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Label } from '../ui/Label';

export default function InvestmentFilters({ filters, onFilterChange }) {
  const typeOptions = [
    { value: 'stock', label: 'Stocks' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'bond', label: 'Bonds' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'sold', label: 'Sold' },
    { value: 'pending', label: 'Pending' }
  ];

  const handleReset = () => {
    onFilterChange({
      types: [],
      status: [],
      gainLoss: 'all'
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

      {/* Investment Type */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Tag className="h-4 w-4" />
          Investment Type
        </Label>
        <div className="space-y-2">
          {typeOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 p-2 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.types?.includes(option.value)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(filters.types || []), option.value]
                    : (filters.types || []).filter(t => t !== option.value);
                  onFilterChange({ ...filters, types: newTypes });
                }}
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Calendar className="h-4 w-4" />
          Status
        </Label>
        <div className="space-y-2">
          {statusOptions.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 p-2 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.status?.includes(option.value)}
                onChange={(e) => {
                  const newStatus = e.target.checked
                    ? [...(filters.status || []), option.value]
                    : (filters.status || []).filter(s => s !== option.value);
                  onFilterChange({ ...filters, status: newStatus });
                }}
                className="rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Gain/Loss Filter */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <TrendingUp className="h-4 w-4" />
          Performance
        </Label>
        <Select
          value={filters.gainLoss || 'all'}
          onChange={(e) => onFilterChange({ ...filters, gainLoss: e.target.value })}
          className="w-full"
        >
          <option value="all">All</option>
          <option value="gain">Gains Only</option>
          <option value="loss">Losses Only</option>
        </Select>
      </div>
    </div>
  );
}
