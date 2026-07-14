const form = document.querySelector("#resolve-form");
const input = document.querySelector("#share-url");
const passwordInput = document.querySelector("#share-password");
const copyButton = document.querySelector("#copy-button");
const parseOnlyButton = document.querySelector(".parse-only-button");
const resolveButton = document.querySelector(".resolve-button");
const parseOnlyButtonLabel = parseOnlyButton.querySelector(".button-label");
const resolveButtonLabel = resolveButton.querySelector(".button-label");
const message = document.querySelector("#message");
const smartUrlOutput = document.querySelector("#smart-url");
const vrchatUrlOutput = document.querySelector("#vrchat-url");
const copyVrchatButton = document.querySelector("#copy-vrchat-button");
const directResult = document.querySelector("#direct-result");
const directUrlOutput = document.querySelector("#direct-url");
const copyDirectButton = document.querySelector("#copy-direct-button");
const openDirectLink = document.querySelector("#open-direct-link");
const stampLayer = document.querySelector("#stamp-layer");
const backToTopButton = document.querySelector("#back-to-top");

const ICLOUD_HOSTS = new Set(["www.icloud.com", "www.icloud.com.cn"]);
const WENSHUSHU_HOST_RE = /^(?:[a-z0-9-]+\.)?(?:wss\.ink|wss\.show|wenshushu\.(?:cn|com)|wenxiaozhan\.(?:net|cn|com)|ws\d+\.cn|wss\d+\.cn|wss\.(?:email|cc|pet|zone))$/i;
const KDOCS_HOST_RE = /^(?:[a-z0-9-]+\.)?kdocs\.cn$/i;
const FEISHU_HOST_RE = /^[a-z0-9-]+\.feishu\.cn$/i;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function extractShareUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  const match = value.match(/https:\/\/[^\s<>"']+/i);
  if (!match) return null;
  const candidate = match[0].replace(/[\])}，。；！？，、]+$/gu, "");
  return candidate.length <= 512 ? candidate : null;
}

function splitMotionText() {
  document.querySelectorAll("[data-motion-text]").forEach((element) => {
    const text = element.dataset.motionText || element.textContent;
    element.textContent = "";

    [...text].forEach((character, index) => {
      const span = document.createElement("span");
      span.className = "char";
      span.style.setProperty("--char-index", index);
      span.textContent = character === " " ? "\u00a0" : character;
      span.setAttribute("aria-hidden", "true");
      element.append(span);
    });
  });
}

