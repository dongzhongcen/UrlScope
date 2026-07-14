const DEFAULT_API_BASE = "https://urlscope-api.your-subdomain.workers.dev";
const apiBase = localStorage.getItem("urlscope_api_base") || DEFAULT_API_BASE;

const form = document.querySelector("#check-form");
const input = document.querySelector("#target-url");
const resultArea = document.querySelector("#result-area");
const apiLabel = document.querySelector("#api-base-label");
const submitButton = form.querySelector("button[type='submit']");

apiLabel.textContent = apiBase;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rawUrl = input.value.trim();
  if (!rawUrl) {
    renderError("请输入要查询的网址。");
    return;
  }

  setLoading(true);
  renderLoading();

  try {
    const endpoint = new URL("/api/check", apiBase);
    endpoint.searchParams.set("url", rawUrl);

    const response = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "查询失败，请稍后再试。");
    }

    renderResult(payload);
  } catch (error) {
    renderError(error.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.lastChild.textContent = isLoading ? "查询中" : "查询";
}

function renderLoading() {
  resultArea.innerHTML = `
    <div class="skeleton" aria-label="正在加载">
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  `;
}

function renderError(message) {
  resultArea.innerHTML = `
    <div class="error-box">
      <strong>查询没有完成</strong>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

function renderResult(data) {
  const metrics = [
    ["状态码", data.status ?? "未返回"],
    ["耗时", data.timingMs ? `${data.timingMs} ms` : "未知"],
    ["服务器", data.headers?.server || "未公开"],
    ["内容类型", data.headers?.contentType || "未知"]
  ];

  const details = [
    ["页面标题", data.title || "未检测到"],
    ["最终地址", data.finalUrl || data.url],
    ["重定向", data.redirected ? "是" : "否"],
    ["DNS A 记录", formatDns(data.dns?.A)],
    ["DNS AAAA 记录", formatDns(data.dns?.AAAA)]
  ];

  resultArea.innerHTML = `
    <div class="result-header">
      <p class="eyebrow">查询结果</p>
      <h2>${escapeHtml(data.hostname || data.url)}</h2>
      <p class="result-url">${escapeHtml(data.url)}</p>
    </div>

    <div class="metric-grid">
      ${metrics
        .map(
          ([label, value]) => `
            <div class="metric">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(String(value))}</strong>
            </div>
          `
        )
        .join("")}
    </div>

    <dl class="detail-list">
      ${details
        .map(
          ([label, value]) => `
            <div class="detail-row">
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

function formatDns(records = []) {
  if (!records.length) {
    return "未查询到";
  }

  return records.map((record) => record.data).join(", ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}
