# UrlScope

<p align="center">
  <img alt="JavaScript" src="https://img.shields.io/badge/javascript-ES%20modules-yellow">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/cloudflare-workers-f38020">
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/cloudflare-pages-f38020">
  <img alt="Wrangler" src="https://img.shields.io/badge/wrangler-4.x-orange">
  <img alt="GSAP" src="https://img.shields.io/badge/gsap-3.x-88ce02">
</p>

UrlScope 是一个前后端分离的 Cloudflare 网站探测项目。用户在页面输入目标网址后，由 Cloudflare Pages Functions 代理到 Cloudflare Worker，Worker 查询目标网站的 HTTP 状态、关键响应头、DNS 记录和页面标题，并把整理后的结果返回给前端展示。项目目前实现了静态前端、Pages Functions 代理和 Worker 查询 API。

## 功能特性

- **网址规范化**：只支持 http / https，未写协议时自动补全 `https://`，并去掉 URL 中的 hash。
- **HTTP 探测**：跟随重定向请求目标站，返回状态码、最终地址、是否发生重定向。
- **响应头摘要**：提取 `content-type`、`server`、`cache-control`、`x-powered-by`。
- **页面标题**：对 HTML 响应最多读取约 120 KB 内容，解析 `<title>` 并解码常见 HTML 实体。
- **DNS 查询**：通过 Cloudflare DNS over HTTPS 查询 A 和 AAAA 记录（名称、TTL、数据）。
- **同域代理**：前端只请求同域 `/api/check`，由 `functions/api/check.js` 转发到 Worker，并处理空响应、非 JSON 响应和代理失败。
- **CORS 控制**：Worker 通过 `ALLOWED_ORIGIN` 设置允许的来源，默认 `*`。
- **前端动效**：通过 CDN 引入 GSAP 和 ScrollTrigger 实现入场和滚动动画。

## 项目结构

```text
.
├── functions/api/check.js   # Pages Functions：把 /api/check 代理到 Worker
├── pages/                   # Cloudflare Pages 静态前端
│   ├── index.html
│   ├── script.js            # 表单提交、结果渲染、GSAP 动效
│   ├── style.css
│   ├── _headers             # 安全响应头
│   └── assets/
├── worker/                  # Cloudflare Worker API
│   ├── src/index.js         # /api/check：HTTP、响应头、DNS、标题查询
│   ├── wrangler.toml
│   └── package.json
└── package.json             # 根目录 wrangler 脚本
```

## 快速开始

### 环境要求

- Node.js 与 npm（用于安装和运行 Wrangler 4）
- Cloudflare 账号（部署时需要）

### 安装依赖

```bash
npm install
```

### 本地预览

启动 Worker：

```bash
npm run worker:dev
```

启动 Pages（含 Pages Functions）：

```bash
npm run pages:preview
```

如果本地直接打开 `pages/index.html`，不会有 Pages Functions 代理；需要用 Cloudflare Pages 预览或线上环境测试完整链路。

### 部署

1. 先部署 Worker：

```bash
npm run worker:deploy
```

2. 复制 Worker 的线上地址。
3. 在 Cloudflare Pages 项目中添加环境变量（必填，否则 `/api/check` 会返回 `Server proxy is not configured.`）：

```text
URLSCOPE_WORKER_API_BASE=https://你的-worker.workers.dev
```

4. 再部署 Pages：

```bash
npm run pages:deploy
```

### Worker 环境变量

可以给 Worker 配置 `ALLOWED_ORIGIN`，把 CORS 限制到你的 Pages 域名，例如 `https://urlscope.pages.dev`：

```bash
wrangler secret put ALLOWED_ORIGIN --config worker/wrangler.toml
```

## 当前状态

项目已完成网址探测的完整链路：静态前端、Pages Functions 代理和 Worker 查询 API。后续可继续完善：

- 在 Worker 中拦截 localhost、内网 IP 等地址，防止 SSRF
- 增加请求超时控制
- 增加 `package-lock.json` 和 `.gitignore`，固定依赖版本并排除 `node_modules/`、`.wrangler/` 等本地文件
- 展示更多响应头和 DNS 记录类型
- 为 Worker 和代理逻辑增加测试
