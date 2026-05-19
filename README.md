# Pier

**Pier** is an AI-powered web application that creates personalized, private love confession pages. Users submit their ideas, and AI agents automatically develop custom HTML pages — from heartfelt letters to interactive games — each uniquely crafted for that special someone.

---

## 🎯 What is Pier?

**English:** Pier is a demonstration project where users can request custom love-themed web pages. Submit your ideas (style, theme, special messages), and after admin review, our AI agent builds a unique, private page. Share the secret link with your partner — only the two of you can see it.

**中文：** Pier 是一个展示项目，用户可以在这里提交自定义告白页面的需求。描述你想要的风格、主题和寄语，管理员审核通过后，AI 会自动为你打造专属页面。生成私密链接分享给另一半，只有你们两人可以查看。

---

## ✨ Features

- **Submit Requests** — Describe your dream love page in plain language
- **AI Development** — AI agents build custom HTML pages based on your description
- **Admin Review** — Full review workflow: approve, reject, request changes
- **Private Sharing** — Share with exactly one person via email
- **Interactive Games** — Includes built-in games like the Spaceshooter game
- **Mobile Responsive** — Works on desktop and mobile devices

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Frontend:** EJS templates, vanilla CSS
- **Deployment:** Docker, GitHub Actions
- **Dev API:** Bearer-token secured API for AI agent integration

---

## ⚙️ Development

```bash
# Install dependencies
cd app && npm install

# Run locally
npm run dev

# Build TypeScript
npm run build
```

Environment variables (set in `.env` or GitHub Secrets):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption secret |
| `DEV_API_KEY` | Bearer token for AI dev API |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email sending config |
| `ADMIN_EMAIL` | Admin notification email |

---

## 🚀 Deployment

1. Push to `master` → auto-deploys to test environment
2. Verify on test domain
3. Update `PROD_VERSION` → push → auto-deploys to production

---

## 📄 License

MIT
