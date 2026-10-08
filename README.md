# Personal Life Console · 生活控制台

个人生活数据控制台：资产、旅行与游戏，统一界面，一处查看。

## 模块

- **总览**：总资产与近 90 天走势、下一个里程碑、模块指标、跨模块里程碑（可按模块筛选，已达成的可点击更换 emoji）、资产分布与最近动态。
- **资产**（原 folio 项目并入），分「明细」与「分析」两个视图。分析包含资产走势（里程碑虚线、首次达到标记、数据表）、类别构成随时间变化、币种敞口与集中度、前 10 项持仓、月度变化。现金、股票、基金（QDII）、积存金、加密货币的当前市值。只记录持有数量与市值，不记录成本或盈亏。支持 JSON 导入导出、基金分组与定投估算、资产金额走势，多设备通过后端共享同一份持仓（带版本号，防止设备互相覆盖）。
- **旅行**：航班记录、航线地图与航司统计。
- **游戏**：Steam 游戏库、游玩时长与成就。
- **设置**：API 密钥、缓存（命中率、按类别清空）、数据快照与归档。

> 原「Finance / 记账」、「AI 助手」与旧的 investments 投资模块已移除。

## 技术栈

**后端**：FastAPI · Pydantic · Uvicorn · httpx，JSON 文件存储。

**前端**：React 19 + Vite · Tailwind CSS 4（统一设计令牌）· shadcn/ui（Radix / Base UI）· Recharts · sonner。资产模块使用 TypeScript + zod。

## 本地运行

```bash
# 后端
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload                       # http://localhost:8000 · 文档 /docs

# 前端
cd frontend
npm install
npm run dev                                         # http://localhost:5173
```

检查：

```bash
cd backend && python -m pytest          # 后端测试（含资产 API、存储、行情解析）
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

Docker：`docker compose up --build`，访问 http://localhost:8080 。数据保存在 `backend/data`。

## 资产模块

### 数据与 API

持仓与走势保存在 `backend/data/portfolio.json`，格式 `{revision, portfolio, updatedAt}`，写入为原子替换并保留 `portfolio.json.previous`。保存时需携带读取时的 `revision`，过期版本返回 409。备份/归档功能把它作为 `portfolio` 模块一并处理。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/portfolio` | 读取共享持仓 |
| PUT | `/api/portfolio` | `{revision, portfolio}` 保存全部持仓 |
| POST | `/api/portfolio` | `{revision, snapshot}` 追加一个估值记录点 |
| GET | `/api/portfolio/quote?symbol=AAPL` | 股票/加密货币报价（Yahoo Finance），`XAU` 为每克金价（Gold API） |
| GET | `/api/portfolio/fx` | USD 基准的 SGD/CNY/HKD 参考汇率（Frankfurter） |
| GET | `/api/portfolio/search?category=stock&q=腾讯` | 标的搜索（Yahoo、东方财富、天天基金） |

行情缓存 5 分钟、汇率 24 小时（服务端内存）；刷新失败时返回带 `stale: true` 的旧值。外部数据源只接收代码，不接收数量或金额。写接口仅接受本站 `application/json` 请求；与 folio 一样，**没有登录认证**，能访问本站的人都可以读取和修改持仓。

JSON 导入格式与估值规则见资产页右上角「数据与估值说明」。

### 从 folio 迁移

- **整份迁移**：把 folio 的 `FOLIO_DATA_DIR/portfolio.json` 复制为 `backend/data/portfolio.json`（格式相同）。
- **或导出/导入**：在 folio 页面「导出」JSON，再在本站资产页「导入资产」。
- 若 `backend/data/portfolio.json` 仍是旧 investments 格式，资产页会显示为空；第一次保存时旧文件会另存为 `portfolio.legacy.json`。

## 里程碑

`GET /api/milestones` 每次根据现有数据计算，不额外存储：资产（估值记录点中的 SGD 总额：5 万、10 万、15 万…，带首次达到日期、两档间用时，以及按近 90 天增速估算的达成时间）、旅行（累计航段、到访地点、绕地球圈数、当年航段）、游戏（游戏库数量、总时长、单款时长）。`PUT /api/milestones/{id}/emoji` 保存自定义 emoji 到 `config.json`。

## 缓存

两级缓存：

- **后端（L2）** `app/services/cache_service.py`：统一的命名空间（`quote` 5 分钟、`fx` 1 天、`search` 1 分钟、`flight` 7 天），每个命名空间独立 TTL 与 LRU 上限；同一 key 的并发请求只发一次外部请求；外部失败时返回带 `stale` 标记的旧值。Steam 详情 / 成就 / 媒体仍由磁盘缓存管理（LRU 上限 1 GB），数据文件读缓存按修改时间校验。`GET /api/cache` 查看统计，`DELETE /api/cache[/{name}]` 清空；更新 API 密钥会清空航班查询缓存。
- **前端（L1）** `src/lib/query.js`：唯一的请求缓存入口（`useApi` / `get` / `send`）。同一请求自动合并；写操作成功后按模块前缀（如 `/travel`）以及 `/milestones` 自动失效，正在显示的组件随即重新获取；数据恢复与导入后全部失效。

## 设计系统

紧凑密度：桌面端根字号 14px（所有 rem 尺寸随之缩小），触屏设备保留 16px。顶部导航栏取代侧栏，手机端为底部标签栏。资产类别颜色为 CSS 变量 `--cat-*`（浅色/深色两套，已通过色盲与对比度检查）。令牌定义在 `frontend/src/index.css`：语义色（`bg-background`、`bg-card`、`text-muted-foreground`、`bg-primary`、`border-border` 等，浅色/深色两套）、Geist + Noto Sans SC 字体与圆角。旧代码中的 `zinc/slate/gray` 与 `violet/indigo/purple` 色阶被映射到同一套冷灰与靛蓝，因此所有模块视觉一致。页面统一使用 `components/layout/AppShell`、`ui/PageHeader`、`ui/SegmentedTabs`、`ui/StatStrip` 与 `ui/Section`。

## 目录

```
backend/app/
  routers/portfolio.py         资产 API
  services/portfolio_store.py  带版本的 JSON 存储
  services/market_service.py   报价 / 金价 / 汇率
  services/instrument_search.py
frontend/src/
  components/layout/AppShell.jsx
  components/ui/               统一基础组件
  components/shadcn/           资产模块使用的 shadcn 组件
  features/portfolio/          资产模块（folio）
  pages/                       各页面
```
