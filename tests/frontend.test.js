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
  assert.match(css, /--paper:\s*#f4f4f0;/);
  assert.doesNotMatch(css, /#ead7ee/i);
  assert.doesNotMatch(css, /#cbc4f8/i);
  assert.match(css, /rgba\(244, 244, 240, 0\.86\)/);
  assert.doesNotMatch(css, /203, 196, 248|245, 186, 191/);
  assert.doesNotMatch(css, /%23(?:ff635d|00c0c3|ffe48f)/i);
  assert.doesNotMatch(css, /cho-kaguyahime\.com\/assets/i);
});

test("uses the dark cat and one yellow hover color for every supported card", () => {
  assert.match(css, /\.motion34-fill\s*\{\s*fill:\s*#282828;/);
  assert.match(css, /\.supported-list li:hover\s*\{[^}]*background:\s*#ffe48f;/s);
  assert.match(css, /\.supported-list li:focus-within\s*\{[^}]*background:\s*#ffe48f;/s);
  assert.doesNotMatch(css, /\.supported-list li:nth-child\(3n/);
});

test("fades into the dark footer without the former triangle cutout", () => {
  assert.match(css, /\.site-footer::before\s*\{[^}]*linear-gradient\(180deg,[^}]*var\(--ink\)/s);
  assert.doesNotMatch(css, /\.site-footer::before\s*\{[^}]*conic-gradient/s);
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
