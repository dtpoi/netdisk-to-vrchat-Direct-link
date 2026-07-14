const QQ_SHARE_ORIGIN = "https://qfile.qq.com";
const QQ_SHARE_PATH_RE = /^\/q\/[A-Za-z0-9]+$/;
const ICLOUD_HOSTS = new Set(["www.icloud.com", "www.icloud.com.cn"]);
const ICLOUD_SHARE_PATH_RE = /^\/iclouddrive\/([A-Za-z0-9_=-]+)$/;
const WENSHUSHU_SHARE_PATH_RE = /^\/f\/([A-Za-z0-9]+)$/;
const WENSHUSHU_HOST_RE = /^(?:[a-z0-9-]+\.)?(?:wss\.ink|wss\.show|wenshushu\.(?:cn|com)|wenxiaozhan\.(?:net|cn|com)|ws\d+\.cn|wss\d+\.cn|wss\.(?:email|cc|pet|zone))$/i;
const KDOCS_HOST_RE = /^(?:[a-z0-9-]+\.)?kdocs\.cn$/i;
const KDOCS_SHARE_PATH_RE = /^\/l\/([A-Za-z0-9_-]+)$/;
const FEISHU_HOST_RE = /^([a-z0-9-]+)\.feishu\.cn$/i;
const FEISHU_SHARE_PATH_RE = /^\/(file|drive\/folder)\/([A-Za-z0-9_-]+)$/;
const ECPAN_HOST = "www.ecpan.cn";
const FILESET_ID_RE = /fileset_id[^a-f0-9]*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
const TITLE_RE = /<title>([^<]*)<\/title>/i;

const QQ_GET_FILE_LIST_API =
  "https://qfile.qq.com/http2rpc/gotrpc/noauth/trpc.file.FileFlashTrans/GetFileList";
const QQ_BATCH_DOWNLOAD_API =
  "https://qfile.qq.com/http2rpc/gotrpc/noauth/trpc.qqntv2.richmedia.InnerProxy/BatchDownload";
const ICLOUD_RESOLVE_API =
  "https://ckdatabasews.icloud.com.cn/database/1/com.apple.cloudkit/production/public/records/resolve";
const WENSHUSHU_API = "https://www.wenshushu.cn/ap/";
const ECPAN_FILE_INFO_API = "https://www.ecpan.cn/drive/fileextoverrid.do";
const ECPAN_DOWNLOAD_API = "https://www.ecpan.cn/drive/sharedownload.do";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const QQ_COMMON_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  cookie: "uin=9000002; p_uin=9000002",
  origin: QQ_SHARE_ORIGIN,
  "user-agent": USER_AGENT,
};
const WENSHUSHU_COMMON_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  origin: "https://www.wenshushu.cn",
  referer: "https://www.wenshushu.cn/",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
};

const FETCH_OPTIONS = {
  eo: {
    timeoutSetting: {
      connectTimeout: 10000,
      readTimeout: 15000,
      writeTimeout: 10000,
    },
  },
};

export function extractShareUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;

  const match = value.match(/https:\/\/[^\s<>"']+/i);
  if (!match) return null;

  const candidate = match[0].replace(/[\])}，。；！？，、]+$/gu, "");
  return candidate.length <= 512 ? candidate : null;
}

