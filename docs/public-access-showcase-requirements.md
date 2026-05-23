# 需求文档：公开访问 + 展示墙

> 文档版本：v1.0
> 状态：待开发
> 优先级：P0（最高）

---

## 一、背景与目标

### 当前问题

1. **已完成告白页需要登录才能查看** — 用户做好页面后，想分享给另一半，对方必须注册登录才能看到，转化漏斗严重阻塞
2. **首页无社交证明** — 新访客看不到任何已完成的作品，无法建立信任和吸引力
3. **分享体验差** — 分享链接发出去，对方点开先看到登录页，大部分人直接放弃

### 核心目标

1. **打通分享链路** — 用户分享链接后，任何人无需登录即可查看告白页
2. **建立社交证明** — 首页展示精选作品，让新访客看到成品质量，激发注册动机
3. **形成增长飞轮**：**制作 → 分享 → 吸引 → 注册 → 再制作**

### 成功指标

| 指标 | 预期提升 | 衡量方式 |
|------|----------|----------|
| 注册转化率 | +50% | 对比改造前后的注册数/访客数 |
| 页面分享率 | +80% | 分享后对方实际打开的比例 |
| 新用户来源 | 新增"看到他人分享"渠道 | 注册后询问来源 |

---

## 二、Feature 1：公开访问页面 `/p/:slug`

### 2.1 路由设计

```
GET /p/:slug — 公开访问已完成告白页（无需登录）
```

### 2.2 访问权限规则

| 条件 | 行为 |
|------|------|
| slug 存在且 status = 'completed' | 展示页面 |
| slug 不存在 | 404 |
| status != 'completed'（pending_review / in_development / dev_review / rejected） | 404，不暴露非完成状态 |
| unique_slug 为 NULL | 404 |

### 2.3 页面结构（从外到内）

```
┌──────────────────────────────┐
│  [OG Meta Tags]               │  ← 用于社交分享卡片预览
│  <title>告白页名称 - Pier</title> │
├──────────────────────────────┤
│  [顶部导航条]                   │  ← 极简，Pier Logo + "制作我的告白页" CTA
│                               │
│  [告白页 HTML 内容 — iframe]   │  ← srcdoc 隔离渲染，避免样式冲突
│                               │
│  [底部信息区]                   │
│  ├ 创作者: ***（已匿名）         │
│  ├ 免责声明                     │
│  └ "💝 立即制作你的专属告白页" CTA │
└──────────────────────────────┘
```

### 2.4 Open Graph 社交分享 meta 标签

在页面 `<head>` 中注入：

```html
<meta property="og:title" content="告白页名称 - Pier" />
<meta property="og:description" content="告白页描述（截取前120字）" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://ailaopo.online/p/:slug" />
<meta property="og:image" content="https://ailaopo.online/og-default.png" />
```

### 2.5 用户流程

```
用户A制作告白页 → 完成
  → 获取链接: https://ailaopo.online/p/xxx-xxx-xxx
  → 发给另一半B（微信/QQ等）
  → B点开链接
    → 看到告白页内容（无需登录！）
    → 看到底部"制作你的专属告白页"按钮
    → 感兴趣 → 点击 → 注册 → 创建自己的告白页
```

### 2.6 后续影响

1. **Dashboard 分享链接更新**：原 `/agent/:slug/share` 页面的分享链接改为 `/p/:slug`
2. **合作伙伴查看**：已分享的合作伙伴也可以通过 `/p/:slug` 查看，无需登录
3. **与原 `/agent/:slug` 的区别**：`/agent/:slug` 保持原样（需登录，含聊天Widget），作为创作者后台管理入口

---

## 三、Feature 2：首页展示墙

### 3.1 数据库变更

`agent_requests` 表新增列：

```sql
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS showcased BOOLEAN NOT NULL DEFAULT FALSE;
```

### 3.2 管理员操作

**在管理后台 `/admin/requests` 列表页**，对 `completed` 状态的 agent 增加推荐开关：

