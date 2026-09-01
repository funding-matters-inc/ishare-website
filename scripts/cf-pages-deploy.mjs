/**
 * Cloudflare Pages build step for this static site.
 *
 * This repo has no build/bundling step — the site is served as-is. This
 * script's only job is to keep any file over 25 MiB (the Pages hard limit)
 * out of the deployment: it uploads such files to R2, deletes the local
 * copy, and appends a redirect for their original path to `_redirects`.
 *
 * That means a contributor (or their AI coding assistant) can add a large
 * video at its normal local path (e.g. `img/culture/foo/bar.mp4`), reference
 * it normally in HTML, and just commit + push — no R2 dashboard, no
 * hand-built URL. Requests for that path are transparently redirected to
 * the R2 public URL by Cloudflare Pages itself.
 *
 * Requires CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (R2 write) as Pages
 * build variables — set for both Production and Preview.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync, statSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUCKET = 'ishare-website-assets';
const PUBLIC_BASE = 'https://pub-9c330ac03ec74549b5940164631d69ea.r2.dev';
const REDIRECTS_FILE = join(ROOT, '_redirects');
/** Cloudflare Pages max single-file size. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Never walk into these — not deployable content. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'scripts']);

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkFiles(join(dir, entry.name), out);
    } else {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function contentTypeFor(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function shellQuote(arg) {
  if (arg.length === 0) return '""';
  if (!/[\s"&<>|^]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function runNpx(args) {
  const line = ['npx', '--yes', ...args].map(shellQuote).join(' ');
  const result = spawnSync(line, { stdio: 'inherit', shell: true, cwd: ROOT });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** Whether R2 already holds this key — see cf-pages-deploy.mjs in ishare-virtual-tour for why this check exists. */
async function existsInR2(key) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!account || !token) {
    console.log('R2 ? no API token in env — skipping the check');
    return false;
  }
  const path = key.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${BUCKET}/objects/${path}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Range: 'bytes=0-0' },
    });
    if (response.status === 200 || response.status === 206) return true;
    if (response.status !== 404) {
      console.log(`R2 ? probe returned ${response.status} — treating as absent`);
    }
    return false;
  } catch (error) {
    console.log(`R2 ? probe failed (${error.message}) — treating as absent`);
    return false;
  }
}

const oversized = walkFiles(ROOT).filter((p) => statSync(p).size > MAX_BYTES);

if (oversized.length === 0) {
  console.log('No files over 25 MiB — nothing to offload to R2.');
  process.exit(0);
}

const existingRedirects = existsSync(REDIRECTS_FILE)
  ? readFileSync(REDIRECTS_FILE, 'utf8').split('\n').filter(Boolean)
  : [];
const newRedirects = [];

for (const filePath of oversized) {
  const key = relative(ROOT, filePath).split('\\').join('/');
  const mb = (statSync(filePath).size / (1024 * 1024)).toFixed(1);

  if (await existsInR2(key)) {
    console.log(`R2 = ${key} (${mb} MiB, already uploaded)`);
  } else {
    console.log(`R2 ← ${key} (${mb} MiB, over Pages 25 MiB limit)`);
    runNpx([
      'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`,
      '--file', filePath,
      '--content-type', contentTypeFor(key),
      '--remote',
    ]);
  }

  rmSync(filePath);
  newRedirects.push(`/${key}  ${PUBLIC_BASE}/${key}  301`);
}

const merged = [...new Set([...existingRedirects, ...newRedirects])];
writeFileSync(REDIRECTS_FILE, merged.join('\n') + '\n');
console.log(`Wrote ${newRedirects.length} redirect(s) to _redirects.`);