export function normalizeShare(value) {
  const extractedUrl = extractShareUrl(value);
  if (!extractedUrl) return null;

  try {
    const url = new URL(extractedUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;

    if (url.origin === QQ_SHARE_ORIGIN && QQ_SHARE_PATH_RE.test(url.pathname)) {
      return {
        type: "qq",
        key: url.pathname.slice(3),
        url: `${QQ_SHARE_ORIGIN}${url.pathname}`,
      };
    }

    const icloudMatch = ICLOUD_SHARE_PATH_RE.exec(url.pathname);
    if (ICLOUD_HOSTS.has(url.hostname) && icloudMatch) {
      return {
        type: "icloud",
        key: icloudMatch[1],
        url: `${url.origin}${url.pathname}`,
      };
    }

    const wenshushuMatch = WENSHUSHU_SHARE_PATH_RE.exec(url.pathname);
    if (WENSHUSHU_HOST_RE.test(url.hostname) && wenshushuMatch) {
      return {
        type: "wenshushu",
        key: wenshushuMatch[1],
        url: `${url.origin}${url.pathname}`,
      };
    }

    const kdocsMatch = KDOCS_SHARE_PATH_RE.exec(url.pathname);
    if (KDOCS_HOST_RE.test(url.hostname) && kdocsMatch) {
      return {
        type: "wps",
        key: kdocsMatch[1],
        url: `https://www.kdocs.cn/l/${kdocsMatch[1]}`,
      };
    }

    const feishuHostMatch = FEISHU_HOST_RE.exec(url.hostname);
    const feishuPathMatch = FEISHU_SHARE_PATH_RE.exec(url.pathname);
    if (feishuHostMatch && feishuPathMatch) {
      return {
        type: "feishu",
        key: feishuPathMatch[2],
        tenant: feishuHostMatch[1],
        isFolder: feishuPathMatch[1] === "drive/folder",
        url: `${url.origin}${url.pathname}`,
      };
    }

    if (url.hostname === ECPAN_HOST) {
      const fragmentQuery = url.hash.includes("?")
        ? url.hash.slice(url.hash.indexOf("?") + 1)
        : "";
      const key = url.searchParams.get("data") || new URLSearchParams(fragmentQuery).get("data");
      if (key && /^[A-Za-z0-9_-]+$/.test(key)) {
        return {
          type: "ecpan",
          key,
          url: `https://www.ecpan.cn/web/#/yunpanProxy?path=%2F%23%2Fdrive%2Foutside&data=${encodeURIComponent(key)}&isShare=1`,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizePassword(value) {
  if (value == null || value === "") return "";
  if (value.length > 64 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value.trim();
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractTitle(html) {
  const title = TITLE_RE.exec(html)?.[1] || "";
  return decodeHtml(title.split("｜", 1)[0].trim());
}

function safeMessage(value, fallback) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.replace(/[<>]/g, "").slice(0, 180);
}

function noIndexHeaders() {
  return {
    "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  };
}

function errorResponse(message, status = 502) {
  const body = JSON.stringify({
    ok: false,
    error: safeMessage(message, "直链解析失败"),
  });

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...noIndexHeaders(),
    },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...noIndexHeaders(),
    },
  });
}

async function fetchJson(url, init, serviceName) {
  const response = await fetch(url, { ...FETCH_OPTIONS, ...init });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${serviceName}接口返回了非 JSON 响应（HTTP ${response.status}）`);
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.msg || `${serviceName}接口请求失败（HTTP ${response.status}）`
    );
  }
  return data;
}

async function postJson(url, body, headers, serviceName) {
  return fetchJson(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
    serviceName
  );
}

function ensureHttpsUrl(value, serviceName) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${serviceName}没有返回有效的 HTTPS 下载地址`);
  }
}

export async function resolveQqsc(shareUrl) {
  const pageResponse = await fetch(shareUrl, {
    ...FETCH_OPTIONS,
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      cookie: QQ_COMMON_HEADERS.cookie,
      "user-agent": QQ_COMMON_HEADERS["user-agent"],
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`QQ 分享页面请求失败（HTTP ${pageResponse.status}）`);
  }

  const html = await pageResponse.text();
  const filesetId = FILESET_ID_RE.exec(html)?.[1];
  const pageTitle = extractTitle(html);
  if (!filesetId) {
    throw new Error("QQ 分享链接无效、已过期，或页面结构已经变化");
  }

  const listData = await postJson(
    QQ_GET_FILE_LIST_API,
    {
      fileset_id: filesetId,
      req_infos: [
        {
          parent_id: "",
          req_depth: 1,
          count: 50,
          filter_condition: { file_category: 0 },
          sort_conditions: [{ sort_field: 0, sort_order: 0 }],
        },
      ],
      support_folder_status: true,
    },
    {
      ...QQ_COMMON_HEADERS,
      referer: shareUrl,
      "x-oidb": JSON.stringify({
        uint32_command: "0x93d4",
        uint32_service_type: "1",
      }),
    },
    "QQ"
  );

  if (listData?.retcode !== 0) {
    throw new Error(listData?.message || "QQ 文件列表获取失败");
  }

  const files = listData?.data?.file_lists?.[0]?.file_list;
  if (!Array.isArray(files)) throw new Error("QQ 响应中没有文件列表");

  const file = files.find(
    (item) => !item?.is_dir && typeof item?.physical?.id === "string"
  );
  if (!file) throw new Error("QQ 分享中没有可直接下载的根目录文件");

  const physicalId = file.physical.id;
  const fileName = file.name || pageTitle || "qqsc-download";
  const downloadData = await postJson(
    QQ_BATCH_DOWNLOAD_API,
    {
      req_head: { agent: 8 },
      download_info: [
        {
          batch_id: physicalId,
          scene: { business_type: 4, app_type: 22, scene_type: 5 },
          index_node: { file_uuid: physicalId },
          url_type: 2,
          download_scene: 0,
        },
      ],
      scene_type: 103,
    },
    {
      ...QQ_COMMON_HEADERS,
      referer: shareUrl,
      "x-oidb": JSON.stringify({
        uint32_command: "0x9248",
        uint32_service_type: "4",
      }),
    },
    "QQ"
  );

  if (downloadData?.retcode !== 0) {
    throw new Error(downloadData?.message || "QQ 下载直链获取失败");
  }

  const directUrl = downloadData?.data?.download_rsp?.[0]?.url;
  if (!directUrl || directUrl.startsWith("&filename=")) {
    throw new Error("QQ 文件不可下载或已被限制");
  }

  const safeUrl = ensureHttpsUrl(directUrl, "QQ");
  const separator = safeUrl.includes("?") ? "&" : "?";
  return `${safeUrl}${separator}filename=${encodeURIComponent(fileName)}`;
}

async function resolveIcloud(key) {
  const data = await postJson(
    ICLOUD_RESOLVE_API,
    { shortGUIDs: [{ value: key }] },
    {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://www.icloud.com.cn",
      referer: "https://www.icloud.com.cn/",
      "user-agent": USER_AGENT,
    },
    "iCloud"
  );

  const result = data?.results?.[0];
  if (result?.error) {
    throw new Error(result.error?.reason || result.error?.message || "iCloud 分享无效或已过期");
  }

  const fields = result?.rootRecord?.fields;
  const template = fields?.fileContent?.value?.downloadURL;
  const title = result?.share?.fields?.["cloudkit.title"]?.value || "icloud-download";
  const extension = fields?.extension?.value;
  if (typeof template !== "string") throw new Error("iCloud 分享中没有可下载文件");

  const fileName = extension ? `${title}.${extension}` : title;
  return ensureHttpsUrl(template.replace("${f}", encodeURIComponent(fileName)), "iCloud");
}

async function resolveWenshushu(key, password) {
  const loginData = await postJson(
    `${WENSHUSHU_API}login/anonymous`,
    { dev_info: "{}" },
    WENSHUSHU_COMMON_HEADERS,
    "文叔叔"
  );
  const token = loginData?.data?.token;
  if (!token) throw new Error("文叔叔匿名访问令牌获取失败");

  const authHeaders = { ...WENSHUSHU_COMMON_HEADERS, "x-token": token };
  const taskData = await postJson(
    `${WENSHUSHU_API}task/mgrtask`,
    { tid: key, password },
    authHeaders,
    "文叔叔"
  );
  const bid = taskData?.data?.boxid;
  const pid = taskData?.data?.ufileid;
  if (!bid || !pid) {
    throw new Error(taskData?.message || taskData?.msg || "文叔叔分享无效、已过期或需要密码");
  }

  const listBody = {
    start: 0,
    sort: { name: "asc" },
    bid,
    pid,
    type: 1,
    options: { uploader: "true" },
    size: 50,
  };
  let files;
  for (const endpoint of ["ufile/list", "ufile/nlist"]) {
    const listData = await postJson(
      `${WENSHUSHU_API}${endpoint}`,
      listBody,
      authHeaders,
      "文叔叔"
    );
    const candidate = listData?.data?.fileList || listData?.data?.filelist;
    if (Array.isArray(candidate) && candidate.length) {
      files = candidate;
      break;
    }
  }
  if (!files) throw new Error("文叔叔分享中没有可下载的根目录文件");

  const file = files.find((item) => item?.fid || item?.ufileid);
  const fileId = file?.fid || file?.ufileid;
  if (!fileId) throw new Error("文叔叔文件信息不完整");

  const signData = await postJson(
    `${WENSHUSHU_API}dl/sign`,
    { consumeCode: 0, type: 1, ufileid: fileId },
    authHeaders,
    "文叔叔"
  );
  const encodedUrl = signData?.data?.url;
  if (typeof encodedUrl !== "string") throw new Error("文叔叔下载签名获取失败");

  let directUrl = encodedUrl;
  try {
    directUrl = decodeURIComponent(encodedUrl);
  } catch {
    // Some responses already contain a decoded URL.
  }
  return ensureHttpsUrl(directUrl, "文叔叔");
}

async function resolveWps(share) {
  const data = await fetchJson(
    `https://www.kdocs.cn/api/office/file/${encodeURIComponent(share.key)}/download`,
    {
      headers: {
        accept: "application/json",
        referer: share.url,
        "user-agent": USER_AGENT,
      },
      redirect: "manual",
    },
    "WPS"
  );
  if (typeof data?.download_url !== "string" || !data.download_url) {
    throw new Error(data?.error || data?.msg || "WPS 没有返回下载直链");
  }
  return ensureHttpsUrl(data.download_url, "WPS");
}

async function resolveEcpan(key, password) {
  const query = new URLSearchParams({
    extractionCode: password,
    chainUrlTemplate:
      "https://www.ecpan.cn/web/#/yunpanProxy?path=%2F%23%2Fdrive%2Foutside",
    parentId: "-1",
    data: key,
  });
  const commonHeaders = {
    accept: "application/json",
    referer: "https://www.ecpan.cn/web/",
    "user-agent": USER_AGENT,
  };
  const infoData = await fetchJson(
    `${ECPAN_FILE_INFO_API}?${query.toString()}`,
    { headers: commonHeaders },
    "移动云云空间"
  );
  const fileInfo = infoData?.var?.chainFileInfo;
  if (fileInfo?.errMesg) throw new Error(fileInfo.errMesg);
  if (!fileInfo?.cloudpFile || !fileInfo?.shareId) {
    throw new Error("移动云分享无效、已过期或提取码错误");
  }

  const downloadData = await postJson(
    ECPAN_DOWNLOAD_API,
    {
      extCodeFlag: 0,
      isIp: 0,
      shareId: Number(fileInfo.shareId),
      groupId: fileInfo.cloudpFile.groupId,
      fileIdList: fileInfo.cloudpFileList,
    },
    { ...commonHeaders, "content-type": "application/json" },
    "移动云云空间"
  );
  const directUrl = downloadData?.var?.downloadUrl;
  if (typeof directUrl !== "string" || !directUrl) {
    throw new Error("移动云没有返回下载直链");
  }
  return ensureHttpsUrl(directUrl, "移动云云空间");
}

function addSetCookiesToJar(rawHeader, jar) {
  if (!rawHeader) return;
  const cookies = rawHeader.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);
  for (const cookie of cookies) {
    const pair = cookie.trim().split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function isFeishuHost(hostname) {
  return /^[a-z0-9-]+\.feishu\.cn$/i.test(hostname);
}

async function createFeishuSession(share) {
  const jar = new Map();
  let currentUrl = share.url;

  for (let index = 0; index < 8; index += 1) {
    const cookies = cookieHeader(jar);
    const response = await fetch(currentUrl, {
      ...FETCH_OPTIONS,
      headers: {
        accept: "text/html,*/*",
        "user-agent": USER_AGENT,
        ...(cookies ? { cookie: cookies } : {}),
      },
      redirect: "manual",
    });
    addSetCookiesToJar(response.headers.get("set-cookie"), jar);

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== "https:" || !isFeishuHost(nextUrl.hostname)) {
        throw new Error("飞书匿名会话跳转到了非预期地址");
      }
      currentUrl = nextUrl.toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`飞书匿名会话获取失败（HTTP ${response.status}）`);
    }
    return cookieHeader(jar);
  }

  throw new Error("飞书匿名会话跳转次数过多");
}

