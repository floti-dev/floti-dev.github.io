// Makes preview/: the built home page in the shape a hosted preview (a Claude
// artifact) takes. The real GitHub Pages build in dist/ is left as it is.
//
// - The bundled files move from _astro/ to assets/: the host reserves names
//   that start with "_". Every reference to them is rewritten, in the page
//   and inside the CSS and JS, and every reference is relative.
// - The host wraps the page in its own document, so index.html is the head's
//   contents (the <title> first) followed by the body's contents, with no
//   doctype, html, head or body tags.
// - The page's Content-Security-Policy is dropped: the host may add a script
//   of its own, which that policy would block.
// - Links to the site's other pages point at floti.dev.
// - files.txt lists every file but index.html, one relative path per line.

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'preview');
const SITE = 'https://floti.dev';
const TITLE = 'floti.dev Home Prototype';
const ASSETS = 'assets';

function fail(message) {
  console.error(`preview-bundle: ${message}`);
  process.exit(1);
}

function inner(html, tag) {
  const match = html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*)</${tag}>`, 'i'));
  if (!match) fail(`dist/index.html has no <${tag}>`);
  return match[1].trim();
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html is missing; run the build first');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// The page: references made relative, then unwrapped.
let html = await readFile(join(dist, 'index.html'), 'utf8');
const rootFiles = new Set();
html = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '')
  .replace(/(\s(?:href|src)=")\/(?!\/)([^"]*)"/g, (_, attr, path) => {
    if (path === '') return `${attr}./"`;
    if (path.startsWith('_astro/')) return `${attr}./${ASSETS}/${path.slice('_astro/'.length)}"`;
    if (existsSync(join(dist, path)) && !path.endsWith('/')) {
      rootFiles.add(path);
      return `${attr}./${path}"`;
    }
    // another page of the site
    return `${attr}${SITE}/${path}"`;
  });
const head = inner(html, 'head').replace(/<title>[\s\S]*?<\/title>\s*/i, '');
const body = inner(html, 'body');
await writeFile(join(out, 'index.html'), `<title>${TITLE}</title>\n${head}\n${body}\n`);
for (const file of rootFiles) await cp(join(dist, file), join(out, file));

// The bundled files, in assets/, with their own references made relative:
// from a file inside assets/, /_astro/x is ./x.
const assetsIn = join(dist, '_astro');
const assetsOut = join(out, ASSETS);
if (existsSync(assetsIn)) await cp(assetsIn, assetsOut, { recursive: true });
const code = existsSync(assetsOut) ? (await readdir(assetsOut)).filter((n) => /\.(css|js|mjs)$/.test(n)) : [];
for (const name of code) {
  const file = join(assetsOut, name);
  const text = await readFile(file, 'utf8');
  const fixed = text.replaceAll('/_astro/', './');
  if (fixed !== text) await writeFile(file, fixed);
}

// Check: no reference to _astro/ or to the site's root is left, and every
// relative reference resolves to a file in the folder.
const problems = [];
async function check(file) {
  const text = await readFile(file, 'utf8');
  if (text.includes('_astro/')) problems.push(`${relative(out, file)}: still names _astro/`);
  const refs = [
    ...[...text.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]),
  ];
  for (const ref of refs) {
    if (/^(https?:|data:|#|mailto:)/.test(ref)) continue;
    if (ref.startsWith('/')) {
      problems.push(`${relative(out, file)}: root-absolute ${ref}`);
      continue;
    }
    if (ref === './') continue;
    const target = resolve(dirname(file), ref.split(/[?#]/)[0]);
    if (!target.startsWith(out + sep) || !existsSync(target)) problems.push(`${relative(out, file)}: missing ${ref}`);
  }
}
await check(join(out, 'index.html'));
for (const name of code) await check(join(assetsOut, name));
if (/<\/?(html|head|body)[\s>]|<!doctype/i.test(await readFile(join(out, 'index.html'), 'utf8'))) {
  problems.push('index.html still has a doctype, html, head or body tag');
}
if (problems.length) fail(`the preview is not self-contained:\n  ${problems.join('\n  ')}`);

// files.txt: what has to be published beside index.html
const listed = (await walk(out))
  .map((file) => relative(out, file).split(sep).join('/'))
  .filter((path) => path !== 'index.html')
  .sort();
await writeFile(join(out, 'files.txt'), `${listed.join('\n')}\n`);

console.log(`preview-bundle: wrote ${out} (index.html and ${listed.length} files)`);
