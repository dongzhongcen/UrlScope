const apiBase = window.location.origin;

const form = document.querySelector("#check-form");
const input = document.querySelector("#target-url");
const resultArea = document.querySelector("#result-area");
const submitButton = form.querySelector("button[type='submit']");

window.addEventListener("load", () => {
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    bootMotion();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const rawUrl = input.value.trim();
  if (!rawUrl) {
    renderError("Please enter a target URL.");
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
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || "Query failed.");
    }

    renderResult(payload);
  } catch (error) {
    renderError(error.message);
  } finally {
    setLoading(false);
  }
});

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    return {
      error: `Empty response from /api/check. HTTP ${response.status}.`
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: "Non-JSON response from /api/check.",
      detail: text.slice(0, 240)
    };
  }
}

function bootMotion() {
  gsap.from(".topbar", {
    y: -24,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  });

  gsap.from(".hero-copy > *", {
    y: 36,
    opacity: 0,
    duration: 0.9,
    stagger: 0.08,
    ease: "power3.out"
  });

  gsap.from(".hero-terminal", {
    scale: 0.86,
    opacity: 0,
    duration: 1.1,
    ease: "power3.out"
  });

  gsap.utils.toArray(".stack-card").forEach((card, index) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: "top 82%",
        end: "bottom 40%",
        scrub: true
      },
      y: 80 + index * 22,
      scale: 0.92,
      opacity: 0.35,
      ease: "none"
    });
  });

  gsap.utils.toArray(".accord").forEach((card) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: "top 92%",
        end: "bottom 56%",
        scrub: true
      },
      opacity: 0.2,
      scale: 0.84,
      ease: "none"
    });
  });
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.lastChild.textContent = isLoading ? "Querying" : "查询";
}

function renderLoading() {
  resultArea.innerHTML = `
    <div class="skeleton" aria-label="Loading">
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
    ["Status", data.status ?? "No response"],
    ["Latency", data.timingMs ? `${data.timingMs} ms` : "Unknown"],
    ["Server", data.headers?.server || "Hidden"],
    ["Content-Type", data.headers?.contentType || "Unknown"]
  ];

  const details = [
    ["Title", data.title || "Not detected"],
    ["Final URL", data.finalUrl || data.url],
    ["Redirected", data.redirected ? "Yes" : "No"],
    ["DNS A", formatDns(data.dns?.A)],
    ["DNS AAAA", formatDns(data.dns?.AAAA)]
  ];

  resultArea.innerHTML = `
    <div class="result-header">
      <p class="eyebrow">QUERY RESULT</p>
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
    return "No records";
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
