import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const CLASS_LABELS = { economy: '经济', premium_economy: '优选经济', business: '公务', first: '头等' };
const number = new Intl.NumberFormat('zh-CN');

function AirlineLogo({ code, name }) {
  const [failed, setFailed] = useState(false);
  if (failed || !code) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
        {(name || '??').slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img src={`https://pics.avs.io/48/48/${code}.png`} alt="" className="size-6 shrink-0 object-contain" loading="lazy" onError={() => setFailed(true)} />;
}

/** 航班卡片网格：宽屏下多列排布，按日期从左到右、从上到下阅读 */
export default function FlightList({ flights, onEdit, onDelete }) {
  return (
    <ul className="m-0 grid list-none gap-3 px-5 pb-4 pt-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
      {flights.map((flight) => (
        <li key={flight.id} className="group flex min-w-0 flex-col gap-2 rounded-xl border border-border px-4 py-3 hover:border-ring/60">
          <div className="flex items-center gap-2">
            <AirlineLogo code={flight.airline_code} name={flight.airline} />
            <strong className="tabular font-semibold">{flight.flight_number}</strong>
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{flight.airline}</span>
            <button type="button" onClick={() => onEdit(flight)} aria-label={`编辑 ${flight.flight_number}`} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <Pencil className="size-4" />
            </button>
            <button type="button" onClick={() => onDelete(flight)} aria-label={`删除 ${flight.flight_number}`} className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">{flight.origin} → {flight.destination}</span>
            <span className="rounded bg-muted px-1.5 py-px text-xs text-muted-foreground">{CLASS_LABELS[flight.travel_class] || flight.travel_class}</span>
          </div>
          <div className="tabular flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            <span>{flight.date?.slice(0, 10)}</span>
            <span>{flight.distance ? `${number.format(Math.round(flight.distance))} km` : '— km'}</span>
            {flight.cost != null && <span>${number.format(flight.cost)}</span>}
          </div>
          {flight.notes && <p className="m-0 truncate text-xs text-muted-foreground" title={flight.notes}>{flight.notes}</p>}
        </li>
      ))}
    </ul>
  );
}
