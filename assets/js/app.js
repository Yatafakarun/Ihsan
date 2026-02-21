const config = {
  appName: "Ihsan",
  defaultLanguage: "en",
  sheetCsvUrlEnglish: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxdf1x58TakjcCeZXZYMhtaU68o7fIpp_4QEI05ZFEwS6JR-QZZK9bOF9OVqlJNDIJPHWZlRi8gf6a/pub?gid=504165636&single=true&output=csv",
  sheetCsvUrlArabic: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTexhqHoB3A_qpvLPjV8sbnIty2yDv_hErrO4zVWo-tlSl7-tMWxq3NJgEVrDpiKBhRVLq56QUEfSeK/pub?gid=53116089&single=true&output=csv",
  cacheBust: true,
};

import { fetchReminders } from "./sheets.js";
import {
  createToast,
  storageGet,
  storageSet,
  randomIndex,
  copyText,
  isClipboardSupported,
  isShareSupported,
  getWhatsAppShareUrl,
  getWaMeUrl,
  getQueryParam,
  isLikelyMobile,
} from "./utils.js";

const ALL_VALUE = "__all__";
const LENGTH_THRESHOLDS = { short: 80, ok: 140 };

const strings = {
  en: {
    setupTitle: "Setup needed",
    setupBody: "Set the published CSV URLs in assets/js/app.js for English and Arabic.",
    errorTitle: "Could not load reminders",
    errorBody: "Please check the CSV links and try again.",
    retry: "Retry",
    categoryLabel: "Category",
    allCats: "All",
    newBtn: "New",
    copyBtn: "Copy",
    shareBtn: "Share",
    footer:
      "Pick a reminder, tap Copy or Share, then paste into WhatsApp status.",
    loading: "Loading...",
    noReminders: "No reminders found for this category.",
    copySuccess: "Copied to clipboard.",
    copyFail: "Copy failed. Try again.",
    shareSuccess: "Share opened.",
    shareFail: "Share canceled. Use Copy instead.",
    shareFallback: "Share link opened.",
    sourceLabel: "Sources",
    sourceAyah: "Ayah",
    sourceHadith: "Hadith",
    sourceQuote: "Quote",
    sourceOther: "Other",
    descLabel: "Description",
    charsLabel: "chars",
    hintShort: "Short",
    hintOk: "OK",
    hintLong: "Long",
  },
  ar: {
    setupTitle: "الإعداد مطلوب",
    setupBody: "ضع روابط CSV المنشورة في assets/js/app.js للإنجليزية والعربية.",
    errorTitle: "تعذر تحميل التذكيرات",
    errorBody: "تحقق من روابط CSV ثم أعد المحاولة.",
    retry: "إعادة المحاولة",
    categoryLabel: "الفئة",
    allCats: "الكل",
    newBtn: "جديد",
    copyBtn: "نسخ",
    shareBtn: "مشاركة",
    footer: "اختر تذكرة، ثم اضغط نسخ أو مشاركة، والصقها في حالة واتساب.",
    loading: "جار التحميل...",
    noReminders: "لا توجد تذكيرات لهذه الفئة.",
    copySuccess: "تم النسخ.",
    copyFail: "فشل النسخ. حاول مرة أخرى.",
    shareSuccess: "تم فتح المشاركة.",
    shareFail: "تم إلغاء المشاركة. استخدم النسخ.",
    shareFallback: "تم فتح رابط المشاركة.",
    sourceLabel: "المصادر",
    sourceAyah: "آية",
    sourceHadith: "حديث",
    sourceQuote: "اقتباس",
    sourceOther: "أخرى",
    descLabel: "الوصف",
    charsLabel: "حرف",
    hintShort: "قصير",
    hintOk: "مناسب",
    hintLong: "طويل",
  },
};

const els = {
  appName: document.getElementById("appName"),
  langButtons: Array.from(document.querySelectorAll(".lang-btn")),
  categoryLabel: document.getElementById("categoryLabel"),
  categorySelect: document.getElementById("categorySelect"),
  reminderText: document.getElementById("reminderText"),
  cardDetails: document.getElementById("cardDetails"),
  sourceBlock: document.getElementById("sourceBlock"),
  sourceLabel: document.getElementById("sourceLabel"),
  sourceList: document.getElementById("sourceList"),
  descBlock: document.getElementById("descBlock"),
  descLabel: document.getElementById("descLabel"),
  descText: document.getElementById("descText"),
  newBtn: document.getElementById("newBtn"),
  copyBtn: document.getElementById("copyBtn"),
  shareBtn: document.getElementById("shareBtn"),
  charCount: document.getElementById("charCount"),
  lengthHint: document.getElementById("lengthHint"),
  footer: document.getElementById("footerText"),
  setupPanel: document.getElementById("setupPanel"),
  setupTitle: document.getElementById("setupTitle"),
  setupBody: document.getElementById("setupBody"),
  errorPanel: document.getElementById("errorPanel"),
  errorTitle: document.getElementById("errorTitle"),
  errorBody: document.getElementById("errorBody"),
  retryBtn: document.getElementById("retryBtn"),
  toast: document.getElementById("toast"),
  diagnostics: document.getElementById("diagnostics"),
  diagList: document.getElementById("diagList"),
  diagResults: document.getElementById("diagResults"),
  selfTestBtn: document.getElementById("selfTestBtn"),
};

