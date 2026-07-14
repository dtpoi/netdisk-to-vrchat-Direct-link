import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [html, css, script, readme, logo, favicon, appleTouchIcon, ogCard] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("assets/style.css", root), "utf8"),
  readFile(new URL("assets/app.js", root), "utf8"),
  readFile(new URL("README.md", root), "utf8"),
  readFile(new URL("assets/downloadlogo.png", root)),
  readFile(new URL("assets/favicon.png", root)),
  readFile(new URL("assets/apple-touch-icon.png", root)),
  readFile(new URL("assets/og-card.png", root)),
]);

test("uses the Cho Kaguya-hime palette and a local triangle pattern", () => {
  for (const color of ["#ff635d", "#00c0c3", "#ffe48f", "#282828"]) {
    assert.match(css, new RegExp(color, "i"));
  }
  assert.match(css, /data:image\/svg\+xml/);
  assert.match(css, /--paper:\s*#f4f4f0;/);
  assert.doesNotMatch(css, /#ead7ee/i);
  assert.doesNotMatch(css, /#cbc4f8/i);
  assert.match(css, /rgba\(244, 244, 240, 0\.8\)/);
  assert.match(css, /rgba\(226, 226, 222, 0\.5\)/);
  assert.doesNotMatch(css, /203, 196, 248|245, 186, 191/);
  assert.doesNotMatch(css, /%23(?:ff635d|00c0c3|ffe48f)/i);
  assert.doesNotMatch(css, /cho-kaguyahime\.com\/assets/i);
});

test("uses the dark cat and one yellow hover color for every supported card", () => {
  assert.match(html, /class="cat motion34-cat" viewBox="-18 0 349 280"/);
  assert.match(css, /\.motion34-fill\s*\{\s*fill:\s*#282828;/);
  assert.match(css, /\.supported-list li:hover\s*\{[^}]*background:\s*#ffe48f;/s);
  assert.match(css, /\.supported-list li:focus-within\s*\{[^}]*background:\s*#ffe48f;/s);
  assert.doesNotMatch(css, /\.supported-list li:nth-child\(3n/);
});

test("shows a service-limit note on every supported platform card", () => {
  assert.equal((html.match(/class="supported-note"/g) || []).length, 6);
  for (const note of [
    "不限速，单文件最大10G",
    "免费5GB存储",
    "文件&gt;500M不支持游客直接下载，需要付费",
    "未认证单文件仅20M，团队认证单文件10G/总100G",
    "国内访问速度不稳定",
    "大文件不支持游客下载",
  ]) {
    assert.match(html, new RegExp(note));
  }
  assert.match(css, /\.supported-note\s*\{[^}]*font-size:\s*11px;[^}]*line-height:\s*1\.55;/s);
});

test("uses the three theme colors for process-circle hover states", () => {
  assert.match(css, /\.step:nth-child\(1\):hover \.step-mark\s*\{[^}]*background:\s*var\(--accent\);/s);
  assert.match(css, /\.step:nth-child\(2\):hover \.step-mark\s*\{[^}]*background:\s*var\(--yellow\);/s);
  assert.match(css, /\.step:nth-child\(3\):hover \.step-mark\s*\{[^}]*background:\s*var\(--accent-alt\);/s);
});

test("uses neutral gray cards instead of the former pink tint", () => {
  assert.match(css, /--paper-light:\s*#fafaf7;/);
  assert.match(css, /\.resolver-form\s*\{[^}]*background:\s*rgba\(250, 250, 247, 0\.96\);/s);
  assert.doesNotMatch(css, /#fff9fb|255,\s*249,\s*251/i);
});

test("uses optimized logo and favicon assets", () => {
  assert.equal(logo.readUInt32BE(16), 128);
  assert.equal(logo.readUInt32BE(20), 128);
  assert.equal(favicon.readUInt32BE(16), 64);
  assert.equal(favicon.readUInt32BE(20), 64);
  assert.equal((html.match(/src="\/assets\/downloadlogo\.png"/g) || []).length, 2);
  assert.match(html, /rel="icon"[^>]*href="\/assets\/favicon\.png"/);
  assert.match(css, /\.site-footer \.brand img\s*\{[^}]*filter:\s*invert\(1\);/s);
});

test("provides iOS home-screen and social sharing metadata", () => {
  assert.equal(appleTouchIcon.readUInt32BE(16), 180);
  assert.equal(appleTouchIcon.readUInt32BE(20), 180);
  assert.equal(ogCard.readUInt32BE(16), 1200);
  assert.equal(ogCard.readUInt32BE(20), 630);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/assets\/apple-touch-icon\.png"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="直链解析"/);
  assert.match(html, /property="og:image" content="https:\/\/api\.dtpoi\.cn\/assets\/og-card\.png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="canonical" href="https:\/\/api\.dtpoi\.cn\/"/);
});

test("shows right-aligned source and parser reference links beside the hero title", () => {
  assert.match(html, /class="hero-source-links motion-fade"/);
  assert.match(html, /class="github-logo"/);
  assert.match(html, /https:\/\/github\.com\/dtpoi\/netdisk-to-vrchat-Direct-link/);
  assert.match(html, /解析思路\/平台接口参考/);
  assert.match(html, /https:\/\/github\.com\/qaiu\/netdisk-fast-download/);
  assert.match(css, /\.hero-source-links\s*\{[^}]*justify-items:\s*end;[^}]*text-align:\s*right;/s);
});

test("cuts directly to the dark footer without a transition layer", () => {
  assert.doesNotMatch(css, /\.site-footer::before/);
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

test("lists OneDrive and Feijipan instead of WPS and Ecpan", () => {
  for (const text of ["OneDrive", "1drv.ms", "小飞机网盘", "feijipan.com"]) {
    assert.match(html, new RegExp(text, "i"));
  }
  assert.doesNotMatch(html, /WPS云文档|移动云云空间|kdocs\.cn|ecpan\.cn/);
  assert.match(script, /platform:\s*"OneDrive"/);
  assert.match(script, /platform:\s*"小飞机网盘"/);
});
