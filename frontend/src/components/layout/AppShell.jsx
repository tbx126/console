import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ChartPie, Plane, Gamepad2, Settings2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard, end: true },
  { path: '/portfolio', label: '资产', icon: ChartPie },
  { path: '/travel', label: '旅行', icon: Plane },
  { path: '/gaming', label: '游戏', icon: Gamepad2 },
];

const settingsItem = { path: '/settings', label: '设置', icon: Settings2 };

function ThemeButton({ className }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const Icon = dark ? Sun : Moon;
  const label = dark ? '切换到浅色模式' : '切换到深色模式';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn('grid size-8 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background text-[13px] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[var(--topbar-height)] max-w-[1280px] items-center gap-4 px-4 sm:px-5">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-[#555ce4] text-[10px] font-bold text-white">PLC</span>
            <strong className="text-sm font-semibold">生活控制台</strong>
          </NavLink>
          <nav aria-label="主导航" className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-8 items-center rounded-[7px] px-2.5 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5">
            <NavLink
              to={settingsItem.path}
              aria-label="设置"
              title="设置"
              className={({ isActive }) =>
                cn(
                  'hidden size-8 place-items-center rounded-[7px] transition-colors md:grid',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Settings2 className="size-4" aria-hidden="true" />
            </NavLink>
            <ThemeButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-4 sm:px-5 md:pb-10">{children}</main>

      {/* 手机：底部标签栏 */}
      <nav
        aria-label="主导航"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-0.5 backdrop-blur md:hidden"
      >
        {[...navItems, settingsItem].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
                  isActive ? 'font-semibold text-accent-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
