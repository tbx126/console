import { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Treemap,
} from 'recharts';
import { Skeleton } from '../ui/Skeleton';
import portfolioApi from '../../services/portfolioApi';
import financeApi from '../../services/financeApi';
import { convertAmount } from '../../lib/currency';

const TYPE_COLORS = {
  stock: '#3b82f6',
  crypto: '#f59e0b',
  bond: '#10b981',
  etf: '#8b5cf6',
  mutual_fund: '#ec4899',
  real_estate: '#06b6d4',
  other: '#6b7280',
};

const CURRENCY_COLORS = {
  USD: '#3b82f6',
  CNY: '#ef4444',
  SGD: '#10b981',
  EUR: '#8b5cf6',
  GBP: '#f59e0b',
  JPY: '#ec4899',
  HKD: '#06b6d4',
};

const TYPE_LABELS = {
  stock: 'Stocks',
  crypto: 'Crypto',
  bond: 'Bonds',
  etf: 'ETF',
  mutual_fund: 'Mutual Fund',
  real_estate: 'Real Estate',
  other: 'Other',
};

const GAIN_COLORS = { gain: '#10b981', loss: '#ef4444' };

function formatCurrency(val) {
  if (Math.abs(val) >= 1000) return `¥${(val / 1000).toFixed(1)}k`;
  return `¥${val.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{d.name}</div>
      {d.value !== undefined && (
        <div className="text-zinc-600 dark:text-zinc-400">¥{d.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      )}
      {d.percent !== undefined && (
        <div className="text-zinc-500 dark:text-zinc-400">{d.percent}%</div>
      )}
    </div>
  );
};

const GainLossTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPositive = d.gainLoss >= 0;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-2 text-sm">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{d.name}</div>
      <div className={isPositive ? 'text-emerald-600' : 'text-red-500'}>
        {isPositive ? '+' : ''}¥{d.gainLoss.toFixed(2)} ({isPositive ? '+' : ''}{d.percentage.toFixed(2)}%)
      </div>
      <div className="text-zinc-500 dark:text-zinc-400 text-xs">
        Cost: ¥{d.cost.toFixed(2)} → Value: ¥{d.currentValue.toFixed(2)}
      </div>
    </div>
  );
};

const TreemapContent = ({ x, y, width, height, name, value, fill }) => {
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} stroke="#fff" strokeWidth={2} />
      {width > 60 && height > 40 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {name?.length > 10 ? name.slice(0, 10) + '...' : name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}>
            {formatCurrency(value)}
          </text>
        </>
      )}
    </g>
  );
};

export default function PortfolioCharts({ refresh }) {
  const [investments, setInvestments] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, rates] = await Promise.all([
        portfolioApi.getInvestments(),
        financeApi.getExchangeRates('USD').catch(() => ({ rates: {} }))
      ]);
      setInvestments(data);
      setExchangeRates(rates.rates || {});
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
      setExchangeRates({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refresh]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (investments.length === 0) return null;

  // ── Derived data ──

  // Allocation by type (convert all to CNY)
  const typeMap = {};

  investments.forEach(inv => {
    const price = inv.current_price || inv.purchase_price;
    const valueInOriginalCurrency = price * inv.quantity;
    const valueInCNY = convertAmount(valueInOriginalCurrency, inv.currency || 'USD', 'CNY', exchangeRates);

    const type = inv.type || 'other';
    typeMap[type] = (typeMap[type] || 0) + valueInCNY;
  });

  const allocationData = Object.entries(typeMap)
    .map(([type, value]) => ({
      name: TYPE_LABELS[type] || type,
      value: parseFloat(value.toFixed(2)),
      fill: TYPE_COLORS[type] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  // Gain/Loss per investment (convert to CNY)
  const gainLossData = investments.map(inv => {
    const costInOriginalCurrency = inv.purchase_price * inv.quantity;
    const price = inv.current_price || inv.purchase_price;
    const currentValueInOriginalCurrency = price * inv.quantity;

    const cost = convertAmount(costInOriginalCurrency, inv.currency || 'USD', 'CNY', exchangeRates);
    const currentValue = convertAmount(currentValueInOriginalCurrency, inv.currency || 'USD', 'CNY', exchangeRates);
    const gainLoss = currentValue - cost;
    const percentage = cost > 0 ? (gainLoss / cost * 100) : 0;

    return {
      name: inv.name || inv.symbol,
      type: inv.type,
      quantity: inv.quantity,
      gainLoss: parseFloat(gainLoss.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(2)),
      cost: parseFloat(cost.toFixed(2)),
      currentValue: parseFloat(currentValue.toFixed(2)),
      fill: gainLoss >= 0 ? GAIN_COLORS.gain : GAIN_COLORS.loss,
    };
  }).sort((a, b) => b.gainLoss - a.gainLoss);

  // Treemap: holdings by value (convert to CNY)
  const holdingsData = investments.map(inv => {
    const price = inv.current_price || inv.purchase_price;
    const valueInOriginalCurrency = price * inv.quantity;
    const val = convertAmount(valueInOriginalCurrency, inv.currency || 'USD', 'CNY', exchangeRates);

    return {
      name: inv.name || inv.symbol,
      value: parseFloat(val.toFixed(2)),
      fill: TYPE_COLORS[inv.type] || '#6b7280',
    };
  }).sort((a, b) => b.value - a.value);

  // Currency distribution (original currency values)
  const currencyMap = {};
  investments.forEach(inv => {
    const currency = inv.currency || 'USD';
    const price = inv.current_price || inv.purchase_price;
    const value = price * inv.quantity;
    currencyMap[currency] = (currencyMap[currency] || 0) + value;
  });

  const currencyData = Object.entries(currencyMap)
    .map(([currency, value]) => ({
      name: currency,
      value: parseFloat(value.toFixed(2)),
      fill: CURRENCY_COLORS[currency] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  // Purchase timeline
  const timelineMap = {};
  investments.forEach(inv => {
    const date = new Date(inv.purchase_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const price = inv.current_price || inv.purchase_price;
    const valueInCNY = convertAmount(price * inv.quantity, inv.currency || 'USD', 'CNY', exchangeRates);

    if (!timelineMap[monthKey]) {
      timelineMap[monthKey] = { month: monthKey, value: 0, count: 0 };
    }
    timelineMap[monthKey].value += valueInCNY;
    timelineMap[monthKey].count += 1;
  });

  const timelineData = Object.values(timelineMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      month: item.month,
      value: parseFloat(item.value.toFixed(2)),
      count: item.count
    }));

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Allocation Pie */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Asset Allocation</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              dataKey="value"
              label={renderPieLabel}
              labelLine={false}
              stroke="none"
            >
              {allocationData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gain/Loss Bar */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Gain / Loss</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={gainLossData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(161,161,170,0.15)" />
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#a1a1aa' }} width={50} axisLine={false} tickLine={false} />
            <Tooltip content={<GainLossTooltip />} cursor={{ fill: 'rgba(161,161,170,0.08)' }} />
            <Bar dataKey="gainLoss" radius={[0, 4, 4, 0]} barSize={20}>
              {gainLossData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Currency Distribution */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Currency Distribution</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={currencyData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              dataKey="value"
              label={renderPieLabel}
              labelLine={false}
              stroke="none"
            >
              {currencyData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Purchase Timeline */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Purchase Timeline</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timelineData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.15)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-2 text-sm">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{d.month}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">¥{d.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs">{d.count} investment{d.count > 1 ? 's' : ''}</div>
                  </div>
                );
              }}
              cursor={{ fill: 'rgba(161,161,170,0.08)' }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings Treemap */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Holdings Overview</h3>
        <ResponsiveContainer width="100%" height={200}>
          <Treemap
            data={holdingsData}
            dataKey="value"
            aspectRatio={4 / 1}
            content={<TreemapContent />}
          />
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(TYPE_COLORS).map(([type, color]) => {
            if (!typeMap[type]) return null;
            return (
              <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {TYPE_LABELS[type] || type}
              </div>
            );
          })}
        </div>
      </div>

      {/* Investment Details Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Investment Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                <th className="text-left py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
                <th className="text-right py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Quantity</th>
                <th className="text-right py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Cost (CNY)</th>
                <th className="text-right py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Value (CNY)</th>
                <th className="text-right py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Gain/Loss</th>
                <th className="text-right py-3 px-2 font-medium text-zinc-600 dark:text-zinc-400">Return %</th>
              </tr>
            </thead>
            <tbody>
              {gainLossData.map((item, i) => (
                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="py-3 px-2 font-medium text-zinc-900 dark:text-zinc-100">{item.name}</td>
                  <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-700">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-zinc-600 dark:text-zinc-400">¥{item.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="py-3 px-2 text-right text-zinc-900 dark:text-zinc-100 font-medium">¥{item.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className={`py-3 px-2 text-right font-medium ${item.gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.gainLoss >= 0 ? '+' : ''}¥{item.gainLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={`py-3 px-2 text-right font-medium ${item.percentage >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {item.percentage >= 0 ? '+' : ''}{item.percentage.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
