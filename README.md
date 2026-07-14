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

默认前端会请求 `https://urlscope-api.your-subdomain.workers.dev`。本地测试时，可以在浏览器控制台设置：

```js
localStorage.setItem("urlscope_api_base", "http://127.0.0.1:8787");
location.reload();
```

## 部署顺序

1. 先部署 Worker：

```bash
npm run worker:deploy
```

2. 复制 Worker 的线上地址。
3. 修改 `pages/script.js` 里的 `DEFAULT_API_BASE`。
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
