import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import portfolioApi from '../../services/portfolioApi';

const InvestmentList = ({ refresh, filters, searchQuery, sortBy, viewMode, onEdit }) => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingPrices, setRefreshingPrices] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const investmentsData = await portfolioApi.getInvestments();
      setInvestments(investmentsData);
    } catch {
      setError('Failed to load investments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refresh]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      await portfolioApi.deleteInvestment(id);
      toast.success('Investment deleted');
      await loadData();
    } catch {
      toast.error('Failed to delete investment');
    }
  };

  const handleRefreshPrice = async (id) => {
    setRefreshingPrices((previous) => ({ ...previous, [id]: true }));

    try {
      await portfolioApi.refreshInvestmentPrice(id);
      await loadData();
    } catch {
      toast.error('Failed to refresh price');
    } finally {
      setRefreshingPrices((previous) => ({ ...previous, [id]: false }));
    }
  };

  const calculateGainLoss = (investment) => {
    const purchaseValue = investment.purchase_price * investment.quantity;
    const currentPrice = investment.current_price || investment.purchase_price;
    const currentValue = currentPrice * investment.quantity;
    const gainLoss = currentValue - purchaseValue;
    const percentage = (gainLoss / purchaseValue) * 100;
    return { gainLoss, percentage, currentValue };
  };

  const processedInvestments = useMemo(() => {
    let filtered = [...investments];

    if (filters.types?.length > 0) {
      filtered = filtered.filter((investment) => filters.types.includes(investment.type));
    }

    if (filters.status?.length > 0) {
      filtered = filtered.filter((investment) => filters.status.includes(investment.status || 'active'));
    }

    if (filters.gainLoss && filters.gainLoss !== 'all') {
      filtered = filtered.filter((investment) => {
        const { gainLoss } = calculateGainLoss(investment);
        if (filters.gainLoss === 'gain') return gainLoss > 0;
        if (filters.gainLoss === 'loss') return gainLoss < 0;
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((investment) =>
        investment.name.toLowerCase().includes(query) ||
        investment.symbol?.toLowerCase().includes(query) ||
        investment.type.toLowerCase().includes(query)
      );
    }

    filtered.sort((left, right) => {
      const leftCalc = calculateGainLoss(left);
      const rightCalc = calculateGainLoss(right);

      switch (sortBy) {
        case 'value-desc':
          return rightCalc.currentValue - leftCalc.currentValue;
        case 'value-asc':
          return leftCalc.currentValue - rightCalc.currentValue;
        case 'gain-desc':
          return rightCalc.gainLoss - leftCalc.gainLoss;
        case 'gain-asc':
          return leftCalc.gainLoss - rightCalc.gainLoss;
        case 'name-asc':
          return left.name.localeCompare(right.name);
        case 'name-desc':
          return right.name.localeCompare(left.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [investments, filters, searchQuery, sortBy]);

  const getTypeLabel = (type) => {
    const labels = {
      stock: 'STK',
      crypto: 'CRY',
      bond: 'BND',
      real_estate: 'REA',
      other: 'OTH'
    };

    return labels[type] || 'OTH';
  };

  const getTypeColor = (type) => {
    const colors = {
      stock: '#3b82f6',
      crypto: '#f59e0b',
      bond: '#10b981',
      real_estate: '#8b5cf6',
      other: '#6b7280'
    };

    return colors[type] || '#6b7280';
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading investments...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>;
  }

  if (processedInvestments.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        {investments.length === 0 ? 'No investments yet. Add your first investment!' : 'No investments match your filters.'}
      </div>
    );
  }

  return (
    <div className={viewMode === 'list' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'}>
      {processedInvestments.map((investment) => {
        const { gainLoss, percentage, currentValue } = calculateGainLoss(investment);
        const isPositive = gainLoss >= 0;
        const typeColor = getTypeColor(investment.type);

        return (
          <div
            key={investment.id}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                  {getTypeLabel(investment.type)}
                </span>
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
                >
                  {investment.type}
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ${currentValue.toFixed(2)}
              </div>
            </div>

            <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
              {investment.name}
              {investment.symbol && (
                <span className="text-zinc-500 dark:text-zinc-400 text-xs ml-1">({investment.symbol})</span>
              )}
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              {investment.quantity} @ ${investment.purchase_price.toFixed(2)}
            </div>

            <div className={`text-xs font-medium mb-2 flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}${gainLoss.toFixed(2)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
            </div>

            {investment.notes && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-2 truncate">
                {investment.notes}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                {investment.purchase_date ? new Date(investment.purchase_date).toLocaleDateString() : 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                {investment.symbol && (investment.type === 'stock' || investment.type === 'crypto') && (
                  <button
                    onClick={() => handleRefreshPrice(investment.id)}
                    disabled={refreshingPrices[investment.id]}
                    className="text-zinc-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    title="Refresh price"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingPrices[investment.id] ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => onEdit?.(investment)}
                  className="text-zinc-400 hover:text-violet-600 transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(investment.id)}
                  className="text-zinc-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvestmentList;
