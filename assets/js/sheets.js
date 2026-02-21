export function parseCsv(text) {
  if (!text) return [];
  let source = text.replace(/^\uFEFF/, "");

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '\"') {
        const next = source[i + 1];
        if (next === '\"') {
          field += '\"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '\"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      const next = source[i + 1];
      if (next === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

function isHeaderRow(row) {
  const cells = row.slice(0, 7).map((cell) =>
    (cell || "").toLowerCase().trim()
  );
  const headerWords = ["text", "reminder", "message", "quote", "content"];
  const catWords = ["cat", "category", "categories", "tags"];
  const descWords = ["desc", "description", "notes", "detail"];
  const ayahWords = ["ayah", "quran", "verse", "ayat"];
  const hadithWords = ["hadith", "hadeeth", "حديث"];
  const quoteWords = ["quote", "saying", "wisdom"];
  const otherWords = ["other", "misc", "note"];

  const hasTextHeader = headerWords.some((word) => cells[0]?.includes(word));
  const hasCatHeader = catWords.some((word) => cells[1]?.includes(word));
  const hasDescHeader = descWords.some((word) =>
    cells.some((cell) => cell.includes(word))
  );
  const hasAyahHeader = ayahWords.some((word) =>
    cells.some((cell) => cell.includes(word))
  );
  const hasHadithHeader = hadithWords.some((word) =>
    cells.some((cell) => cell.includes(word))
  );
  const hasQuoteHeader = quoteWords.some((word) =>
    cells.some((cell) => cell.includes(word))
  );
  const hasOtherHeader = otherWords.some((word) =>
    cells.some((cell) => cell.includes(word))
  );

  return (
    hasTextHeader ||
    hasCatHeader ||
    hasDescHeader ||
    hasAyahHeader ||
    hasHadithHeader ||
    hasQuoteHeader ||
    hasOtherHeader
  );
}

function splitRefs(raw) {
  const cleaned = (raw || "").trim();
  if (!cleaned) return [];
  const separator = /[|;؛\n]+/;
  if (separator.test(cleaned)) {
    return cleaned
      .split(separator)
      .map((ref) => ref.trim())
      .filter(Boolean);
  }
  return [cleaned];
}

export function normalizeRows(rows) {
  if (!rows || rows.length === 0) {
    return { items: [], categories: [] };
  }

  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;
  const items = [];
  const categories = new Set();

  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const text = (row[0] || "").trim();
    if (!text) continue;

    const catsRaw = (row[1] || "").trim();
    let cats = [];

    if (catsRaw) {
      cats = catsRaw
        .split(",")
        .map((cat) => cat.trim())
        .filter(Boolean);
    }

    if (cats.length === 0) {
      cats = ["General"];
    }

    const desc = (row[2] || "").trim();
    const ayah = splitRefs(row[3] || "");
    const hadith = splitRefs(row[4] || "");
    const quote = splitRefs(row[5] || "");
    const other = splitRefs(row[6] || "");

    cats.forEach((cat) => categories.add(cat));
    items.push({
      text,
      cats,
      desc,
      sources: {
        ayah,
        hadith,
        quote,
        other,
      },
    });
  }

  return { items, categories: Array.from(categories) };
}

function buildUrl(url, cacheBust) {
  if (!cacheBust) return url;
  const hasQuery = url.includes("?");
  const joiner = hasQuery ? "&" : "?";
  return `${url}${joiner}_cb=${Date.now()}`;
}

export async function fetchReminders(url, options = {}) {
  const { cacheBust = false } = options;
  if (!url) throw new Error("Missing CSV URL");

  const finalUrl = buildUrl(url, cacheBust);
  const response = await fetch(finalUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
  }

  const text = await response.text();
  const rows = parseCsv(text);
  return normalizeRows(rows);
}
