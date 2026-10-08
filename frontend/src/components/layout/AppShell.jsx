import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ChartPie, Plane, Gamepad2, Bot, Settings2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard, end: true },
  { path: '/portfolio', label: '资产', icon: ChartPie },
  { path: '/travel', label: '旅行', icon: Plane },
  { path: '/gaming', label: '游戏', icon: Gamepad2 },
  { path: '/ai-assistant', label: 'AI 助手', icon: Bot },
];

const settingsItem = { path: '/settings', label: '设置', icon: Settings2 };

function Brand({ compact = false }) {
  return (
    <NavLink to="/" className="flex items-center gap-3 text-foreground no-underline">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[#555ce4] text-[13px] font-bold text-white">
        PLC
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <strong className="text-[15px] font-semibold">生活控制台</strong>
          <small className="text-xs text-muted-foreground">Personal Life Console</small>
        </span>
      )}
      {compact && <strong className="text-base font-semibold">生活控制台</strong>}
    </NavLink>
  );
}

function SideLink({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-[9px] px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent font-semibold text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function ThemeButton({ className, withLabel = true }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-[9px] px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      {withLabel && (dark ? '浅色模式' : '深色模式')}
    </button>
  );
}

// 这些页面自行占满内容区（如聊天界面），不使用统一页边距。
const FULL_BLEED = ['/ai-assistant'];

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const fullBleed = FULL_BLEED.some((path) => pathname.startsWith(path));
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* 桌面：左侧导航 */}
      <aside className="hidden w-[var(--sidebar-width)] shrink-0 flex-col gap-1 border-r border-border bg-card px-3.5 py-5 md:sticky md:top-0 md:flex md:h-screen">
        <div className="px-2.5 pb-6 pt-1.5">
          <Brand />
        </div>
        <nav aria-label="主导航" className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <SideLink key={item.path} item={item} />
          ))}
        </nav>
        <div className="flex-1" />
        <SideLink item={settingsItem} />
        <ThemeButton />
      </aside>

      {/* 手机：顶部栏 */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur md:hidden">
        <Brand compact />
        <div className="flex items-center">
          <NavLink
            to={settingsItem.path}
            aria-label="设置"
            className="grid size-11 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted"
          >
            <Settings2 className="size-5" aria-hidden="true" />
          </NavLink>
          <ThemeButton withLabel={false} className="size-11 justify-center px-0" />
        </div>
      </header>

      <main className={cn('min-w-0 flex-1', !fullBleed && 'px-4 pb-28 pt-6 sm:px-8 md:px-10 md:pb-12 md:pt-9')}>
        {children}
      </main>

      {/* 手机：底部标签栏 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 px-1.5 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 backdrop-blur md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                  isActive ? 'font-semibold text-accent-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
