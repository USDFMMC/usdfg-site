import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "client", "src");
// Explicit entries: shell + app route so both home and /app are covered
const ENTRIES = [
  path.join(srcRoot, "main.tsx"),
  path.join(srcRoot, "pages", "app", "index.tsx"),
];

const CODE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const IGNORE_DIRS = new Set([
  path.join(srcRoot, "_kimi"),
]);

function isUnderIgnoredDir(filePath) {
  const norm = path.normalize(filePath);
  for (const d of IGNORE_DIRS) {
    if (norm.startsWith(path.normalize(d) + path.sep)) return true;
  }
  return false;
}

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    if (isUnderIgnoredDir(cur)) continue;
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = path.join(cur, ent.name);
      if (isUnderIgnoredDir(p)) continue;
      if (ent.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function tryResolveFileNoExt(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  for (const ext of CODE_EXTS) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of CODE_EXTS) {
      const candidate = path.join(basePath, "index" + ext);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith(".")) {
    const base = path.resolve(path.dirname(fromFile), spec);
    return tryResolveFileNoExt(base);
  }
  if (spec.startsWith("@/")) {
    const base = path.join(srcRoot, spec.slice(2));
    return tryResolveFileNoExt(base);
  }
  return null;
}

function extractImportSpecs(code) {
  const specs = [];
  const reImportFrom = /\bimport\s+[^;]*?\s+from\s+["']([^"']+)["']/g;
  const reImportCall = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  const reRequire = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const re of [reImportFrom, reImportCall, reRequire]) {
    let m;
    while ((m = re.exec(code))) {
      if (m[1]) specs.push(m[1]);
    }
  }
  return specs;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function isCodeFile(p) {
  return CODE_EXTS.includes(path.extname(p));
}

const reachable = new Set();
const queue = [];

for (const entry of ENTRIES) {
  if (!fs.existsSync(entry)) {
    console.error("Entry not found:", entry);
    process.exit(1);
  }
  queue.push(entry);
}

while (queue.length) {
  const file = queue.shift();
  if (!file) continue;
  const norm = path.normalize(file);
  if (reachable.has(norm)) continue;
  if (isUnderIgnoredDir(norm)) continue;
  reachable.add(norm);

  if (!isCodeFile(norm)) continue;
  const code = readText(norm);
  const specs = extractImportSpecs(code);
  for (const spec of specs) {
    const resolved = resolveImport(norm, spec);
    if (resolved && !reachable.has(path.normalize(resolved))) {
      queue.push(resolved);
    }
  }
}

const allFiles = listFiles(srcRoot)
  .filter((p) => isCodeFile(p))
  .map((p) => path.normalize(p));

const unreachable = allFiles.filter((p) => !reachable.has(p));

const rel = (p) => path.relative(repoRoot, p).replaceAll(path.sep, "/");

const byDir = new Map();
for (const f of unreachable) {
  const r = rel(f);
  const top = r.split("/").slice(0, 3).join("/");
  const arr = byDir.get(top) ?? [];
  arr.push(r);
  byDir.set(top, arr);
}
for (const [, arr] of byDir) arr.sort();

const reportLines = [];
reportLines.push("# Dead code report (file-level)");
reportLines.push("");
reportLines.push("- **Entries (shell + app):** `" + rel(ENTRIES[0]) + "`, `" + rel(ENTRIES[1]) + "`");
reportLines.push("- Source root: `client/src`");
reportLines.push("- Ignored: `client/src/_kimi/**`");
reportLines.push("");
reportLines.push("## Summary");
reportLines.push("- Reachable code files: **" + reachable.size + "**");
reportLines.push("- Total code files scanned: **" + allFiles.length + "**");
reportLines.push("- Unreachable (likely dead) files: **" + unreachable.length + "**");
reportLines.push("");
reportLines.push("## Unreachable files");
for (const [group, arr] of [...byDir.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  reportLines.push("");
  reportLines.push("### " + group);
  for (const r of arr) reportLines.push("- `" + r + "`");
}
reportLines.push("");
reportLines.push("## Notes");
reportLines.push("- File-level dead code from static imports (import, import(), require()).");
reportLines.push("");

const reportPath = path.join(repoRoot, "DEAD_CODE_REPORT.md");
fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");

// Output unreachable paths one per line for cleanup script
if (process.argv.includes("--list")) {
  for (const f of unreachable) console.log(rel(f));
} else {
  console.log("Wrote report:", rel(reportPath));
  console.log("Unreachable files:", unreachable.length);
}
