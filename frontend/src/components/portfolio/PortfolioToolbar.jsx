import { Search, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export default function PortfolioToolbar({
  searchQuery,
  sortBy,
  viewMode,
  onSearchChange,
  onSortChange,
  onViewModeChange
}) {
  const sortOptions = [
    { value: 'value-desc', label: 'Value (High to Low)' },
    { value: 'value-asc', label: 'Value (Low to High)' },
    { value: 'gain-desc', label: 'Gain (High to Low)' },
    { value: 'gain-asc', label: 'Gain (Low to High)' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' }
  ];

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-air p-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search investments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort and View Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Sort */}
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <ArrowUpDown className="h-4 w-4 text-zinc-500" />
            <Select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="flex-1 md:w-48"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={`h-8 w-8 p-0 ${
                viewMode === 'list' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className={`h-8 w-8 p-0 ${
                viewMode === 'grid' ? 'bg-white dark:bg-zinc-600 shadow-sm' : ''
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