const state = {
  lang: config.defaultLanguage,
  data: {
    en: null,
    ar: null,
  },
  selectedCategory: {
    en: ALL_VALUE,
    ar: ALL_VALUE,
  },
  lastIndex: {
    en: -1,
    ar: -1,
  },
  currentReminder: null,
  lastError: "",
};

const showToast = createToast(els.toast);
const debugMode = getQueryParam("debug") === "1";

function isConfigured(url) {
  if (!url) return false;
  if (url.includes("<PASTE")) return false;
  return true;
}

function getUrlForLang(lang) {
  return lang === "ar" ? config.sheetCsvUrlArabic : config.sheetCsvUrlEnglish;
}

function setControlsEnabled(enabled) {
  els.categorySelect.disabled = !enabled;
  els.newBtn.disabled = !enabled;
  els.copyBtn.disabled = !enabled;
  els.shareBtn.disabled = !enabled;
}

function setReminderText(text) {
  els.reminderText.textContent = text;
  updateMeta(text);
}

function updateCardDetails(item) {
  if (!els.cardDetails) return;
  if (!item) {
    els.cardDetails.hidden = true;
    if (els.sourceList) els.sourceList.innerHTML = "";
    if (els.descText) els.descText.textContent = "";
    return;
  }

  const sources = item.sources || {};
  const desc = item.desc || "";
  const sourceGroups = [
    { key: "ayah", labelKey: "sourceAyah" },
    { key: "hadith", labelKey: "sourceHadith" },
    { key: "quote", labelKey: "sourceQuote" },
    { key: "other", labelKey: "sourceOther" },
  ];
  const hasSources = sourceGroups.some((group) =>
    Array.isArray(sources[group.key]) && sources[group.key].length > 0
  );
  const hasDesc = Boolean(desc);

  els.cardDetails.hidden = !(hasSources || hasDesc);

  if (els.sourceBlock) {
    els.sourceBlock.hidden = !hasSources;
  }

  if (els.descBlock) {
    els.descBlock.hidden = !hasDesc;
  }

  if (els.sourceLabel) {
    els.sourceLabel.textContent = strings[state.lang].sourceLabel;
  }

  if (els.sourceList) {
    els.sourceList.innerHTML = "";
    if (hasSources) {
      const langStrings = strings[state.lang];
      sourceGroups.forEach((group) => {
        const values = Array.isArray(sources[group.key])
          ? sources[group.key]
          : [];
        if (!values.length) return;

        const wrapper = document.createElement("div");
        wrapper.className = "source-item";

        const label = document.createElement("span");
        label.className = "card-label";
        label.textContent = langStrings[group.labelKey];

        const list = document.createElement("ul");
        list.className = "ref-list";
        values.forEach((value) => {
          const li = document.createElement("li");
          li.textContent = value;
          list.appendChild(li);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(list);
        els.sourceList.appendChild(wrapper);
      });
    }
  }

  if (els.descLabel) {
    els.descLabel.textContent = strings[state.lang].descLabel;
  }

  if (els.descText) {
    els.descText.textContent = desc;
  }
}

function updateMeta(text) {
  const count = text ? text.length : 0;
  const langStrings = strings[state.lang];
  let hint = langStrings.hintOk;

  if (count <= LENGTH_THRESHOLDS.short) {
    hint = langStrings.hintShort;
  } else if (count <= LENGTH_THRESHOLDS.ok) {
    hint = langStrings.hintOk;
  } else {
    hint = langStrings.hintLong;
  }

  els.charCount.textContent = `${count} ${langStrings.charsLabel}`;
  els.lengthHint.textContent = hint;
}

function updateLanguageUI() {
  const langStrings = strings[state.lang];
  els.appName.textContent = config.appName;
  els.categoryLabel.textContent = langStrings.categoryLabel;
  els.newBtn.textContent = langStrings.newBtn;
  els.copyBtn.textContent = langStrings.copyBtn;
  els.shareBtn.textContent = langStrings.shareBtn;
  els.footer.textContent = langStrings.footer;
  els.setupTitle.textContent = langStrings.setupTitle;
  els.setupBody.textContent = langStrings.setupBody;
  els.errorTitle.textContent = langStrings.errorTitle;
  els.errorBody.textContent = langStrings.errorBody;
  els.retryBtn.textContent = langStrings.retry;
  if (els.sourceLabel) {
    els.sourceLabel.textContent = langStrings.sourceLabel;
  }
  if (els.descLabel) {
    els.descLabel.textContent = langStrings.descLabel;
  }

  els.langButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });
}

