(function () {
  "use strict";

  const SAMPLE = [
    '{"role":"system","content":"You are a helpful coding assistant. Keep answers concise."}',
    '{"role":"user","content":"List files in the current directory and summarize what this repo does."}',
    '{"type":"tool_call","name":"list_dir","arguments":{"path":"."}}',
    '{"type":"tool_result","name":"list_dir","ok":true,"output":"README.md\\nsrc/\\npackage.json"}',
    '{"role":"assistant","content":"This looks like a small Node project. README.md plus a src/ folder."}',
    '{"event":"thinking","level":"debug","message":"User asked for a summary; next step is reading README."}',
    '{"type":"tool_call","name":"read_file","arguments":{"path":"README.md"}}',
    '{"type":"tool_result","name":"read_file","ok":true,"output":"# Demo App\\n\\nA fictional sample repository for jsonl-lens."}',
    '{"role":"assistant","content":"Demo App — a fictional sample repository used to showcase JSONL viewing."}',
    '{"level":"info","message":"turn_complete","tokens":{"prompt":128,"completion":64}}',
    '{"role":"user","content":"Thanks. Can you also check package.json scripts?"}',
    "not-a-json-line this should fail parsing",
    '{"role":"assistant","content":"Sure — I\'ll open package.json next."}',
  ].join("\n");

  const PREFERRED_KEYS = [
    "role",
    "type",
    "event",
    "level",
    "name",
    "message",
    "content",
    "output",
  ];

  /** @type {{ lineNo: number, raw: string, ok: boolean, value: any, error: string|null }[]} */
  let records = [];

  const els = {
    source: document.getElementById("source"),
    dropzone: document.getElementById("dropzone"),
    fileInput: document.getElementById("fileInput"),
    keyword: document.getElementById("keyword"),
    fieldFilter: document.getElementById("fieldFilter"),
    list: document.getElementById("list"),
    stats: document.getElementById("stats"),
    btnParse: document.getElementById("btnParse"),
    btnSample: document.getElementById("btnSample"),
    btnClear: document.getElementById("btnClear"),
    btnCopy: document.getElementById("btnCopy"),
    btnDownload: document.getElementById("btnDownload"),
  };

  function truncate(str, n) {
    str = String(str).replace(/\s+/g, " ").trim();
    if (str.length <= n) return str;
    return str.slice(0, n - 1) + "…";
  }

  function summarize(rec) {
    if (!rec.ok) {
      return "解析失败：" + (rec.error || "未知错误");
    }
    const v = rec.value;
    if (v === null) return "null";
    if (typeof v !== "object") return truncate(JSON.stringify(v), 160);
    if (Array.isArray(v)) {
      return truncate("数组[" + v.length + "] " + JSON.stringify(v), 160);
    }
    const parts = [];
    for (const k of PREFERRED_KEYS) {
      if (Object.prototype.hasOwnProperty.call(v, k) && v[k] != null) {
        let val = v[k];
        if (typeof val === "object") val = JSON.stringify(val);
        parts.push(k + "=" + truncate(String(val), 80));
        if (parts.length >= 3) break;
      }
    }
    if (parts.length) return parts.join(" · ");
    const keys = Object.keys(v).slice(0, 4);
    if (!keys.length) return "{}";
    return truncate(
      keys.map((k) => k + "=" + JSON.stringify(v[k])).join(" · "),
      160
    );
  }

  function badgeText(rec) {
    if (!rec.ok) return "error";
    const v = rec.value;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of ["role", "type", "event", "level"]) {
        if (typeof v[k] === "string" && v[k]) return v[k];
      }
    }
    return typeof v;
  }

  function parseSource(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw.trim() === "") continue;
      try {
        out.push({
          lineNo: i + 1,
          raw: raw,
          ok: true,
          value: JSON.parse(raw),
          error: null,
        });
      } catch (e) {
        out.push({
          lineNo: i + 1,
          raw: raw,
          ok: false,
          value: null,
          error: e && e.message ? e.message : String(e),
        });
      }
    }
    records = out;
    render();
  }

  function parseFieldFilter(expr) {
    const s = (expr || "").trim();
    if (!s) return null;
    const m = s.match(/^([A-Za-z_][\w.]*)\s*=\s*(.*)$/);
    if (!m) return { error: "字段过滤格式应为 key=value，例如 role=user" };
    return { key: m[1], value: m[2] };
  }

  function getByPath(obj, path) {
    if (obj == null) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function filtered() {
    const kw = (els.keyword.value || "").trim().toLowerCase();
    const ff = parseFieldFilter(els.fieldFilter.value);
    if (ff && ff.error) {
      return { rows: [], filterError: ff.error };
    }
    const rows = records.filter((rec) => {
      if (kw && !rec.raw.toLowerCase().includes(kw)) return false;
      if (ff) {
        if (!rec.ok) return false;
        const actual = getByPath(rec.value, ff.key);
        if (actual === undefined || actual === null) return false;
        return String(actual) === ff.value;
      }
      return true;
    });
    return { rows: rows, filterError: null };
  }

  function renderStats(total, ok, bad, hit, filterError) {
    els.stats.innerHTML = "";
    const items = [
      ["总行数", total, ""],
      ["有效 JSON", ok, ""],
      ["坏行", bad, bad ? "warn" : ""],
      ["筛选命中", hit, ""],
    ];
    for (const [label, val, cls] of items) {
      const span = document.createElement("span");
      span.className = "stat" + (cls ? " " + cls : "");
      span.textContent = label + " " + val;
      els.stats.appendChild(span);
    }
    if (filterError) {
      const span = document.createElement("span");
      span.className = "stat warn";
      span.textContent = filterError;
      els.stats.appendChild(span);
    }
  }

  function render() {
    const { rows, filterError } = filtered();
    const total = records.length;
    const ok = records.filter((r) => r.ok).length;
    const bad = total - ok;
    renderStats(total, ok, bad, rows.length, filterError);

    els.list.innerHTML = "";
    if (!total) {
      els.list.innerHTML =
        '<div class="empty">粘贴 JSONL、拖入文件，或点击「加载示例」开始。</div>';
      els.btnCopy.disabled = true;
      els.btnDownload.disabled = true;
      return;
    }
    if (!rows.length) {
      els.list.innerHTML =
        '<div class="empty">没有匹配当前筛选条件的行。</div>';
      els.btnCopy.disabled = true;
      els.btnDownload.disabled = true;
      return;
    }

    els.btnCopy.disabled = false;
    els.btnDownload.disabled = false;

    const frag = document.createDocumentFragment();
    for (const rec of rows) {
      const row = document.createElement("div");
      row.className = "row" + (rec.ok ? "" : " bad");
      row.dataset.line = String(rec.lineNo);

      const head = document.createElement("div");
      head.className = "row-head";
      head.setAttribute("role", "button");
      head.tabIndex = 0;

      const ln = document.createElement("div");
      ln.className = "ln";
      ln.textContent = "#" + rec.lineNo;

      const badge = document.createElement("div");
      badge.className = "badge" + (rec.ok ? "" : " bad");
      badge.textContent = badgeText(rec);

      const summary = document.createElement("div");
      summary.className = "summary";
      summary.textContent = summarize(rec);

      const chev = document.createElement("div");
      chev.className = "chev";
      chev.textContent = "▸";

      head.appendChild(ln);
      head.appendChild(badge);
      head.appendChild(summary);
      head.appendChild(chev);

      const detail = document.createElement("div");
      detail.className = "detail";
      const pre = document.createElement("pre");
      if (rec.ok) {
        pre.textContent = JSON.stringify(rec.value, null, 2);
      } else {
        pre.textContent =
          "原始行：\n" + rec.raw + "\n\n错误：\n" + (rec.error || "");
      }
      detail.appendChild(pre);

      function toggle() {
        row.classList.toggle("open");
      }
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      row.appendChild(head);
      row.appendChild(detail);
      frag.appendChild(row);
    }
    els.list.appendChild(frag);
  }

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      els.source.value = String(reader.result || "");
      parseSource(els.source.value);
    };
    reader.onerror = function () {
      alert("读取文件失败：" + (reader.error && reader.error.message));
    };
    reader.readAsText(file);
  }

  els.btnParse.addEventListener("click", function () {
    parseSource(els.source.value);
  });

  els.btnSample.addEventListener("click", function () {
    els.source.value = SAMPLE;
    parseSource(SAMPLE);
  });

  els.btnClear.addEventListener("click", function () {
    els.source.value = "";
    els.keyword.value = "";
    els.fieldFilter.value = "";
    records = [];
    render();
  });

  els.keyword.addEventListener("input", render);
  els.fieldFilter.addEventListener("input", render);

  els.fileInput.addEventListener("change", function () {
    const f = els.fileInput.files && els.fileInput.files[0];
    readFile(f);
    els.fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) => {
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.dropzone.classList.remove("dragover");
    });
  });
  els.dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    readFile(f);
  });

  els.btnCopy.addEventListener("click", async function () {
    const { rows } = filtered();
    const text = rows.map((r) => r.raw).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      const old = els.btnCopy.textContent;
      els.btnCopy.textContent = "已复制";
      setTimeout(() => {
        els.btnCopy.textContent = old;
      }, 1200);
    } catch (e) {
      prompt("复制失败，请手动复制：", text);
    }
  });

  els.btnDownload.addEventListener("click", function () {
    const { rows } = filtered();
    const text = rows.map((r) => r.raw).join("\n") + (rows.length ? "\n" : "");
    const blob = new Blob([text], { type: "application/x-ndjson;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered.jsonl";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  render();
})();