function detectShare(value = input.value) {
  try {
    const extractedUrl = extractShareUrl(value);
    if (!extractedUrl) return null;
    const url = new URL(extractedUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;

    if (url.hostname === "qfile.qq.com" && /^\/q\/[A-Za-z0-9]+$/.test(url.pathname)) {
      return { platform: "QQ闪传", url: `${url.origin}${url.pathname}` };
    }
    if (
      ICLOUD_HOSTS.has(url.hostname) &&
      /^\/iclouddrive\/[A-Za-z0-9_=-]+$/.test(url.pathname)
    ) {
      return { platform: "iCloud", url: `${url.origin}${url.pathname}` };
    }
    if (
      WENSHUSHU_HOST_RE.test(url.hostname) &&
      /^\/f\/[A-Za-z0-9]+$/.test(url.pathname)
    ) {
      return { platform: "文叔叔", url: `${url.origin}${url.pathname}` };
    }
    if (KDOCS_HOST_RE.test(url.hostname) && /^\/l\/[A-Za-z0-9_-]+$/.test(url.pathname)) {
      return { platform: "WPS云文档", url: `https://www.kdocs.cn${url.pathname}` };
    }
    if (
      FEISHU_HOST_RE.test(url.hostname) &&
      /^\/(?:file|drive\/folder)\/[A-Za-z0-9_-]+$/.test(url.pathname)
    ) {
      return { platform: "飞书云盘", url: `${url.origin}${url.pathname}` };
    }
    if (url.hostname === "www.ecpan.cn") {
      const fragmentQuery = url.hash.includes("?")
        ? url.hash.slice(url.hash.indexOf("?") + 1)
        : "";
      const key = url.searchParams.get("data") || new URLSearchParams(fragmentQuery).get("data");
      if (key && /^[A-Za-z0-9_-]+$/.test(key)) {
        return {
          platform: "移动云云空间",
          url: `https://www.ecpan.cn/web/#/yunpanProxy?path=%2F%23%2Fdrive%2Foutside&data=${encodeURIComponent(key)}&isShare=1`,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function currentSmartUrl() {
  const share = detectShare();
  if (!share) return null;
  const smartUrl = new URL("/do", location.origin);
  smartUrl.searchParams.set("url", share.url);
  const password = passwordInput.value.trim();
  if (password) smartUrl.searchParams.set("pwd", password);
  return smartUrl.toString();
}

function currentVrchatUrl() {
  const share = detectShare();
  if (!share) return null;

  if (share.platform === "QQ闪传") {
    const shareUrl = new URL(share.url);
    const shareKey = shareUrl.pathname.slice(3);
    return new URL(`/vrchat/qq/${shareKey}.mp4`, location.origin).toString();
  }

  const vrchatUrl = new URL("/vrchat/media.mp4", location.origin);
  vrchatUrl.searchParams.set("url", share.url);
  const password = passwordInput.value.trim();
  if (password) vrchatUrl.searchParams.set("pwd", password);
  return vrchatUrl.toString();
}

function updateVrchatUrl() {
  const vrchatUrl = currentVrchatUrl();
  vrchatUrlOutput.textContent = vrchatUrl || "输入已支持的分享链接后自动生成";
  vrchatUrlOutput.dataset.ready = vrchatUrl ? "true" : "false";
  copyVrchatButton.disabled = !vrchatUrl;
}

function updateSmartUrl() {
  const smartUrl = currentSmartUrl();
  smartUrlOutput.textContent = smartUrl || "输入有效分享链接后自动生成";
  smartUrlOutput.dataset.ready = smartUrl ? "true" : "false";
  copyButton.disabled = !smartUrl;

  if (input.value.trim() && !smartUrl) {
    showMessage("暂时支持下方列出的六种分享平台。", "info");
  } else if (smartUrl) {
    showMessage(`已识别 ${detectShare().platform} 分享链接。`, "success");
  } else if (!input.value.trim()) {
    showMessage("");
  }

  updateVrchatUrl();
}

function showMessage(text, kind = "info") {
  message.textContent = text;
  message.dataset.kind = kind;
}

function validate() {
  const share = detectShare();
  if (!share) {
    showMessage("请输入有效的已支持网盘分享链接。", "error");
    input.focus();
    return null;
  }
  return share;
}

function hideDirectResult() {
  directResult.hidden = true;
  directUrlOutput.textContent = "";
  openDirectLink.removeAttribute("href");
}

function showDirectResult(directUrl) {
  directUrlOutput.textContent = directUrl;
  openDirectLink.href = directUrl;
  directResult.hidden = false;
}

function startDownload(directUrl) {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "文件下载";
  frame.src = directUrl;
  document.body.append(frame);
  window.setTimeout(() => frame.remove(), 120000);
}

function playDownloadMotion() {
  resolveButton.classList.remove("is-working");
  void resolveButton.offsetWidth;
  resolveButton.classList.add("is-working");
  window.setTimeout(() => resolveButton.classList.remove("is-working"), 650);
}

function createStamp(x, y, forcedText) {
  if (reducedMotion.matches || !stampLayer) return;

  const labels = ["GOOD!", "LINK", "✦", "READY", "GO!"];
  const label = forcedText || labels[Math.floor(Math.random() * labels.length)];
  const stamp = document.createElement("span");
  stamp.className = `motion-stamp${label === "✦" ? " is-spark" : ""}`;
  stamp.textContent = label;
  stamp.style.left = `${x}px`;
  stamp.style.top = `${y}px`;
  stamp.style.setProperty("--stamp-rotation", `${Math.round(Math.random() * 30 - 15)}deg`);
  stampLayer.append(stamp);
  window.setTimeout(() => stamp.remove(), 2100);
}

function setupScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealElements.forEach((element) => observer.observe(element));
}

splitMotionText();
setupScrollReveal();
updateSmartUrl();

let backToTopFrame = 0;

function updateBackToTopVisibility() {
  backToTopFrame = 0;
  const shouldShow = window.scrollY > Math.max(480, window.innerHeight * 0.8);
  backToTopButton?.classList.toggle("is-visible", shouldShow);
}

window.addEventListener(
  "scroll",
  () => {
    if (backToTopFrame) return;
    backToTopFrame = window.requestAnimationFrame(updateBackToTopVisibility);
  },
  { passive: true }
);

backToTopButton?.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: reducedMotion.matches ? "auto" : "smooth",
  });
});

updateBackToTopVisibility();

window.addEventListener("load", () => {
  window.requestAnimationFrame(() => document.body.classList.add("is-ready"));
});

window.setTimeout(() => document.body.classList.add("is-ready"), 900);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const share = validate();
  if (!share) return;
  const shouldDownload = event.submitter?.value !== "parse";

  input.value = share.url;
  if (shouldDownload) playDownloadMotion();
  showMessage(`正在向 ${share.platform} 请求文件直链…`);
  hideDirectResult();
  parseOnlyButton.disabled = true;
  resolveButton.disabled = true;
  event.submitter?.setAttribute("aria-busy", "true");
  if (shouldDownload) {
    resolveButtonLabel.textContent = "解析中…";
  } else {
    parseOnlyButtonLabel.textContent = "解析中…";
  }

  try {
    const apiUrl = new URL("/do", location.origin);
    apiUrl.searchParams.set("url", share.url);
    const password = passwordInput.value.trim();
    if (password) apiUrl.searchParams.set("pwd", password);
    apiUrl.searchParams.set("format", "json");

    const response = await fetch(apiUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data?.ok || !data?.directUrl) {
      throw new Error(data?.error || "直链解析失败");
    }

    showDirectResult(data.directUrl);
    const transportHint = data.transport === "edge-stream" ? "，下载由 EdgeOne 实时转发" : "";
    if (shouldDownload) {
      startDownload(data.directUrl);
      showMessage(`${data.service} 直链获取成功，已开始下载${transportHint}。`, "success");
    } else {
      showMessage(`${data.service} 直链获取成功${transportHint}。`, "success");
    }
    const rect = resolveButton.getBoundingClientRect();
    createStamp(rect.left + rect.width / 2, rect.top, "READY");
  } catch (error) {
    showMessage(error?.message || "直链解析失败，请稍后重试。", "error");
  } finally {
    parseOnlyButton.disabled = false;
    resolveButton.disabled = false;
    parseOnlyButton.removeAttribute("aria-busy");
    resolveButton.removeAttribute("aria-busy");
    parseOnlyButtonLabel.textContent = "仅解析";
    resolveButtonLabel.textContent = "解析并下载";
  }
});