```
┌──────────────────────────────────┐
│  告白页名称             已完成    │
│  描述文字...                     │
│  [查看] [改名] [删除] [⭐推荐到首页] │  ← 新增按钮
└──────────────────────────────────┘
```

**在审核详情页 `/admin/requests/:id`**，对 `completed` 状态的 agent 增加推荐开关：

```
┌─ 已完成 ────────────────────────┐
│  短链接：xxx                    │
│  [查看告白页] [⭐ 推荐到首页 / 取消推荐] │
└─────────────────────────────────┘
```

### 3.3 首页展示（index.ejs）

在现有内容**最下方、免责声明之前**，新增"精选告白"版块：

```
┌─ 精选告白 ──────────────────────┐
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │名称A  │ │名称B  │ │名称C  │    │
│  │描述... │ │描述... │ │描述... │    │
│  │[查看] │ │[查看] │ │[查看] │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  最多展示12个，按更新时间倒序     │
│  若无推荐作品，该版块不显示       │
└──────────────────────────────────┘
```

### 3.4 查询逻辑

```typescript
const result = await pool.query(
  `SELECT id, name, description, unique_slug,
          LEFT(description, 80) as short_desc
   FROM agent_requests
   WHERE showcased = true AND status = 'completed' AND unique_slug IS NOT NULL
   ORDER BY updated_at DESC
   LIMIT 12`
);
```

### 3.5 展示规则

- 仅展示 `showcased = true AND status = 'completed'` 的 agent
- 每张卡片显示：名称、描述前80字、查看链接
- 空状态：若无推荐作品，整个版块隐藏
- 移动端适配：每个卡片占满宽度，横向滚动或堆叠

---

## 四、数据库变更

```sql
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS showcased BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## 五、需要修改/新增的文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/services/db.ts` | 修改 | 新增 `showcased` 列的 DDL |
| `app/src/server.ts` | 修改 | 注册 `/p/:slug` 路由 |
| `app/src/routes/agent.ts` | 修改 | 添加 `GET /p/:slug` 公开路由 |
| `app/views/agent/public.ejs` | **新建** | 公开访问页面的 standalone 模板 |
| `app/views/index.ejs` | 修改 | 添加"精选告白"展示墙版块 |
| `app/src/routes/admin.ts` | 修改 | 添加 `toggle-showcase` 路由 |
| `app/views/admin/requests.ejs` | 修改 | completed agent 增加推荐按钮 |
| `app/views/admin/review.ejs` | 修改 | completed 区域增加推荐开关 |
| `app/views/dashboard.ejs` | 修改 | 分享链接改为 `/p/:slug` |
| `app/views/agent/share.ejs` | 修改 | 提示分享链接改为 `/p/:slug` |

---

## 六、SEO & 社交分享

### Open Graph 标签
所有 `/p/:slug` 页面自动生成 OG meta 标签。

### 分享文本推荐
Dashboard 分享按钮展示推荐文案（用户可以一键复制）：
```
💝 我为你制作了一个专属告白页，点击查看：
https://ailaopo.online/p/xxx-xxx-xxx
```

---

## 七、边界情况

| 场景 | 处理方式 |
|------|----------|
| Agent 刚创建，HTML 内容为空 | 返回 404（`agent_files` 无记录） |
| Agent 被管理员删除后链接失效 | slug 查找为空，返回 404 |
| 恶意机器人大量爬取 `/p/` | MVP暂不限制，后续可加 IP 频率限制 |
| 用户取消展示后现有链接 | 展示墙消失，但 `/p/:slug` 仍可访问 |
| 分享到微信等平台 | OG 标签会自动生成预览卡片 |
| 移动端访问 | iframe 自适应宽度，CTA 按钮在底部固定 |

---

## 八、实现顺序

1. **DB 变更**：加 `showcased` 列
2. **公开路由**：`/p/:slug` 路由 + `public.ejs` 模板
3. **更新 Dashboard 分享链接**：改指向 `/p/:slug`
4. **首页展示墙**：index.ejs + 管理员开关
5. **管理员开关**：admin 路由 + 视图按钮
6. **验证与部署**
