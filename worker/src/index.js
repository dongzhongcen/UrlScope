const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const MAX_TITLE_BYTES = 120000;

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const corsHeaders = getCorsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (requestUrl.pathname === "/api/check") {
      return handleCheck(requestUrl, corsHeaders);
    }

    return json({ error: "Not found" }, 404, corsHeaders);
  }
};

async function handleCheck(requestUrl, corsHeaders) {
  const input = requestUrl.searchParams.get("url");

  if (!input) {
    return json({ error: "缺少 url 参数。" }, 400, corsHeaders);
  }

  let target;
  try {
    target = normalizeUrl(input);
  } catch (error) {
    return json({ error: error.message }, 400, corsHeaders);
  }

  const startedAt = Date.now();

  try {
    const [siteResult, dns] = await Promise.all([
      inspectHttp(target),
      inspectDns(target.hostname)
    ]);

    return json(
      {
        url: target.toString(),
        hostname: target.hostname,
        timingMs: Date.now() - startedAt,
        dns,
        ...siteResult
      },
      200,
      corsHeaders
    );
  } catch (error) {
    return json(
      {
        error: "目标网站查询失败。",
        detail: error.message,
        url: target.toString(),
        hostname: target.hostname,
        timingMs: Date.now() - startedAt
      },
      502,
      corsHeaders
    );
  }
}

function normalizeUrl(input) {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const target = new URL(withProtocol);

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("只支持 http 或 https 地址。");
  }

  if (!target.hostname || target.hostname.length > 253) {
    throw new Error("网址格式不正确。");
  }

  target.hash = "";
  return target;
}

async function inspectHttp(target) {
  let response = await fetch(target.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "UrlScope/0.1 (+https://urlscope.pages.dev)"
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const title = contentType.includes("text/html") ? await readTitle(response) : null;

  return {
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    redirected: response.redirected,
    title,
    headers: {
      contentType,
      server: response.headers.get("server"),
      cacheControl: response.headers.get("cache-control"),
      xPoweredBy: response.headers.get("x-powered-by")
    }
  };
}

async function readTitle(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    return null;
  }

  const chunks = [];
  let received = 0;

  while (received < MAX_TITLE_BYTES) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    chunks.push(value);
    received += value.byteLength;
  }

  try {
    const buffer = concatChunks(chunks, received);
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? decodeEntities(match[1].replace(/\s+/g, " ").trim()).slice(0, 180) : null;
  } catch {
    return null;
  }
}

function concatChunks(chunks, totalLength) {
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

async function inspectDns(hostname) {
  const [aRecords, aaaaRecords] = await Promise.all([
    queryDns(hostname, "A"),
    queryDns(hostname, "AAAA")
  ]);

  return {
    A: aRecords,
    AAAA: aaaaRecords
  };
}

async function queryDns(name, type) {
  const url = new URL(DNS_ENDPOINT);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/dns-json" }
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return (payload.Answer || [])
    .filter((record) => record.type === dnsTypeCode(type))
    .map((record) => ({
      name: record.name,
      ttl: record.TTL,
      data: record.data
    }));
}

function dnsTypeCode(type) {
  return type === "AAAA" ? 28 : 1;
}

function decodeEntities(value) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };

  return value.replace(/&([a-z]+);/gi, (_, key) => entities[key.toLowerCase()] || `&${key};`);
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept"
  };
}
