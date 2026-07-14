# UrlScope

一个前后端分离的 Cloudflare 项目：

- `pages/`：Cloudflare Pages 静态前端，负责输入网址和展示查询结果。
- `worker/`：Cloudflare Worker API，负责查询目标网站的 HTTP、Header、DNS 和页面标题信息。

## 本地预览

安装依赖：

```bash
npm install
```

启动 Worker：

```bash
npm run worker:dev
```

启动 Pages：

```bash
npm run pages:preview
```

前端默认只请求同域接口 `/api/check`，由 Cloudflare Pages Functions 代理到 Worker。

如果本地只打开 `pages/index.html`，不会有 Pages Functions 代理；需要用 Cloudflare Pages 预览或线上环境测试完整链路。

Pages Functions 的代理文件在：

```text
functions/api/check.js
```

## 部署顺序

1. 先部署 Worker：

```bash
npm run worker:deploy
```

2. 复制 Worker 的线上地址。
3. 在 Cloudflare Pages 项目里添加环境变量：

```text
URLSCOPE_WORKER_API_BASE=https://你的-worker.workers.dev
```

4. 再部署 Pages：

```bash
npm run pages:deploy
```

## Worker 环境变量

可以给 Worker 配置 `ALLOWED_ORIGIN`，把 CORS 限制到你的 Pages 域名：

```bash
wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
```

例如值为：

```text
https://urlscope.pages.dev
```
