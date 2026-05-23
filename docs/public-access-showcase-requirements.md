# 需求文档：公开访问 + 展示墙

> 文档版本：v2.0
> 状态：待开发
> 优先级：P0（最高）

---

## 一、背景与目标

### 当前问题

1. **已完成告白页需要登录才能查看** — 用户做好页面后，想分享给另一半，对方必须注册登录才能看到，转化漏斗严重阻塞
2. **用户无法控制隐私** — 所有已完成页面要么全部登录可见，没有任何中间选项
3. **首页无社交证明** — 新访客看不到任何已完成的作品，无法建立信任和吸引力

### 核心目标

1. **打通分享链路** — 用户可选择公开，分享链接后任何人无需登录即可查看
2. **用户掌控隐私** — 每个 creator 可独立控制自己的页面是否公开
3. **建立社交证明** — 首页展示精选作品，激发注册动机
4. **形成增长飞轮**：**制作 → 公开分享 → 吸引 → 注册 → 再制作**

### 成功指标

| 指标 | 预期提升 | 衡量方式 |
|------|----------|----------|
| 注册转化率 | +50% | 对比改造前后的注册数/访客数 |
| 公开比例 | >60% | 已完成的 agent 中被设为公开的比例 |
| 新用户来源 | 新增"看到他人分享"渠道 | 注册后询问来源 |

---

## 二、隐私模型

### 三档权限级别

| 级别 | 路由 | 可见范围 | 谁可控制 |
|------|------|----------|----------|
| **🔒 私密** | `/agent/:slug`（需登录） | 仅创建者 + 分享伙伴 + 管理员 | 创建者 |
| **🌐 公开** | `/agent/:slug` + `/p/:slug` | 任何人（含未登录） | 创建者 |
| **⭐ 推荐** | `/agent/:slug` + `/p/:slug` + 首页 | 任何人 + 首页推荐位 | 管理员（限于公开的 agent） |

### 状态流转

```
创建 → pending_review → in_development → dev_review → completed
                                                          │
                                                     ┌────┴────┐
                                                     ▼         ▼
                                                  私密 ←→ 公开
                                                            │
                                                       (管理员控制)
                                                            ▼
                                                          推荐
```

### 关键规则

1. **默认值**：新完成的 agent 默认为 **私密**（保护隐私，创建者主动选择公开）
2. **切换方向**：创建者可随时在 私密 ↔ 公开 之间切换
3. **管理员推荐**：必须先为 **公开**，管理员才能推荐到首页
4. **取消推荐**：如果创建者将 agent 从公开切回私密，自动从首页展示墙移除（`showcased` 自动置 false）

---

## 三、Feature 1：公开访问页面 `/p/:slug`

### 3.1 路由设计

```
GET /p/:slug — 公开访问告白页（无需登录）
```

### 3.2 访问权限规则

| 条件 | 行为 |
|------|------|
| slug 存在、status = 'completed' **且** `is_public = true` | 展示页面 |
| slug 不存在 | 404 |
| status != 'completed' | 404，不暴露非完成状态 |
| unique_slug 为 NULL | 404 |
| `is_public = false` | 404（私密页面不可公开访问） |

### 3.3 页面结构

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

### 3.4 Open Graph 社交分享 meta 标签

```html
<meta property="og:title" content="告白页名称 - Pier" />
<meta property="og:description" content="告白页描述（截取前120字）" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://ailaopo.online/p/:slug" />
<meta property="og:image" content="https://ailaopo.online/og-default.png" />
```

### 3.5 用户流程

```
用户A制作告白页 → 完成 → 默认私密
  → 在 Dashboard 点击"设为公开"
  → 获取公开链接: https://ailaopo.online/p/xxx-xxx-xxx
  → 发给另一半B（微信/QQ等）
  → B点开链接
    → 看到告白页内容（无需登录！）
    → 看到底部"制作你的专属告白页"按钮
    → 感兴趣 → 点击 → 注册 → 创建自己的告白页
```

### 3.6 与原 `/agent/:slug` 的区别

| 方面 | `/agent/:slug` | `/p/:slug` |
|------|:---:|:---:|
| 需登录 | ✅ | ❌ |
| 聊天 Widget | ✅ | ❌ |
| 创作者信息 | 显示邮箱 | 匿名 |
| OG 社交标签 | ❌ | ✅ |
| 底部 CTA | ❌ | ✅ "我也要制作" |
| HTML 渲染 | 直接注入 | iframe srcdoc 隔离 |

---

## 四、Feature 2：创建者隐私开关（Dashboard）

### 4.1 Dashboard 新增切换按钮

在 dashboard.ejs 中，对 `completed` 状态的 agent，增加"设为公开/设为私密"按钮：

```
┌─ 告白页名称             已完成  🌐 已公开 ──────────┐
│  [公开页] [分享管理] [升级] [改名] [删除] [🔒设为私密] │
└────────────────────────────────────────────────────┘
```

或

```
┌─ 告白页名称             已完成  🔒 私密 ────────────┐
│  [分享管理] [升级] [改名] [删除] [🌐设为公开]        │
└────────────────────────────────────────────────────┘
```

### 4.2 新增路由

在 agent.ts 中：

