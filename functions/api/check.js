const DEFAULT_WORKER_API_BASE = "https://urlscope-api.xiangdongshe565.workers.dev";

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return json({ error: "缺少 url 参数。" }, 400);
  }

  const workerApiBase = context.env.URLSCOPE_WORKER_API_BASE || DEFAULT_WORKER_API_BASE;
  const upstreamUrl = new URL("/api/check", workerApiBase);
  upstreamUrl.searchParams.set("url", target);

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: { Accept: "application/json" }
    });
    const payload = await response.text();

    return new Response(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return json({ error: "代理查询失败。", detail: error.message }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS"
    }
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
