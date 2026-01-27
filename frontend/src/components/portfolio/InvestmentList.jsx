import { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import portfolioApi from '../../services/portfolioApi';

const InvestmentList = ({ refresh, filters, searchQuery, sortBy, viewMode, onEdit }) => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingPrices, setRefreshingPrices] = useState({});

  useEffect(() => {
    loadData();
  }, [refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const investmentsData = await portfolioApi.getInvestments();
      setInvestments(investmentsData);
    } catch (err) {
      setError('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      await portfolioApi.deleteInvestment(id);
      loadData();
    } catch (err) {
      alert('Failed to delete investment');
    }
  };

  const handleRefreshPrice = async (id) => {
    setRefreshingPrices(prev => ({ ...prev, [id]: true }));
    try {
      await portfolioApi.refreshInvestmentPrice(id);
      loadData();
    } catch (err) {
      alert('Failed to refresh price');
    } finally {
      setRefreshingPrices(prev => ({ ...prev, [id]: false }));
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

  // Process investments with filtering and sorting
  const processedInvestments = useMemo(() => {
    let filtered = [...investments];

    // Apply type filters
    if (filters.types && filters.types.length > 0) {
      filtered = filtered.filter(inv => filters.types.includes(inv.type));
    }

    // Apply status filters
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(inv => filters.status.includes(inv.status || 'active'));
    }

    // Apply gain/loss filter
    if (filters.gainLoss && filters.gainLoss !== 'all') {
      filtered = filtered.filter(inv => {
        const { gainLoss } = calculateGainLoss(inv);
        if (filters.gainLoss === 'gain') return gainLoss > 0;
        if (filters.gainLoss === 'loss') return gainLoss < 0;
        return true;
      });
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.name.toLowerCase().includes(query) ||
        (inv.symbol && inv.symbol.toLowerCase().includes(query)) ||
        inv.type.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aCalc = calculateGainLoss(a);
      const bCalc = calculateGainLoss(b);

      switch (sortBy) {
        case 'value-desc':
          return bCalc.currentValue - aCalc.currentValue;
        case 'value-asc':
          return aCalc.currentValue - bCalc.currentValue;
        case 'gain-desc':
          return bCalc.gainLoss - aCalc.gainLoss;
        case 'gain-asc':
          return aCalc.gainLoss - bCalc.gainLoss;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [investments, filters, searchQuery, sortBy]);

  const getTypeIcon = (type) => {
    const icons = {
      stock: '📈',
      crypto: '₿',
      bond: '📊',
      real_estate: '🏠',
      other: '💼'
    };
    return icons[type] || '💼';
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
    <div className="grid grid-cols-4 gap-3">
      {processedInvestments.map(investment => {
        const { gainLoss, percentage, currentValue } = calculateGainLoss(investment);
        const isPositive = gainLoss >= 0;
        const typeColor = getTypeColor(investment.type);

        return (
          <div
            key={investment.id}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            {/* Top: Icon + Type Label + Current Value */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getTypeIcon(investment.type)}</span>
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: typeColor + '20', color: typeColor }}
                >
                  {investment.type}
                </span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ${currentValue.toFixed(2)}
              </div>
            </div>

            {/* Middle: Investment Name + Symbol */}
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
              {investment.name}
              {investment.symbol && <span className="text-zinc-500 dark:text-zinc-400 text-xs ml-1">({investment.symbol})</span>}
            </div>

            {/* Quantity and Purchase Price */}
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              {investment.quantity} @ ${investment.purchase_price.toFixed(2)}
            </div>

            {/* Gain/Loss */}
            <div className={`text-xs font-medium mb-2 flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}${gainLoss.toFixed(2)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
            </div>

            {/* Notes (if exists) */}
            {investment.notes && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-2 truncate">
                {investment.notes}
              </div>
            )}

            {/* Bottom: Purchase Date + Edit + Delete */}
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
                  onClick={() => onEdit && onEdit(investment)}
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