function applyDir() {
  const dir = state.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = state.lang === "ar" ? "ar" : "en";
}

function updateCategoryOptions() {
  const langStrings = strings[state.lang];
  const data = state.data[state.lang];
  if (!data) return;
  const categories = data.categories;

  const sorted = [...categories].sort((a, b) =>
    a.localeCompare(b, state.lang === "ar" ? "ar" : "en", {
      sensitivity: "base",
    })
  );

  const currentValue = state.selectedCategory[state.lang] || ALL_VALUE;
  const options = [{ value: ALL_VALUE, label: langStrings.allCats }].concat(
    sorted.map((cat) => ({ value: cat, label: cat }))
  );

  els.categorySelect.innerHTML = "";
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    els.categorySelect.appendChild(opt);
  });

  const availableValues = new Set(options.map((opt) => opt.value));
  const nextValue = availableValues.has(currentValue) ? currentValue : ALL_VALUE;
  state.selectedCategory[state.lang] = nextValue;
  els.categorySelect.value = nextValue;
  storageSet(`ihsan_cat_${state.lang}`, nextValue);
}

function getFilteredItems() {
  const data = state.data[state.lang];
  if (!data) return [];
  const selection = state.selectedCategory[state.lang];
  if (selection === ALL_VALUE) return data.items;
  return data.items.filter((item) => item.cats.includes(selection));
}

function pickRandomReminder() {
  const items = getFilteredItems();
  if (!items.length) {
    setReminderText(strings[state.lang].noReminders);
    state.currentReminder = null;
    updateCardDetails(null);
    return;
  }

  const nextIndex = randomIndex(items.length, state.lastIndex[state.lang]);
  state.lastIndex[state.lang] = nextIndex;
  state.currentReminder = items[nextIndex];
  setReminderText(state.currentReminder.text);
  updateCardDetails(state.currentReminder);
}

function showSetup() {
  els.setupPanel.hidden = false;
  els.errorPanel.hidden = true;
  setControlsEnabled(false);
  setReminderText(strings[state.lang].setupTitle);
  updateCardDetails(null);
}

function showError(message) {
  els.errorPanel.hidden = false;
  els.setupPanel.hidden = true;
  setControlsEnabled(false);
  state.lastError = message;
  setReminderText(strings[state.lang].errorTitle);
  updateCardDetails(null);
  updateDiagnostics();
}

function hideError() {
  els.errorPanel.hidden = true;
  state.lastError = "";
}

function setLoading() {
  els.setupPanel.hidden = true;
  els.errorPanel.hidden = true;
  setControlsEnabled(false);
  setReminderText(strings[state.lang].loading);
  updateCardDetails(null);
}

async function loadData(lang, { force = false } = {}) {
  const url = getUrlForLang(lang);
  if (!isConfigured(url)) {
    showSetup();
    updateDiagnostics();
    return;
  }

  if (state.data[lang] && !force) {
    updateCategoryOptions();
    pickRandomReminder();
    setControlsEnabled(true);
    updateDiagnostics();
    return;
  }

  try {
    setLoading();
    const result = await fetchReminders(url, { cacheBust: config.cacheBust });
    state.data[lang] = result;
    hideError();
    updateCategoryOptions();
    pickRandomReminder();
    setControlsEnabled(true);
    updateDiagnostics();
  } catch (err) {
    showError(err.message || "Fetch failed");
  }
}

function setLanguage(lang, { persist = true } = {}) {
  state.lang = lang;
  applyDir();
  updateLanguageUI();

  if (persist) {
    storageSet("ihsan_lang", lang);
  }

  loadData(lang);
}

function handleCategoryChange(value) {
  state.selectedCategory[state.lang] = value;
  storageSet(`ihsan_cat_${state.lang}`, value);
  pickRandomReminder();
  updateDiagnostics();
}

async function handleCopy() {
  if (!state.currentReminder) return;
  const success = await copyText(state.currentReminder.text);
  showToast(success ? strings[state.lang].copySuccess : strings[state.lang].copyFail);
  updateDiagnostics();
}

async function handleShare() {
  if (!state.currentReminder) return;
  const text = state.currentReminder.text;

  if (isShareSupported()) {
    try {
      await navigator.share({ text, title: config.appName });
      showToast(strings[state.lang].shareSuccess);
      return;
    } catch (err) {
      showToast(strings[state.lang].shareFail, "warn");
      return;
    }
  }

  const url = isLikelyMobile() ? getWhatsAppShareUrl(text) : getWaMeUrl(text);
  window.open(url, "_blank", "noopener,noreferrer");
  showToast(strings[state.lang].shareFallback);
}