copyButton.addEventListener("click", async () => {
  const smartUrl = currentSmartUrl();
  if (!smartUrl) return;
  try {
    await navigator.clipboard.writeText(smartUrl);
    showMessage("智能直链已复制。", "success");
    const rect = copyButton.getBoundingClientRect();
    createStamp(rect.left + rect.width / 2, rect.top, "GOOD!");
  } catch {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(smartUrlOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    showMessage("请手动复制已选中的智能直链。", "info");
  }
});

copyVrchatButton.addEventListener("click", async () => {
  const vrchatUrl = currentVrchatUrl();
  if (!vrchatUrl) return;
  try {
    await navigator.clipboard.writeText(vrchatUrl);
    showMessage("VRChat 播放地址已复制。", "success");
    const rect = copyVrchatButton.getBoundingClientRect();
    createStamp(rect.left + rect.width / 2, rect.top, "READY");
  } catch {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(vrchatUrlOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    showMessage("请手动复制已选中的 VRChat 播放地址。", "info");
  }
});

input.addEventListener("input", () => {
  hideDirectResult();
  updateSmartUrl();
});

passwordInput.addEventListener("input", () => {
  hideDirectResult();
  updateSmartUrl();
});

copyDirectButton.addEventListener("click", async () => {
  const directUrl = directUrlOutput.textContent;
  if (!directUrl) return;
  try {
    await navigator.clipboard.writeText(directUrl);
    showMessage("获取到的直链已复制。", "success");
  } catch {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(directUrlOutput);
    selection.removeAllRanges();
    selection.addRange(range);
    showMessage("请手动复制已选中的直链。", "info");
  }
});

document.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (event.target.closest("a, button, input, form")) return;
  createStamp(event.clientX, event.clientY);
});
