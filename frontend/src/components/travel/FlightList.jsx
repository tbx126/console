import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const CLASS_LABELS = { economy: '经济', premium_economy: '优选经济', business: '公务', first: '头等' };
const number = new Intl.NumberFormat('zh-CN');

function AirlineLogo({ code, name }) {
  const [failed, setFailed] = useState(false);
  if (failed || !code) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
        {(name || '??').slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img src={`https://pics.avs.io/48/48/${code}.png`} alt="" className="size-6 shrink-0 object-contain" loading="lazy" onError={() => setFailed(true)} />;
}

/** 紧凑航班表格：一行一段航班 */
export default function FlightList({ flights, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-muted text-left text-xs text-muted-foreground">
            <th className="h-8 whitespace-nowrap py-0 pl-4 pr-2.5 font-normal">日期</th>
            <th className="whitespace-nowrap px-2.5 font-normal">航班</th>
            <th className="whitespace-nowrap px-2.5 font-normal">航司</th>
            <th className="whitespace-nowrap px-2.5 font-normal">航线</th>
            <th className="whitespace-nowrap px-2.5 font-normal">舱位</th>
            <th className="whitespace-nowrap px-2.5 text-right font-normal">距离</th>
            <th className="whitespace-nowrap px-2.5 text-right font-normal">花费</th>
            <th className="w-16 pr-3"><span className="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <tr key={flight.id} className="group border-t border-border hover:bg-muted/50">
              <td className="tabular whitespace-nowrap py-1.5 pl-4 pr-2.5 text-muted-foreground">{flight.date?.slice(0, 10)}</td>
              <td className="tabular whitespace-nowrap px-2.5 font-semibold">{flight.flight_number}</td>
              <td className="px-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <AirlineLogo code={flight.airline_code} name={flight.airline} />
                  <span className="max-w-[160px] truncate">{flight.airline}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-2.5">
                {flight.origin} → {flight.destination}
                {flight.notes && <span className="ml-2 max-w-[200px] truncate align-bottom text-xs text-muted-foreground" title={flight.notes}>· {flight.notes}</span>}
              </td>
              <td className="px-2.5">
                <span className="rounded bg-muted px-1.5 py-px text-[11px] text-muted-foreground">{CLASS_LABELS[flight.travel_class] || flight.travel_class}</span>
              </td>
              <td className="tabular whitespace-nowrap px-2.5 text-right">{flight.distance ? `${number.format(Math.round(flight.distance))} km` : '—'}</td>
              <td className="tabular whitespace-nowrap px-2.5 text-right">{flight.cost != null ? `$${number.format(flight.cost)}` : '—'}</td>
              <td className="whitespace-nowrap pr-3 text-right">
                <button type="button" onClick={() => onEdit(flight)} aria-label={`编辑 ${flight.flight_number}`} className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={() => onDelete(flight)} aria-label={`删除 ${flight.flight_number}`} className="inline-grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
