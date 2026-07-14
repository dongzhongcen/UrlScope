export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return json({ error: "Missing url parameter." }, 400);
  }

  const workerApiBase = context.env.URLSCOPE_WORKER_API_BASE;
  if (!workerApiBase) {
    return json(
      {
        error: "Server proxy is not configured.",
        detail: "Set URLSCOPE_WORKER_API_BASE in Cloudflare Pages environment variables."
      },
      500
    );
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL("/api/check", workerApiBase);
    upstreamUrl.searchParams.set("url", target);
  } catch {
    return json({ error: "URLSCOPE_WORKER_API_BASE is not a valid URL." }, 500);
  }

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: { Accept: "application/json" }
    });
    const text = await response.text();

    if (!text.trim()) {
      return json(
        {
          error: "Worker returned an empty response.",
          status: response.status
        },
        502
      );
    }

    try {
      const payload = JSON.parse(text);
      return json(payload, response.status);
    } catch {
      return json(
        {
          error: "Worker returned a non-JSON response.",
          status: response.status,
          preview: text.slice(0, 240)
        },
        502
      );
    }
  } catch (error) {
    return json({ error: "Proxy request failed.", detail: error.message }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
      "Cache-Control": "no-store"
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
