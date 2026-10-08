
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { currencies, sample, sampleQuotes, sampleFx, portfolioSchema, quoteSchema, fxSchema, historySchema, keyOf, type Portfolio, type Quote, type Fx, type Currency, type Snapshot } from "./portfolio";
import { captureSnapshot, mergeHistory } from "./history";
import { sharedSchema, type SharedPortfolio } from "./shared-portfolio";
import { invalidate } from "@/lib/query";
const KEYS = { holdings: "folio.holdings.v1", market: "folio.market.v1", settings: "folio.settings.v1", history: "folio.history.v1" };
const QUOTE_TTL = 5 * 60 * 1000, FX_TTL = 24 * 60 * 60 * 1000;
function save(key: string, data: unknown) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch { return false; } }
function read(key: string) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(sample); const [demo, setDemo] = useState(true);
  const [currency, setCurrency] = useState<Currency>("SGD");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({}); const [fx, setFx] = useState<Fx | null>(null);
  const [ready, setReady] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]); const [attempt, setAttempt] = useState<number | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]); const [demoHistory, setDemoHistory] = useState<Snapshot[]>([]);
  const historyRef = useRef<Snapshot[]>([]);
  const sharedRef = useRef<SharedPortfolio | null>(null); const busy = useRef(false); const editing = useRef(false);
  const migration = useRef<Portfolio | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "connected" | "offline" | "saving">("loading");
  const [revision, setRevision] = useState(0);
  async function sharedRequest(method = "GET", data?: unknown) {
    const response = await fetch("/api/portfolio", { method, cache: "no-store", signal: AbortSignal.timeout(15000), ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
    if (!response.ok) { const error = new Error(response.status === 409 ? "另一设备已修改持仓，请同步最新数据后再保存。填写内容仍保留。" : "NAS 暂不可用，保存未完成。请重试或导出备份。"); Object.assign(error, { status: response.status }); throw error; }
    return sharedSchema.parse(await response.json());
  }
  function applyShared(data: SharedPortfolio) {
    const previous = sharedRef.current;
    if (previous && (data.revision < previous.revision || (data.revision === previous.revision && (data.updatedAt ?? "") < (previous.updatedAt ?? "")))) return false;
    sharedRef.current = data; setRevision(data.revision); setSyncState("connected");
    if (!data.portfolio) return true;
    const { history: points = [], ...holdings } = data.portfolio;
    setPortfolio(holdings); setDemo(false); historyRef.current = points; setHistory(points);
    save(KEYS.holdings, holdings); save(KEYS.history, points);
    return true;
  }
  const realQuotes = useRef<Record<string, Quote>>({}); const realFx = useRef<Fx | null>(null); const generation = useRef(0);
  const refresh = useCallback(async (p: Portfolio, force = false, notify = false, record = false) => {
    const ticket = ++generation.current; setRefreshing(true);
    const problems: string[] = []; const next = { ...realQuotes.current }; let rates = realFx.current;
    const symbols = [...new Set(p.assets.map(keyOf).filter((v): v is string => !!v))];
    async function fetchJson(url: string) { const r = await fetch(url, { cache: force ? "no-store" : "default", signal: AbortSignal.timeout(22000) }); if (!r.ok) throw new Error("暂不可用"); return r.json(); }
    const updateFx = async () => {
      if (!force && rates && Date.now() - rates.fetchedAt < FX_TTL && !rates.stale) return;
      try { rates = fxSchema.parse(await fetchJson("/api/portfolio/fx")); if (rates.stale) problems.push("汇率"); }
      catch { if (rates) rates = { ...rates, stale: true }; problems.push("汇率"); }
    };
    let index = 0;
    const worker = async () => {
      while (index < symbols.length && ticket === generation.current) {
        const symbol = symbols[index++]; const old = next[symbol];
        if (!force && old && Date.now() - old.fetchedAt < QUOTE_TTL && !old.stale) continue;
        try { next[symbol] = quoteSchema.parse(await fetchJson(`/api/portfolio/quote?symbol=${encodeURIComponent(symbol)}`)); if (next[symbol].stale) problems.push(symbol); }
        catch { if (old) next[symbol] = { ...old, stale: true }; problems.push(symbol); }
        if (ticket === generation.current) setQuotes({ ...next });
      }
    };
    await Promise.all([updateFx(), ...Array.from({ length: Math.min(4, symbols.length) }, worker)]);
    if (ticket !== generation.current) return;
    realQuotes.current = next; realFx.current = rates; setQuotes(next); setFx(rates); setErrors(problems); setAttempt(Date.now()); setRefreshing(false);
    // Keep only currently used symbols; no demo valuations are ever written here.
    const retained = Object.fromEntries(symbols.filter(s => next[s]).map(s => [s, next[s]]));
    if (!save(KEYS.market, { quotes: retained, fx: rates })) toast.warning("浏览器无法保存行情缓存，下次打开将重新获取。");
    const snapshot = captureSnapshot(p, next, rates);
    if (snapshot) {
      if (record) {
        const shared = sharedRef.current;
        if (shared?.portfolio && JSON.stringify(shared.portfolio.assets) === JSON.stringify(p.assets)) {
          try {
            const result = await sharedRequest("POST", { revision: shared.revision, snapshot });
            if (ticket === generation.current && sharedRef.current?.revision === result.revision && (result.updatedAt ?? "") >= (sharedRef.current.updatedAt ?? "")) {
              sharedRef.current = result; invalidate("/portfolio"); invalidate("/milestones"); const points = result.portfolio?.history ?? [];
              historyRef.current = points; setHistory(points); save(KEYS.history, points);
            }
          } catch (error) { if (ticket === generation.current && (error as { status?: number }).status !== 409) setSyncState("offline"); }
        }
      } else setDemoHistory(points => mergeHistory(points, [snapshot]));
    }
    if (notify) problems.length ? toast.warning(`${problems.length} 项行情或汇率未更新，已保留可用缓存`) : toast.success("行情和汇率已更新");
  }, []);
  useEffect(() => {
    const stored = read(KEYS.holdings); const parsed = portfolioSchema.safeParse(stored);
    const p = parsed.success ? parsed.data : sample;
    if (stored && !parsed.success) toast.warning("本地资产数据格式异常，暂时展示示例。请重新导入。 ");
    const market = read(KEYS.market); const checked: Record<string, Quote> = {};
    if (market?.quotes && typeof market.quotes === "object") for (const [key, value] of Object.entries(market.quotes).slice(0, 200)) { const q = quoteSchema.safeParse(value); if (q.success && q.data.fetchedAt <= Date.now()+60000 && q.data.fetchedAt>0) checked[key] = q.data; }
    const checkedFx = fxSchema.safeParse(market?.fx); realQuotes.current = checked; realFx.current = checkedFx.success && checkedFx.data.fetchedAt <= Date.now()+60000 ? checkedFx.data : null;
    setQuotes(checked); setFx(realFx.current); setPortfolio(p); setDemo(!parsed.success);
    const storedHistory = historySchema.safeParse(read(KEYS.history));
    const points = mergeHistory(storedHistory.success ? storedHistory.data : [], parsed.success ? parsed.data.history ?? [] : []);
    historyRef.current = points; setHistory(points);
    const settings = read(KEYS.settings); if (currencies.includes(settings?.currency)) setCurrency(settings.currency);
    if (parsed.success) migration.current = { ...p, history: points };
    let cancelled = false;
    void (async () => {
      try {
        let data = await sharedRequest();
        if (cancelled) return;
        if (!data.portfolio && migration.current) {
          save("folio.migration-backup.v1", migration.current);
          try { data = await sharedRequest("PUT", { revision: 0, portfolio: migration.current }); toast.success("此浏览器的持仓与曲线已迁移到 NAS"); }
          catch (error) { if ((error as { status?: number }).status === 409) data = await sharedRequest(); else throw error; }
        } else if (data.portfolio && migration.current) save("folio.migration-backup.v1", migration.current);
        if (cancelled) return;
        migration.current = null; applyShared(data); setReady(true); void refresh(data.portfolio ?? sample, false, false, !!data.portfolio);
      } catch { if (!cancelled) { setSyncState("offline"); setReady(true); void refresh(p, false, false, false); } }
    })();
    return () => { cancelled = true; generation.current++; };
  }, [refresh]);
  useEffect(() => { if (ready && !save(KEYS.settings, { currency })) toast.warning("偏好设置无法保存。"); }, [currency, ready]);
  const sync = async () => {
    if (busy.current || editing.current) return;
    try {
      let data = await sharedRequest();
      if (!data.portfolio && migration.current) data = await sharedRequest("PUT", { revision: 0, portfolio: migration.current });
      const previous = sharedRef.current;
      migration.current = null; const applied = applyShared(data);
      if (applied && data.portfolio && (!previous?.portfolio || data.revision !== previous.revision)) void refresh(data.portfolio, false, false, true);
    } catch { setSyncState("offline"); }
  };
  const syncLatest = useRef(sync); syncLatest.current = sync;
  useEffect(() => {
    if (!ready) return;
    const check = () => { if (!document.hidden) void syncLatest.current(); };
    const interval = setInterval(check, 15000); window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => { clearInterval(interval); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [ready]);
  const savePortfolio = async (p: Portfolio, message?: string, expectedRevision = sharedRef.current?.revision) => {
    if (busy.current) return false;
    if (expectedRevision === undefined || !sharedRef.current) { toast.error("尚未连接 NAS，请先重试同步。填写内容仍保留。"); return false; }
    const checked = portfolioSchema.parse(p);
    busy.current = true; setSyncState("saving");
    try {
      const result = await sharedRequest("PUT", { revision: expectedRevision, portfolio: { ...checked, history: mergeHistory(historyRef.current, checked.history ?? []) } });
      applyShared(result); invalidate("/portfolio"); invalidate("/milestones"); setErrors([]); setQuotes(realQuotes.current); setFx(realFx.current);
      void refresh(result.portfolio!, false, true, true); toast.success(message ?? `已将 ${checked.assets.length} 项资产保存到 NAS`); return true;
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        try { applyShared(await sharedRequest()); } catch { setSyncState("offline"); }
      } else setSyncState("offline");
      toast.error(error instanceof Error ? error.message : "NAS 保存失败"); return false;
    } finally { busy.current = false; }
  };
  return { portfolio, demo, currency, setCurrency, revision, currentRevision: () => sharedRef.current?.revision ?? 0, syncState, sync, setEditing: (value: boolean) => { editing.current = value; }, history: demo ? demoHistory : history, quotes: demo ? { ...sampleQuotes, ...quotes } : quotes, fx: fx ?? (demo ? sampleFx : null), refreshing, ready, errors, attempt, importPortfolio: (p: Portfolio, expectedRevision?: number) => savePortfolio(p, undefined, expectedRevision), savePortfolio, refresh: () => refresh(portfolio, true, true, !demo) };
}
