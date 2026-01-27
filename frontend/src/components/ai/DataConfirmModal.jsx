import { X, Check, DollarSign, Plane, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';

const DATA_TYPE_CONFIG = {
  expense: { label: '支出', icon: DollarSign, color: 'text-red-500', bg: 'bg-red-50' },
  income: { label: '收入', icon: Wallet, color: 'text-green-500', bg: 'bg-green-50' },
  flight: { label: '航班', icon: Plane, color: 'text-blue-500', bg: 'bg-blue-50' },
  investment: { label: '投资', icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-50' }
};

const DataConfirmModal = ({ isOpen, data, onConfirm, onCancel }) => {
  if (!isOpen || !data) return null;

  const config = DATA_TYPE_CONFIG[data.data_type] || DATA_TYPE_CONFIG.expense;
  const Icon = config.icon;

  const formatValue = (key, value) => {
    if (key === 'amount' || key === 'cost' || key === 'purchase_price') {
      return `¥${value}`;
    }
    if (key === 'quantity') {
      return `${value} 股`;
    }
    return value;
  };

  const fieldLabels = {
    category: '分类', amount: '金额', merchant: '商家', date: '日期', notes: '备注',
    source: '来源', type: '类型',
    airline: '航空公司', flight_number: '航班号', origin: '出发地', destination: '目的地',
    travel_class: '舱位', cost: '费用',
    symbol: '代码', quantity: '数量', purchase_price: '价格'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${config.bg} px-6 py-4 rounded-t-2xl border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">检测到{config.label}信息</h3>
              <p className="text-sm text-zinc-500">是否记录以下数据？</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3">
          {Object.entries(data.data || {}).map(([key, value]) => (
            value && (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">{fieldLabels[key] || key}</span>
                <span className="text-sm font-medium text-zinc-900">
                  {formatValue(key, value)}
                </span>
              </div>
            )
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={onConfirm}>
            <Check className="w-4 h-4 mr-2" />
            记录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataConfirmModal;
