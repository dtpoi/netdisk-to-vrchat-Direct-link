import assert from "node:assert/strict";
import test from "node:test";

import {
  encryptFeijipanValue,
  extractShareUrl,
  normalizeShare,
  onRequestGet,
  resolveFeijipan,
  resolveOneDrive,
} from "../edge-functions/do.js";

test("rejects a non-qfile URL", async () => {
  const response = await onRequestGet({
    request: new Request("https://api.example.com/do?url=https://example.com/file"),
  });

  assert.equal(response.status, 400);
  assert.match(await response.text(), /有效的/);
});

test("rejects malformed qfile paths", async () => {
  const response = await onRequestGet({
    request: new Request(
      "https://api.example.com/do?url=https%3A%2F%2Fqfile.qq.com%2Fevil%2Fabc"
    ),
  });

  assert.equal(response.status, 400);
});

test("normalizes supported QQ, iCloud, and Wenshushu links", () => {
  assert.deepEqual(normalizeShare("https://qfile.qq.com/q/xCHsh115ao?from=share"), {
    type: "qq",
    key: "xCHsh115ao",
    url: "https://qfile.qq.com/q/xCHsh115ao",
  });
  assert.deepEqual(
    normalizeShare(
      "https://www.icloud.com.cn/iclouddrive/0b0TIPcC3ya7V6OEnVk0XlvmQ#file"
    ),
    {
      type: "icloud",
      key: "0b0TIPcC3ya7V6OEnVk0XlvmQ",
      url: "https://www.icloud.com.cn/iclouddrive/0b0TIPcC3ya7V6OEnVk0XlvmQ",
    }
  );
  assert.deepEqual(normalizeShare("https://c.wss.ink/f/kdg62lepgkl"), {
    type: "wenshushu",
    key: "kdg62lepgkl",
    url: "https://c.wss.ink/f/kdg62lepgkl",
  });
  assert.deepEqual(normalizeShare("https://1drv.ms/u/s!example?e=demo"), {
    type: "onedrive",
    url: "https://1drv.ms/u/s!example?e=demo",
  });
  assert.deepEqual(
    normalizeShare("https://kcncuknojm60.feishu.cn/file/VnCxbt35KoowKoxldO3c3C7VnMc"),
    {
      type: "feishu",
      key: "VnCxbt35KoowKoxldO3c3C7VnMc",
      tenant: "kcncuknojm60",
      isFolder: false,
      url: "https://kcncuknojm60.feishu.cn/file/VnCxbt35KoowKoxldO3c3C7VnMc",
    }
  );
  assert.deepEqual(
    normalizeShare("https://share.feijipan.com/s/demoKey"),
    {
      type: "feijipan",
      key: "demoKey",
      url: "https://share.feijipan.com/s/demoKey",
    }
  );
});

test("rejects lookalike and insecure share hosts", () => {
  assert.equal(normalizeShare("http://qfile.qq.com/q/xCHsh115ao"), null);
  assert.equal(normalizeShare("https://qfile.qq.com.example/q/xCHsh115ao"), null);
  assert.equal(normalizeShare("https://evilwss.ink.example/f/kdg62lepgkl"), null);
  assert.equal(normalizeShare("https://1drv.ms.example/u/s!example"), null);
  assert.equal(normalizeShare("https://share.feijipan.com.example/s/demoKey"), null);
});

test("matches the Feijipan AES-ECB values used by the reference parser", async () => {
  assert.equal(
    await encryptFeijipanValue("1720944000000"),
    "43b15c9c473116618bf1b077ae29fabd"
  );
  assert.equal(
    await encryptFeijipanValue("12345|67890"),
    "1fc809c13e4aafdf4a55d84982dfc8dc"
  );
});

test("resolves a OneDrive short share through the Badger content API", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    calls.push(url.toString());
    if (url.hostname === "1drv.ms") {
      return new Response(null, {
        status: 301,
        headers: {
          location:
            "https://onedrive.live.com/:u:/g/personal/ABC/ITEM?resid=ABC!123&migratedtospo=true&redeem=cmVkZWVt",
        },
      });
    }
    if (url.hostname === "onedrive.live.com") {
      return new Response(null, {
        status: 302,
        headers: { "set-cookie": "BadgerAuth=test-token; Path=/; Secure" },
      });
    }
    if (url.hostname === "my.microsoftpersonalcontent.com") {
      return Response.json({
        name: "video.mp4",
        "@content.downloadUrl": "https://media.example/onedrive/video.mp4",
      });
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  try {
    assert.equal(
      await resolveOneDrive({ type: "onedrive", url: "https://1drv.ms/u/s!example?e=demo" }),
      "https://media.example/onedrive/video.mp4"
    );
    assert.equal(calls.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolves a guest Feijipan file through its redirect API", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    calls.push(url);
    if (url.pathname.endsWith("/buy/vip/list")) return Response.json({ code: 200 });
    if (url.pathname.endsWith("/recommend/list")) {
      return Response.json({
        code: 200,
        list: [
          {
            fileIds: "98765",
            userId: null,
            fileList: [{ fileId: "98765", fileType: 1, fileSize: 204800 }],
          },
        ],
      });
    }
    if (url.pathname.endsWith("/file/redirect")) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://media.example/feijipan/video.mp4" },
      });
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  try {
    assert.equal(
      await resolveFeijipan(
        { type: "feijipan", key: "demoKey", url: "https://share.feijipan.com/s/demoKey" },
        "7788"
      ),
      "https://media.example/feijipan/video.mp4"
    );
    assert.equal(calls.length, 3);
    assert.equal(calls[1].searchParams.get("code"), "7788");
    assert.equal(calls[2].searchParams.get("shareId"), "demoKey");
    assert.notEqual(calls[2].searchParams.get("downloadId"), "98765|null");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("extracts a clean share URL from a complete sharing message", () => {
  const message = `蛋挞poi通过QQ闪传分享了【Chou-Kaguya-hime_final.mp4】
链接：https://qfile.qq.com/q/xCHsh115ao`;

  assert.equal(extractShareUrl(message), "https://qfile.qq.com/q/xCHsh115ao");
  assert.deepEqual(normalizeShare(message), {
    type: "qq",
    key: "xCHsh115ao",
    url: "https://qfile.qq.com/q/xCHsh115ao",
  });
});

test("trims common punctuation after a pasted share URL", () => {
  assert.equal(
    extractShareUrl("分享链接：https://c.wss.ink/f/kdgrvdy9d3n。"),
    "https://c.wss.ink/f/kdgrvdy9d3n"
  );
});
