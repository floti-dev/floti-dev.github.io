// Makes preview/: the built home page and install guide in the shape a hosted
// preview (a Claude artifact) takes. The real GitHub Pages build in dist/ is
// left as it is.
//
// - The bundled files move from _astro/ to assets/: the host reserves names
//   that start with "_". Every reference to them is rewritten, in the pages
//   and inside the CSS and JS, and every reference is relative.
// - The host wraps the main page in its own document, so index.html is the
//   head's contents (the <title> first) followed by the body's contents, with
//   no doctype, html, head or body tags.
// - The host serves any other page as it is, so the install guide is
//   install.html, a complete document beside index.html.
// - Each page's Content-Security-Policy is dropped: the host may add a script
//   of its own, which that policy would block.
// - Links to the install guide point at ./install.html, and the guide's links
//   home at ./index.html. Links to any other page of the site point at
//   floti.dev.
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

/** The site's pages the preview carries: where each is built, the file it
 * becomes, and where its links to the home page go. */
const HOME = { built: 'index.html', file: 'index.html', home: './' };
const GUIDE = { built: 'install/index.html', file: 'install.html', home: './index.html' };
/** The root-relative path of each carried page, as the site links to it. */
const PAGE_LINKS = new Map([
  ['install/', GUIDE.file],
  ['install', GUIDE.file],
  ['install/index.html', GUIDE.file],
]);

function fail(message) {
  console.error(`preview-bundle: ${message}`);
  process.exit(1);
}

function inner(html, tag, name) {
  const match = html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*)</${tag}>`, 'i'));
  if (!match) fail(`dist/${name} has no <${tag}>`);
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

/** A built page with its references made relative to the preview's root,
 * where every page lands. Files it names at the site's root are collected
 * into `rootFiles` to be copied beside it. */
async function relativePage(page, rootFiles) {
  const html = await readFile(join(dist, page.built), 'utf8');
  return html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '')
    .replace(/(\s(?:href|src)=")\/(?!\/)([^"#]*)(#[^"]*)?"/g, (_, attr, path, hash = '') => {
      if (path === '') return `${attr}${page.home}${hash}"`;
      if (path.startsWith('_astro/')) return `${attr}./${ASSETS}/${path.slice('_astro/'.length)}${hash}"`;
      if (PAGE_LINKS.has(path)) return `${attr}./${PAGE_LINKS.get(path)}${hash}"`;
      if (existsSync(join(dist, path)) && !path.endsWith('/')) {
        rootFiles.add(path);
        return `${attr}./${path}${hash}"`;
      }
      // another page of the site
      return `${attr}${SITE}/${path}${hash}"`;
    });
}

for (const page of [HOME, GUIDE]) {
  if (!existsSync(join(dist, page.built))) fail(`dist/${page.built} is missing; run the build first`);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const rootFiles = new Set();

// The home page: unwrapped, the preview's title first.
const home = await relativePage(HOME, rootFiles);
const head = inner(home, 'head', HOME.built).replace(/<title>[\s\S]*?<\/title>\s*/i, '');
const body = inner(home, 'body', HOME.built);
await writeFile(join(out, HOME.file), `<title>${TITLE}</title>\n${head}\n${body}\n`);

// The install guide: the whole document.
await writeFile(join(out, GUIDE.file), await relativePage(GUIDE, rootFiles));

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
await check(join(out, HOME.file));
await check(join(out, GUIDE.file));
for (const name of code) await check(join(assetsOut, name));
if (/<\/?(html|head|body)[\s>]|<!doctype/i.test(await readFile(join(out, HOME.file), 'utf8'))) {
  problems.push(`${HOME.file} still has a doctype, html, head or body tag`);
}
const guide = await readFile(join(out, GUIDE.file), 'utf8');
if (!/^<!doctype html>/i.test(guide) || !/<head[\s>]/i.test(guide) || !/<body[\s>]/i.test(guide)) {
  problems.push(`${GUIDE.file} is not a complete document (doctype, head and body)`);
}
if (problems.length) fail(`the preview is not self-contained:\n  ${problems.join('\n  ')}`);

// files.txt: what has to be published beside index.html
const listed = (await walk(out))
  .map((file) => relative(out, file).split(sep).join('/'))
  .filter((path) => path !== HOME.file)
  .sort();
await writeFile(join(out, 'files.txt'), `${listed.join('\n')}\n`);

console.log(`preview-bundle: wrote ${out} (${HOME.file}, ${GUIDE.file} and ${listed.length - 1} more files)`);
