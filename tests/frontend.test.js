import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [html, css, script, readme] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("assets/style.css", root), "utf8"),
  readFile(new URL("assets/app.js", root), "utf8"),
  readFile(new URL("README.md", root), "utf8"),
]);

test("uses the Cho Kaguya-hime palette and a local triangle pattern", () => {
  for (const color of ["#ff635d", "#00c0c3", "#ffe48f", "#282828"]) {
    assert.match(css, new RegExp(color, "i"));
  }
  assert.match(css, /data:image\/svg\+xml/);
  assert.doesNotMatch(css, /cho-kaguyahime\.com\/assets/i);
});

test("provides an accessible animated back-to-top control", () => {
  assert.match(html, /id="back-to-top"/);
  assert.match(html, /aria-label="回到顶部"/);
  assert.match(css, /\.back-to-top\.is-visible/);
  assert.match(script, /window\.scrollTo/);
  assert.match(script, /reducedMotion\.matches/);
});

test("credits the parser and palette references and includes feedback mail", () => {
  for (const content of [html, readme]) {
    assert.match(content, /qaiu\/netdisk-fast-download/);
    assert.match(content, /cho-kaguyahime\.com/);
    assert.match(content, /dtpoi@foxmail\.com/);
  }
});
