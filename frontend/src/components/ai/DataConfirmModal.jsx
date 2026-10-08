import { X, Check, Plane } from 'lucide-react';
import { Button } from '../ui/Button';

const DATA_TYPE_CONFIG = {
  flight: { label: '航班', icon: Plane },
};

const FIELD_LABELS = {
  airline: '航空公司', flight_number: '航班号', origin: '出发地', destination: '目的地',
  date: '日期', travel_class: '舱位', cost: '费用',
};

const DataConfirmModal = ({ isOpen, data, onConfirm, onCancel }) => {
  if (!isOpen || !data) return null;

  const config = DATA_TYPE_CONFIG[data.data_type] || DATA_TYPE_CONFIG.flight;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`记录${config.label}`}
        className="relative w-full max-w-md animate-in rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="grid size-10 place-items-center rounded-[10px] bg-accent text-accent-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-semibold">检测到{config.label}信息</h3>
            <p className="text-sm text-muted-foreground">是否记录以下数据？</p>
          </div>
        </div>

        <dl className="space-y-3 px-6 py-4">
          {Object.entries(data.data || {}).map(([key, value]) => (
            value && (
              <div key={key} className="flex items-center justify-between gap-4">
                <dt className="text-sm text-muted-foreground">{FIELD_LABELS[key] || key}</dt>
                <dd className="text-sm font-medium">{value}</dd>
              </div>
            )
          ))}
        </dl>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X />
            取消
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            <Check />
            记录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataConfirmModal;
