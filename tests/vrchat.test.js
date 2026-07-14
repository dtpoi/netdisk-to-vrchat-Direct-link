import assert from "node:assert/strict";
import test from "node:test";

import { handleVrchatRequest } from "../edge-functions/vrchat/qq/[file].js";

const endpoint = "https://api.dtpoi.cn/vrchat/qq/xCHsh115ao.mp4";
const directUrl = "https://multimedia.qfile.qq.com/download?fileid=test&filename=video.mp4";

async function mockResolver(shareUrl) {
  assert.equal(shareUrl, "https://qfile.qq.com/q/xCHsh115ao");
  return directUrl;
}

for (const method of ["GET", "HEAD"]) {
  test(`${method} returns the resolved QQ redirect with VRChat headers`, async () => {
    const response = await handleVrchatRequest(
      { request: new Request(endpoint, { method }) },
      mockResolver
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), directUrl);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.match(response.headers.get("access-control-allow-methods"), /HEAD/);
    assert.equal(await response.text(), "");
  });
}

test("OPTIONS returns a CORS preflight response without resolving", async () => {
  const response = await handleVrchatRequest(
    { request: new Request(endpoint, { method: "OPTIONS" }) },
    () => {
      throw new Error("resolver must not be called");
    }
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-headers"), "Range");
});

test("rejects paths without the mp4 suffix", async () => {
  const response = await handleVrchatRequest(
    { request: new Request("https://api.dtpoi.cn/vrchat/qq/xCHsh115ao") },
    mockResolver
  );

  assert.equal(response.status, 400);
});

test("rejects unsupported methods", async () => {
  const response = await handleVrchatRequest({
    request: new Request(endpoint, { method: "POST" }),
  });

  assert.equal(response.status, 405);
  assert.match(response.headers.get("access-control-allow-methods"), /GET/);
});
