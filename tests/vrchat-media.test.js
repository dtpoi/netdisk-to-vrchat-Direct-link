import assert from "node:assert/strict";
import test from "node:test";

import { handleVrchatMedia } from "../edge-functions/vrchat/media.mp4.js";

const samples = [
  ["qq", "https://qfile.qq.com/q/xCHsh115ao"],
  ["icloud", "https://www.icloud.com.cn/iclouddrive/0b0TIPcC3ya7V6OEnVk0XlvmQ"],
  ["wenshushu", "https://c.wss.ink/f/kdgrvdy9d3n"],
  ["feishu", "https://ecnof4grbkp0.feishu.cn/file/PL0VbtBkuoMGkPxd8f2cYWw7nFb?from=from_copylink"],
  ["onedrive", "https://1drv.ms/u/s!example?e=demo"],
  ["feijipan", "https://share.feijipan.com/s/example"],
];

function endpoint(shareUrl, password = "") {
  const url = new URL("https://api.dtpoi.cn/vrchat/media.mp4");
  url.searchParams.set("url", shareUrl);
  if (password) url.searchParams.set("pwd", password);
  return url;
}

for (const [expectedType, shareUrl] of samples) {
  test(`redirects a ${expectedType} share with VRChat headers`, async () => {
    let resolvedType;
    const response = await handleVrchatMedia(
      { request: new Request(endpoint(shareUrl)) },
      {
        resolveShareFn: async (share) => {
          resolvedType = share.type;
          return {
            mode: "redirect",
            service: expectedType,
            directUrl: "https://media.example/video.mp4",
          };
        },
      }
    );

    assert.equal(resolvedType, expectedType);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://media.example/video.mp4");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
}

test("forwards a password to the platform resolver", async () => {
  let resolvedPassword;
  await handleVrchatMedia(
    { request: new Request(endpoint(samples[2][1], "7788")) },
    {
      resolveShareFn: async (_share, password) => {
        resolvedPassword = password;
        return { mode: "redirect", directUrl: "https://media.example/video.mp4" };
      },
    }
  );
  assert.equal(resolvedPassword, "7788");
});

test("HEAD keeps proxy metadata while omitting the Feishu body", async () => {
  const response = await handleVrchatMedia(
    { request: new Request(endpoint(samples[3][1]), { method: "HEAD" }) },
    {
      resolveShareFn: async () => ({ mode: "proxy", service: "飞书云盘" }),
      proxyFeishuFn: async () =>
        new Response("x", {
          status: 206,
          headers: {
            "content-type": "video/mp4",
            "content-range": "bytes 0-0/100",
            "accept-ranges": "bytes",
          },
        }),
    }
  );

  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 0-0/100");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(await response.text(), "");
});

test("OPTIONS returns the six-platform CORS preflight response", async () => {
  const response = await handleVrchatMedia({
    request: new Request("https://api.dtpoi.cn/vrchat/media.mp4", {
      method: "OPTIONS",
    }),
  });

  assert.equal(response.status, 204);
  assert.match(response.headers.get("access-control-allow-methods"), /HEAD/);
  assert.match(response.headers.get("access-control-allow-headers"), /Range/);
});

test("rejects unsupported share hosts", async () => {
  const response = await handleVrchatMedia({
    request: new Request(endpoint("https://example.com/video.mp4")),
  });
  assert.equal(response.status, 400);
});
