import assert from "node:assert/strict";
import test from "node:test";

import { extractShareUrl, normalizeShare, onRequestGet } from "../edge-functions/do.js";

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
  assert.deepEqual(normalizeShare("https://www.kdocs.cn/l/ck0azivLlDi3"), {
    type: "wps",
    key: "ck0azivLlDi3",
    url: "https://www.kdocs.cn/l/ck0azivLlDi3",
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
    normalizeShare(
      "https://www.ecpan.cn/web/#/yunpanProxy?path=%2F%23%2Fdrive%2Foutside&data=81027a5c99af5b11ca004966c945cce6W9Bf2&isShare=1"
    ),
    {
      type: "ecpan",
      key: "81027a5c99af5b11ca004966c945cce6W9Bf2",
      url: "https://www.ecpan.cn/web/#/yunpanProxy?path=%2F%23%2Fdrive%2Foutside&data=81027a5c99af5b11ca004966c945cce6W9Bf2&isShare=1",
    }
  );
});

test("rejects lookalike and insecure share hosts", () => {
  assert.equal(normalizeShare("http://qfile.qq.com/q/xCHsh115ao"), null);
  assert.equal(normalizeShare("https://qfile.qq.com.example/q/xCHsh115ao"), null);
  assert.equal(normalizeShare("https://evilwss.ink.example/f/kdg62lepgkl"), null);
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