```typescript
// POST /agent/:id/toggle-public — Toggle is_public (creator only)
router.post('/:id/toggle-public', requireAuth, async (req, res) => {
  try {
    const agent = await pool.query(
      `SELECT id, user_id, is_public, showcased FROM agent_requests WHERE id = $1::uuid AND status = 'completed'`,
      [req.params.id]
    );
    if (agent.rows.length === 0) return res.status(404).send('Agent not found');
    const a = agent.rows[0];
    if (a.user_id !== req.session.userId) return res.status(403).send('Access denied');

    const newPublic = !a.is_public;
    // If switching back to private, also remove from showcase
    if (!newPublic && a.showcased) {
      await pool.query(
        `UPDATE agent_requests SET is_public = false, showcased = false, updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE agent_requests SET is_public = $1, updated_at = NOW() WHERE id = $2`,
        [newPublic, req.params.id]
      );
    }
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Toggle public error:', err);
    res.status(500).send('Server error');
  }
});
```

**关键逻辑**：从公开切回私密时，自动 `showcased = false`（移出首页展示）

---

## 五、Feature 3：首页展示墙（管理员运营）

### 5.1 管理员操作规则

- 管理员**只能**推荐 **公开**（`is_public = true`）的 agent 到首页
- 如果 agent 是私密的，推荐按钮置灰/禁用，提示"请先让用户设为公开"
- 管理员取消推荐后，agent 变为"仅公开、不展示"

### 5.2 管理后台列表页 — 推荐按钮

completed agent 的操作按钮增加条件渲染：

```
<% } else if (a.status === 'completed') { %>
    <% if (a.is_public) { %>
        <form method="POST" action="/admin/requests/<%= a.id %>/toggle-showcase">
            <button><%= a.showcased ? '⭐ 已推荐' : '⭐ 推荐到首页' %></button>
        </form>
    <% } else { %>
        <span style="color:#b0b0c8;">🔒 私密，无法推荐</span>
    <% } %>
<% } %>
```

### 5.3 管理后台详情页 — 推荐开关

同理，只有在 `is_public = true` 时才显示推荐操作。

### 5.4 首页展示查询

```typescript
SELECT id, name, description, unique_slug,
       LEFT(description, 80) as short_desc
FROM agent_requests
WHERE showcased = true AND status = 'completed'
  AND unique_slug IS NOT NULL AND is_public = true
ORDER BY updated_at DESC
LIMIT 12
```

---

## 六、数据库变更

`agent_requests` 表新增 **2个列**：

```sql
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agent_requests ADD COLUMN IF NOT EXISTS showcased BOOLEAN NOT NULL DEFAULT FALSE;
```

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `is_public` | BOOLEAN | `FALSE` | 创建者控制：是否公开可见 |
| `showcased` | BOOLEAN | `FALSE` | 管理员控制：是否推荐到首页 |

---

## 七、需要修改/新增的文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `app/src/services/db.ts` | 修改 | 新增 `is_public` + `showcased` 两列的 DDL |
| `app/src/server.ts` | 修改 | 注册 `/p/:slug` 路由 |
| `app/src/routes/agent.ts` | 修改 | 添加 `GET /p/:slug` + `POST /:id/toggle-public` 路由 |
| `app/views/agent/public.ejs` | **新建** | 公开访问页面的 standalone 模板 |
| `app/views/index.ejs` | 修改 | 添加"精选告白"展示墙版块 |
| `app/src/routes/admin.ts` | 修改 | `toggle-showcase` 路由（需校验 is_public） |
| `app/views/admin/requests.ejs` | 修改 | 推荐按钮根据 is_public 条件渲染 |
| `app/views/admin/review.ejs` | 修改 | completed 区域根据 is_public 显示推荐开关 |
| `app/views/dashboard.ejs` | 修改 | 增加"设为公开/设为私密"按钮 + 公开链接显示 |

---

## 八、SEO & 社交分享

### Open Graph 标签
所有 `/p/:slug` 页面自动生成 OG meta 标签。

### Dashboard 分享文案推荐

用户点击"公开"后，Dashboard 显示公共链接并提示复制：

```
🌐 公开链接：https://ailaopo.online/p/xxx-xxx-xxx
📋 复制分享文案：
💝 我为你制作了一个专属告白页，点击查看：
https://ailaopo.online/p/xxx-xxx-xxx
```

---

## 九、边界情况

| 场景 | 处理方式 |
|------|----------|
| 创建者设为私密后，公开链接 `/p/:slug` | 返回 404 |
| 创建者设为私密后，已展示在首页的作品 | 自动从展示墙移除 (`showcased = false`) |
| 管理员推荐了公开 agent，创建者又切回私密 | toggle-public 路由自动 `showcased = false` |
| 管理员试图推荐私密 agent | 按钮禁用，提示"该页面未公开，无法推荐" |
| Agent 刚完成，HTML 为空 | 404 |
| Agent 被删除 | slug 查找为空，404 |
| 机器人大量爬取 `/p/` | MVP 暂不限制 |

---

## 十、实现顺序

1. **DB 变更**：加 `is_public` + `showcased` 两列
2. **公开路由**：`/p/:slug` 路由 + `public.ejs` 模板（仅 `is_public = true` 可访问）
3. **Dashboard 隐私开关**：`toggle-public` 路由 + dashboard 按钮
4. **首页展示墙**：index.ejs 版块（仅查 `showcased + is_public + completed`）
5. **管理员推荐**：admin 路由 + 条件渲染按钮
6. **验证与部署**