async function firstFeishuFolderFile(share, cookies) {
  const query = new URLSearchParams({
    length: "50",
    asc: "1",
    rank: "5",
    token: share.key,
  });
  for (const type of [0, 2, 22, 44, 3, 30, 8, 11, 12, 84, 123, 124]) {
    query.append("obj_type", String(type));
  }
  const data = await fetchJson(
    `https://${share.tenant}.feishu.cn/space/api/explorer/v3/children/list/?${query}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        cookie: cookies,
        referer: share.url,
        "user-agent": USER_AGENT,
      },
    },
    "飞书"
  );
  if (data?.code !== 0) throw new Error(data?.msg || "飞书文件夹列表获取失败");

  const nodeIds = data?.data?.node_list;
  const nodes = data?.data?.entities?.nodes;
  if (!Array.isArray(nodeIds) || !nodes) throw new Error("飞书文件夹中没有可下载文件");
  for (const nodeId of nodeIds) {
    const node = nodes[nodeId];
    if (node?.type === 12 && node?.obj_token && node.obj_token !== share.key) {
      return node.obj_token;
    }
  }
  throw new Error("飞书文件夹中没有可下载的根目录文件");
}

async function resolveFeishu(share) {
  const cookies = await createFeishuSession(share);
  const fileToken = share.isFolder
    ? await firstFeishuFolderFile(share, cookies)
    : share.key;
  return {
    mode: "proxy",
    service: "飞书云盘",
    upstreamUrl: `https://${share.tenant}.feishu.cn/space/api/box/stream/download/all/${fileToken}`,
    upstreamHeaders: {
      cookie: cookies,
      referer: share.url,
      "user-agent": USER_AGENT,
    },
  };
}

