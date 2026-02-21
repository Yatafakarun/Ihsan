export function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export function storageGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (err) {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    return;
  }
}

export function createToast(toastEl) {
  let timer = null;

  return function showToast(message, type = "info") {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.dataset.type = type;
    toastEl.hidden = false;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2200);
  };
}

export function isClipboardSupported() {
  const api = !!(navigator.clipboard && window.isSecureContext);
  const fallback = typeof document.queryCommandSupported === "function"
    ? document.queryCommandSupported("copy")
    : false;
  return api || fallback;
}

export async function copyText(text) {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const result = document.execCommand("copy");
    document.body.removeChild(textarea);
    return result;
  } catch (err) {
    document.body.removeChild(textarea);
    return false;
  }
}

export function isShareSupported() {
  return typeof navigator.share === "function";
}

export function isLikelyMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

export function getWhatsAppShareUrl(text) {
  const encoded = encodeURIComponent(text);
  if (isLikelyMobile()) {
    return `whatsapp://send?text=${encoded}`;
  }

  return `https://web.whatsapp.com/send?text=${encoded}`;
}

export function getWaMeUrl(text) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/?text=${encoded}`;
}

export function randomIndex(max, lastIndex) {
  if (max <= 1) return 0;
  let index = Math.floor(Math.random() * max);
  if (index === lastIndex) {
    index = (index + 1 + Math.floor(Math.random() * (max - 1))) % max;
  }
  return index;
}
