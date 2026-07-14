import { resolveQqsc } from "../../do.js";

const QQ_VRCHAT_PATH_RE = /^\/vrchat\/qq\/([A-Za-z0-9]+)\.mp4$/i;

function vrchatHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "Range",
    "access-control-expose-headers": "Location",
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    ...extra,
  };
}

function errorResponse(message, status) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: vrchatHeaders({
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    }),
  });
}

export async function handleVrchatRequest({ request }, resolver = resolveQqsc) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: vrchatHeaders({ "access-control-max-age": "86400" }),
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse("仅支持 GET、HEAD 和 OPTIONS 请求", 405);
  }

  const requestUrl = new URL(request.url);
  const match = QQ_VRCHAT_PATH_RE.exec(requestUrl.pathname);
  if (!match) {
    return errorResponse("VRChat 地址格式无效", 400);
  }

  const shareUrl = `https://qfile.qq.com/q/${match[1]}`;
  try {
    const directUrl = await resolver(shareUrl);
    return new Response(null, {
      status: 302,
      headers: vrchatHeaders({
        location: directUrl,
        "referrer-policy": "no-referrer",
      }),
    });
  } catch (error) {
    const message =
      typeof error?.message === "string" && error.message.trim()
        ? error.message.replace(/[<>]/g, "").slice(0, 180)
        : "QQ 直链解析失败";
    return errorResponse(message, 502);
  }
}

export default async function onRequest(context) {
  return handleVrchatRequest(context);
}
