import {
  normalizePassword,
  normalizeShare,
  proxyFeishu,
  resolveShare,
} from "../do.js";

const VRCHAT_MEDIA_PATH = "/vrchat/media.mp4";

function vrchatHeaders(headers = new Headers()) {
  const result = new Headers(headers);
  result.set("access-control-allow-origin", "*");
  result.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  result.set("access-control-allow-headers", "Range, Content-Type");
  result.set(
    "access-control-expose-headers",
    "Location, Content-Length, Content-Range, Accept-Ranges, Content-Disposition"
  );
  result.set("cache-control", "no-store");
  result.set(
    "x-robots-tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex"
  );
  return result;
}

function errorResponse(message, status) {
  return new Response(
    JSON.stringify({
      ok: false,
      error:
        typeof message === "string" && message.trim()
          ? message.replace(/[<>]/g, "").slice(0, 180)
          : "VRChat 直链解析失败",
    }),
    {
      status,
      headers: vrchatHeaders(
        new Headers({
          "content-type": "application/json; charset=utf-8",
          "x-content-type-options": "nosniff",
        })
      ),
    }
  );
}

function withVrchatHeaders(response, isHead = false) {
  return new Response(isHead ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: vrchatHeaders(response.headers),
  });
}

export async function handleVrchatMedia(
  { request },
  dependencies = {}
) {
  const normalizeShareFn = dependencies.normalizeShareFn || normalizeShare;
  const normalizePasswordFn = dependencies.normalizePasswordFn || normalizePassword;
  const resolveShareFn = dependencies.resolveShareFn || resolveShare;
  const proxyFeishuFn = dependencies.proxyFeishuFn || proxyFeishu;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: vrchatHeaders(
        new Headers({ "access-control-max-age": "86400" })
      ),
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse("仅支持 GET、HEAD 和 OPTIONS 请求", 405);
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.pathname !== VRCHAT_MEDIA_PATH) {
    return errorResponse("VRChat 地址格式无效", 400);
  }

  const share = normalizeShareFn(requestUrl.searchParams.get("url"));
  if (!share) {
    return errorResponse("请输入有效的六平台分享链接", 400);
  }

  const password = normalizePasswordFn(requestUrl.searchParams.get("pwd"));
  if (password == null) return errorResponse("提取码格式无效", 400);

  try {
    const result = await resolveShareFn(share, password);
    if (result.mode === "proxy") {
      const response = await proxyFeishuFn(result, request);
      return withVrchatHeaders(response, request.method === "HEAD");
    }

    return new Response(null, {
      status: 302,
      headers: vrchatHeaders(
        new Headers({
          location: result.directUrl,
          "referrer-policy": "no-referrer",
        })
      ),
    });
  } catch (error) {
    return errorResponse(error?.message, 502);
  }
}

export default async function onRequest(context) {
  return handleVrchatMedia(context);
}