export async function resolveShare(share, password) {
  if (share.type === "qq") {
    return { mode: "redirect", service: "QQ闪传", directUrl: await resolveQqsc(share.url) };
  }
  if (share.type === "icloud") {
    return { mode: "redirect", service: "iCloud", directUrl: await resolveIcloud(share.key) };
  }
  if (share.type === "wenshushu") {
    return {
      mode: "redirect",
      service: "文叔叔",
      directUrl: await resolveWenshushu(share.key, password),
    };
  }
  if (share.type === "wps") {
    return { mode: "redirect", service: "WPS云文档", directUrl: await resolveWps(share) };
  }
  if (share.type === "ecpan") {
    return {
      mode: "redirect",
      service: "移动云云空间",
      directUrl: await resolveEcpan(share.key, password),
    };
  }
  return resolveFeishu(share);
}

function buildSmartUrl(requestUrl, share, password) {
  const smartUrl = new URL("/do", requestUrl.origin);
  smartUrl.searchParams.set("url", share.url);
  if (password) smartUrl.searchParams.set("pwd", password);
  return smartUrl.toString();
}

export async function proxyFeishu(result, request) {
  const headers = { ...result.upstreamHeaders };
  const range = request.headers.get("range");
  if (range) headers.range = range;

  const upstream = await fetch(result.upstreamUrl, {
    ...FETCH_OPTIONS,
    headers,
    redirect: "manual",
  });
  if (!upstream.ok && upstream.status !== 206) {
    return errorResponse(`飞书文件下载失败（HTTP ${upstream.status}）`, 502);
  }

  const responseHeaders = {
    "cache-control": "private, no-store",
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
    ...noIndexHeaders(),
  };
  for (const name of [
    "accept-ranges",
    "content-disposition",
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const share = normalizeShare(requestUrl.searchParams.get("url"));
  if (!share) {
    return errorResponse(
      "请输入有效的 QQ闪传、iCloud、文叔叔、飞书、WPS 或移动云分享链接",
      400
    );
  }
  const password = normalizePassword(requestUrl.searchParams.get("pwd"));
  if (password == null) return errorResponse("提取码格式无效", 400);

  try {
    const result = await resolveShare(share, password);
    if (requestUrl.searchParams.get("format") === "json") {
      const directUrl =
        result.mode === "proxy"
          ? buildSmartUrl(requestUrl, share, password)
          : result.directUrl;
      return jsonResponse({
        ok: true,
        service: result.service,
        directUrl,
        transport: result.mode === "proxy" ? "edge-stream" : "redirect",
      });
    }
    if (result.mode === "proxy") return proxyFeishu(result, request);

    return new Response(null, {
      status: 302,
      headers: {
        location: result.directUrl,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        ...noIndexHeaders(),
      },
    });
  } catch (error) {
    return errorResponse(error?.message, 502);
  }
}

export default async function onRequest(context) {
  if (context.request.method !== "GET") {
    return errorResponse("仅支持 GET 请求", 405);
  }
  return onRequestGet(context);
}
