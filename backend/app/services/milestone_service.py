"""Milestones derived from existing data across modules.

Nothing here is stored: milestones are recomputed from the portfolio value
history, the flight log and the Steam library each time. Only the emoji a person
picks for a milestone is persisted (config.json -> milestones.emoji).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

from app.config import settings
from app.services.data_manager import data_manager

EARTH_KM = 40075


@dataclass
class Milestone:
    id: str
    module: str  # portfolio | travel | gaming
    title: str
    detail: str
    emoji: str
    achieved: bool
    date: Optional[str] = None
    progress: float = 0.0
    current: float = 0.0
    target: float = 0.0
    eta: Optional[str] = None
    extra: Dict[str, str] = field(default_factory=dict)


def _money(value: float) -> str:
    return f"S$ {value:,.0f}"


def _ladder(
    *,
    prefix: str,
    module: str,
    emoji: Sequence[str],
    targets: Sequence[float],
    events: Sequence[Tuple[Optional[str], float]],
    current: float,
    title: Callable[[float], str],
    detail_done: Callable[[float, Optional[str]], str],
    detail_next: Callable[[float, float], str],
    eta: Optional[Callable[[float], Optional[str]]] = None,
) -> List[Milestone]:
    """Achieved rungs (with the first date the running value reached them) plus the next rung.

    ``events`` is the running value over time, oldest first; a ``None`` date
    means the value is known but not when it was reached.
    """
    reached: Dict[float, Optional[str]] = {}
    for when, value in events:
        for target in targets:
            if target not in reached and value >= target:
                reached[target] = when
    items = [
        Milestone(
            id=f"{prefix}-{int(target)}", module=module, title=title(target), detail=detail_done(target, when),
            emoji=_emoji_for(emoji, targets, target), achieved=True, date=when, progress=1.0, current=current, target=target,
        )
        for target, when in reached.items()
    ]
    upcoming = next((t for t in targets if t not in reached), None)
    if upcoming is not None and current > 0:
        items.append(Milestone(
            id=f"{prefix}-{int(upcoming)}", module=module, title=title(upcoming), detail=detail_next(current, upcoming),
            emoji=_emoji_for(emoji, targets, upcoming), achieved=False, progress=min(current / upcoming, 0.999), current=current, target=upcoming,
            eta=eta(upcoming) if eta else None,
        ))
    return items


def _emoji_for(emojis: Sequence[str], targets: Sequence[float], target: float) -> str:
    """Higher rungs get progressively bigger emoji; the last one repeats."""
    return emojis[min(list(targets).index(target), len(emojis) - 1)]


def _days_between(a: Optional[str], b: Optional[str]) -> Optional[int]:
    if not a or not b:
        return None
    return (date.fromisoformat(b[:10]) - date.fromisoformat(a[:10])).days


def portfolio_milestones(history: Sequence[dict]) -> List[Milestone]:
    points = sorted(
        ((p["at"], p["totals"]["SGD"]) for p in history if isinstance(p, dict) and p.get("totals")),
        key=lambda p: p[0],
    )
    if not points:
        return []
    current = points[-1][1]
    targets = [50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000, 750_000, 1_000_000]
    events = [(at[:10], value) for at, value in points]
    firsts: Dict[float, str] = {}
    for when, value in events:
        for t in targets:
            if t not in firsts and value >= t:
                firsts[t] = when

    def detail_done(target: float, when: Optional[str]) -> str:
        index = targets.index(target)
        if index > 0 and targets[index - 1] in firsts:
            days = _days_between(firsts[targets[index - 1]], when)
            if days is not None:
                return f"自 {_money(targets[index - 1])} 起用时 {days} 天"
        return "首次记录到该金额"

    def eta(target: float) -> Optional[str]:
        # Linear trend over ~90 days, anchored on the last observation at or before
        # the window start so sparse histories still have a baseline.
        def parse(at: str) -> datetime:
            return datetime.fromisoformat(at.replace("Z", "+00:00"))

        last_at = parse(points[-1][0])
        start = last_at - timedelta(days=90)
        anchor = max((i for i, p in enumerate(points) if parse(p[0]) <= start), default=0)
        window = points[anchor:]
        if len(window) < 2:
            return None
        first_at = parse(window[0][0])
        days = (last_at - first_at).total_seconds() / 86400
        if days < 14:
            return None
        per_day = (window[-1][1] - window[0][1]) / days
        if per_day <= 0:
            return None
        return (last_at + timedelta(days=(target - current) / per_day)).date().isoformat()[:7]

    return _ladder(
        prefix="portfolio-total", module="portfolio", emoji=["🌱", "💰", "🚀", "🏆", "💎", "👑"], targets=targets, events=events, current=current,
        title=lambda t: f"资产 {_money(t)}",
        detail_done=detail_done,
        detail_next=lambda cur, t: f"还差 {_money(t - cur)}",
        eta=eta,
    )


def travel_milestones(flights: Iterable[dict], today: date) -> List[Milestone]:
    ordered = sorted((f for f in flights if f.get("date")), key=lambda f: f["date"])
    items: List[Milestone] = []
    if not ordered:
        return items

    count_events = [(f["date"][:10], i + 1) for i, f in enumerate(ordered)]
    items += _ladder(
        prefix="flights", module="travel", emoji=["✈️", "🛫", "🧳", "🌐", "🏅", "👑"], targets=[10, 25, 50, 100, 200, 300, 500],
        events=count_events, current=len(ordered),
        title=lambda t: f"累计飞行 {int(t)} 段",
        detail_done=lambda t, when: f"第 {int(t)} 段：{ordered[int(t) - 1].get('flight_number', '')}".rstrip("："),
        detail_next=lambda cur, t: f"当前 {int(cur)} 段 · 还差 {int(t - cur)} 段",
    )

    cities: set = set()
    city_events = []
    city_names: Dict[int, str] = {}
    for f in ordered:
        for code in (f.get("origin"), f.get("destination")):
            if code and code not in cities:
                cities.add(code)
                city_names[len(cities)] = code
                city_events.append((f["date"][:10], len(cities)))
    items += _ladder(
        prefix="places", module="travel", emoji=["📍", "🗺️", "🧭", "🌏", "🏅"], targets=[10, 20, 30, 40, 50, 75, 100],
        events=city_events, current=len(cities),
        title=lambda t: f"到访 {int(t)} 个地点",
        detail_done=lambda t, when: f"第 {int(t)} 个：{city_names.get(int(t), '')}",
        detail_next=lambda cur, t: f"当前 {int(cur)} 个",
    )

    km = 0.0
    km_events = []
    for f in ordered:
        km += f.get("distance") or 0
        km_events.append((f["date"][:10], km))
    laps = [EARTH_KM * n for n in (1, 2, 5, 10, 20)]
    items += _ladder(
        prefix="distance", module="travel", emoji=["🌍", "🌎", "🌏", "🛰️", "🚀"], targets=laps, events=km_events, current=km,
        title=lambda t: f"飞行里程绕地球 {round(t / EARTH_KM)} 圈",
        detail_done=lambda t, when: f"累计 {t:,.0f} km",
        detail_next=lambda cur, t: f"当前 {cur:,.0f} km · 还差 {t - cur:,.0f} km",
    )

    year = str(today.year)
    this_year = [f for f in ordered if f["date"].startswith(year)]
    if this_year:
        items += _ladder(
            prefix=f"year-{year}", module="travel", emoji=["🛫", "🧳", "🏅", "👑"], targets=[10, 20, 30, 50],
            events=[(f["date"][:10], i + 1) for i, f in enumerate(this_year)], current=len(this_year),
            title=lambda t: f"{year} 年飞行 {int(t)} 段",
            detail_done=lambda t, when: f"{year} 年第 {int(t)} 段：{this_year[int(t) - 1].get('flight_number', '')}",
            detail_next=lambda cur, t: f"今年已飞 {int(cur)} 段",
        )
    return items


def gaming_milestones(games: Sequence[dict]) -> List[Milestone]:
    if not games:
        return []
    hours = sum(g.get("playtime_forever", 0) or 0 for g in games) / 60
    items = _ladder(
        prefix="games", module="gaming", emoji=["🎮", "🕹️", "📚", "🏛️", "👑"], targets=[25, 50, 100, 150, 200, 300, 500],
        events=[(None, len(games))], current=len(games),
        title=lambda t: f"游戏库 {int(t)} 款",
        detail_done=lambda t, when: "Steam 游戏库",
        detail_next=lambda cur, t: f"当前 {int(cur)} 款",
    )
    items += _ladder(
        prefix="playtime", module="gaming", emoji=["⏱️", "⌛", "🔥", "🏅", "👑"], targets=[100, 500, 1000, 2000, 5000, 10000],
        events=[(None, hours)], current=hours,
        title=lambda t: f"总游玩 {int(t):,} 小时",
        detail_done=lambda t, when: "所有游戏累计",
        detail_next=lambda cur, t: f"当前 {cur:,.0f} 小时",
    )
    top = max(games, key=lambda g: g.get("playtime_forever", 0) or 0)
    top_hours = (top.get("playtime_forever", 0) or 0) / 60
    items += _ladder(
        prefix="single-game", module="gaming", emoji=["🏆", "💯", "👑"], targets=[100, 500, 1000],
        events=[(None, top_hours)], current=top_hours,
        title=lambda t: f"单款游戏 {int(t)} 小时",
        detail_done=lambda t, when: top.get("name", ""),
        detail_next=lambda cur, t: f"{top.get('name', '')} 已玩 {cur:,.0f} 小时",
    )
    return items


class MilestoneService:
    def compute(self, today: Optional[date] = None) -> dict:
        today = today or datetime.now(timezone.utc).date()
        portfolio = data_manager.read_data(settings.portfolio_data_file)
        history = ((portfolio or {}).get("portfolio") or {}).get("history") or []
        travel = data_manager.read_data(settings.travel_data_file)
        gaming = data_manager.read_data(settings.gaming_data_file)
        config = data_manager.read_data(settings.config_data_file)
        emoji_overrides: Dict[str, str] = ((config or {}).get("milestones") or {}).get("emoji") or {}

        items = (
            portfolio_milestones(history)
            + travel_milestones((travel or {}).get("flights") or [], today)
            + gaming_milestones((gaming or {}).get("games") or [])
        )
        for item in items:
            item.emoji = emoji_overrides.get(item.id, item.emoji)
        # Newest first; milestones without a known date go last.
        achieved = sorted((m for m in items if m.achieved), key=lambda m: m.date or "", reverse=True)
        upcoming = sorted((m for m in items if not m.achieved), key=lambda m: -m.progress)
        return {"achieved": [asdict(m) for m in achieved], "upcoming": [asdict(m) for m in upcoming]}

    def set_emoji(self, milestone_id: str, emoji: Optional[str]) -> None:
        def mutate(data):
            overrides = data.setdefault("milestones", {}).setdefault("emoji", {})
            if emoji:
                overrides[milestone_id] = emoji
            else:
                overrides.pop(milestone_id, None)

        data_manager.update_data(settings.config_data_file, mutate)


milestone_service = MilestoneService()