function bindEvents() {
  els.langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang !== state.lang) {
        setLanguage(lang, { persist: true });
      }
    });
  });

  els.categorySelect.addEventListener("change", (event) => {
    handleCategoryChange(event.target.value);
  });

  els.newBtn.addEventListener("click", () => {
    pickRandomReminder();
  });

  els.copyBtn.addEventListener("click", handleCopy);
  els.shareBtn.addEventListener("click", handleShare);
  els.retryBtn.addEventListener("click", () => {
    loadData(state.lang, { force: true });
  });

  if (debugMode && els.selfTestBtn) {
    els.selfTestBtn.addEventListener("click", runSelfTest);
  }
}

function setDiagnosticsItems(items) {
  if (!els.diagList) return;
  els.diagList.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "diag-item";
    li.textContent = `${item.label}: ${item.value}`;
    els.diagList.appendChild(li);
  });
}

function setDiagnosticsResults(results) {
  if (!els.diagResults) return;
  els.diagResults.innerHTML = "";
  results.forEach((item) => {
    const li = document.createElement("li");
    li.className = item.pass ? "pass" : "fail";
    li.textContent = `${item.pass ? "PASS" : "FAIL"}: ${item.label}`;
    if (item.detail) {
      li.textContent += ` (${item.detail})`;
    }
    els.diagResults.appendChild(li);
  });
}

function updateDiagnostics() {
  if (!debugMode || !els.diagnostics) return;
  els.diagnostics.hidden = false;

  const data = state.data[state.lang];
  const items = [
    { label: "Web Share supported", value: isShareSupported() ? "Yes" : "No" },
    {
      label: "Clipboard supported",
      value: isClipboardSupported() ? "Yes" : "No",
    },
    { label: "Current language", value: state.lang },
    { label: "Document dir", value: document.documentElement.dir },
    {
      label: "Selected category",
      value: state.selectedCategory[state.lang] || ALL_VALUE,
    },
    {
      label: "Loaded reminders",
      value: data ? data.items.length : 0,
    },
    {
      label: "Discovered categories",
      value: data ? data.categories.length : 0,
    },
    {
      label: "Last error",
      value: state.lastError || "None",
    },
  ];

  setDiagnosticsItems(items);
}

async function runSelfTest() {
  const results = [];
  const url = getUrlForLang(state.lang);

  if (!isConfigured(url)) {
    results.push({ label: "Fetch test", pass: false, detail: "Missing URL" });
  } else {
    try {
      const result = await fetchReminders(url, { cacheBust: true });
      results.push({
        label: "Fetch test",
        pass: true,
        detail: `${result.items.length} rows`,
      });
      results.push({
        label: "Parse test",
        pass: result.items.length > 0,
        detail: result.items.length > 0 ? "Rows found" : "No rows",
      });
      results.push({
        label: "Category extraction test",
        pass: result.categories.length > 0,
        detail: `${result.categories.length} categories`,
      });
    } catch (err) {
      results.push({ label: "Fetch test", pass: false, detail: err.message });
      results.push({ label: "Parse test", pass: false, detail: "Fetch failed" });
      results.push({
        label: "Category extraction test",
        pass: false,
        detail: "Fetch failed",
      });
    }
  }

  const originalDir = document.documentElement.dir;
  document.documentElement.dir = originalDir === "ltr" ? "rtl" : "ltr";
  const toggled = document.documentElement.dir !== originalDir;
  document.documentElement.dir = originalDir;
  results.push({
    label: "Dir toggle test",
    pass: toggled,
    detail: toggled ? "OK" : "Failed",
  });

  const encoded = getWaMeUrl("Test & check");
  results.push({
    label: "Share URL encoding test",
    pass: encoded.includes("%26"),
    detail: encoded,
  });

  results.push({
    label: "Clipboard availability test",
    pass: isClipboardSupported(),
    detail: isClipboardSupported() ? "Available" : "Unavailable",
  });

  setDiagnosticsResults(results);
}

function init() {
  const storedLang = storageGet("ihsan_lang", config.defaultLanguage);
  state.lang = storedLang === "ar" ? "ar" : "en";
  state.selectedCategory.en = storageGet("ihsan_cat_en", ALL_VALUE);
  state.selectedCategory.ar = storageGet("ihsan_cat_ar", ALL_VALUE);

  updateLanguageUI();
  applyDir();
  bindEvents();

  if (debugMode) {
    els.diagnostics.hidden = false;
    updateDiagnostics();
  }

  loadData(state.lang);
}

init();
