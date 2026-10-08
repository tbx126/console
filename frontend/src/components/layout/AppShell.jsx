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

const sideLink = ({ isActive }) =>
  cn(
    'flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors [&_svg]:size-5 [&_svg]:shrink-0',
    isActive ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

function Brand() {
  return (
    <NavLink to="/" className="flex shrink-0 items-center gap-3 text-foreground">
      <span className="grid size-9 place-items-center rounded-[10px] bg-[#555ce4] text-xs font-bold text-white">PLC</span>
      <strong className="text-[17px] font-semibold">生活控制台</strong>
    </NavLink>
  );
}

function ThemeButton({ withLabel = false, className }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const Icon = dark ? Sun : Moon;
  const label = dark ? '切换到浅色模式' : '切换到深色模式';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={cn(
        withLabel
          ? 'flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-5'
          : 'grid size-10 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-5',
        className,
      )}
    >
      <Icon aria-hidden="true" />
      {withLabel && (dark ? '浅色模式' : '深色模式')}
    </button>
  );
}

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-background text-[15px] leading-normal text-foreground md:flex">
      {/* 桌面：左侧栏 */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border bg-card px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav aria-label="主导航" className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.end} className={sideLink}>
                <Icon aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
          <NavLink to={settingsItem.path} className={sideLink}>
            <Settings2 aria-hidden="true" />
            {settingsItem.label}
          </NavLink>
          <ThemeButton withLabel />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* 手机：顶栏 */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
          <Brand />
          <ThemeButton />
        </header>

        <main className="px-4 pb-28 pt-5 sm:px-6 md:px-[clamp(20px,2.5vw,40px)] md:pb-12 md:pt-6">{children}</main>
      </div>

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
                  'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs',
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
