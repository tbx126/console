import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import { StatStrip } from '../components/ui/StatStrip';
import { Section } from '../components/ui/Section';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import Modal from '../components/common/Modal';
import FlightForm from '../components/travel/FlightForm';
import FlightList from '../components/travel/FlightList';
import AirlineStats from '../components/travel/AirlineStats';
import FlightMap from '../components/travel/FlightMap';
import { useApi } from '../services/api';
import travelApi from '../services/travelApi';
import { isWithinDateRange } from '../lib/dateFilters';

const TABS = [
  { id: 'flights', label: '航班' },
  { id: 'stats', label: '统计' },
  { id: 'map', label: '地图' },
];
const RANGES = [
  { value: 'all', label: '全部日期' },
  { value: 'thisYear', label: '今年' },
  { value: 'last3Months', label: '近 3 个月' },
  { value: 'thisMonth', label: '本月' },
  { value: 'lastMonth', label: '上月' },
];
const SORTS = [
  { value: 'date-desc', label: '日期（最新）' },
  { value: 'date-asc', label: '日期（最早）' },
  { value: 'airline-asc', label: '航司 A–Z' },
];
const PAGE = 30;
const number = new Intl.NumberFormat('zh-CN');

export default function TravelPage() {
  const [tab, setTab] = useState('flights');
  const [modal, setModal] = useState(null); // null | { flight }
  const [range, setRange] = useState('all');
  const [airline, setAirline] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [limit, setLimit] = useState(PAGE);
  const stats = useApi('/travel/statistics');
  const flights = useApi('/travel/flights');

  const airlines = useMemo(() => [...new Set((flights.data ?? []).map((f) => f.airline).filter(Boolean))].sort(), [flights.data]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (flights.data ?? []).filter(
      (f) =>
        isWithinDateRange(f.date, range) &&
        (!airline || f.airline === airline) &&
        (!q || [f.airline, f.origin, f.destination, f.flight_number].some((v) => v?.toLowerCase().includes(q))),
    );
    return list.sort((a, b) =>
      sort === 'date-asc' ? a.date.localeCompare(b.date) : sort === 'airline-asc' ? (a.airline || '').localeCompare(b.airline || '') : b.date.localeCompare(a.date),
    );
  }, [flights.data, range, airline, query, sort]);

  const remove = async (flight) => {
    if (!confirm(`确定删除 ${flight.flight_number}（${flight.date?.slice(0, 10)}）吗？`)) return;
    try {
      await travelApi.deleteFlight(flight.id);
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const s = stats.data;

  return (
    <div className="page">
      <PageHeader
        title="旅行"
        actions={
          <Button onClick={() => setModal({ flight: null })}>
            <Plus />
            添加航班
          </Button>
        }
      >
        <SegmentedTabs label="旅行视图" tabs={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      <StatStrip
        label="旅行统计"
        loading={stats.isLoading}
        items={[
          { label: '航班', value: s ? number.format(s.total_flights) : '—', hint: s ? `今年 ${s.this_year_flights} 段` : '' },
          { label: '里程', value: s ? `${number.format(Math.round(s.total_km))} km` : '—' },
          { label: '花费', value: s ? `$${number.format(Math.round(s.total_cost))}` : '—' },
          { label: '航司', value: s ? s.airlines_used : '—', hint: s?.favorite_airline ? `常飞 ${s.favorite_airline}` : '' },
          { label: '城市', value: s ? s.cities_visited : '—' },
          { label: '机场', value: s ? s.airports_visited : '—' },
        ]}
      />

      {tab === 'flights' && (
        <Section bodyClassName="p-0">
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
            <label className="flex h-9 max-w-[320px] flex-[1_1_220px] items-center gap-1.5 rounded-[10px] border border-input bg-card px-2 text-muted-foreground focus-within:border-ring">
              <Search className="size-3.5" aria-hidden="true" />
              <span className="sr-only">搜索航班</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="航司、航班号或机场" className="w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none" />
            </label>
            <label className="sr-only" htmlFor="flight-range">日期范围</label>
            <Select id="flight-range" value={range} onChange={(e) => { setRange(e.target.value); setLimit(PAGE); }} className="w-auto">
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
            <label className="sr-only" htmlFor="flight-airline">航司</label>
            <Select id="flight-airline" value={airline} onChange={(e) => setAirline(e.target.value)} className="w-auto max-w-[180px]">
              <option value="">全部航司</option>
              {airlines.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
            <label className="sr-only" htmlFor="flight-sort">排序</label>
            <Select id="flight-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
              {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{shown.length} 段</span>
          </div>
          {flights.isLoading ? (
            <Skeleton className="mx-4 mb-4 h-48" />
          ) : flights.error ? (
            <p className="px-5 py-10 text-center text-muted-foreground">航班加载失败。</p>
          ) : shown.length ? (
            <>
              <FlightList flights={shown.slice(0, limit)} onEdit={(flight) => setModal({ flight })} onDelete={remove} />
              <div className="flex items-center justify-between border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
                <span>显示 {Math.min(limit, shown.length)} / {shown.length} 段</span>
                {limit < shown.length && (
                  <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="font-medium text-accent-foreground hover:underline">加载更多</button>
                )}
              </div>
            </>
          ) : (
            <p className="px-5 py-10 text-center text-muted-foreground">
              {flights.data?.length ? '没有符合条件的航班，请调整筛选条件。' : '还没有航班记录，点击“添加航班”开始。'}
            </p>
          )}
        </Section>
      )}

      {tab === 'stats' && (
        <Section bodyClassName="p-0">
          <AirlineStats />
        </Section>
      )}

      {tab === 'map' && (
        <Section>
          <FlightMap />
        </Section>
      )}

      <Modal isOpen={Boolean(modal)} onClose={() => setModal(null)} title={modal?.flight ? '编辑航班' : '添加航班'}>
        {modal && <FlightForm flight={modal.flight} onSuccess={() => setModal(null)} onCancel={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
