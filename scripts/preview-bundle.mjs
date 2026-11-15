// Makes preview/: the built home page as a folder that works from any URL,
// such as a hosted preview where root-absolute paths (/_astro/...) break.
// index.html and every file it needs are copied in, and each reference
// becomes relative (./_astro/...). Links to the site's other pages point at
// floti.dev. The real GitHub Pages build in dist/ is left as it is.
//
// The preview drops the page's Content-Security-Policy: a host that wraps the
// page may add a script of its own, which that policy would block.

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'preview');
const SITE = 'https://floti.dev';

function fail(message) {
  console.error(`preview-bundle: ${message}`);
  process.exit(1);
}

if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html is missing; run the build first');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// The page and the root files it loads.
let html = await readFile(join(dist, 'index.html'), 'utf8');
const rootFiles = new Set();
html = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '')
  .replace(/(\s(?:href|src)=")\/(?!\/)([^"]*)"/g, (_, attr, path) => {
    if (path === '') return `${attr}./"`;
    if (path.startsWith('_astro/')) return `${attr}./${path}"`;
    if (existsSync(join(dist, path)) && !path.endsWith('/')) {
      rootFiles.add(path);
      return `${attr}./${path}"`;
    }
    // another page of the site
    return `${attr}${SITE}/${path}"`;
  });
await writeFile(join(out, 'index.html'), html);
for (const file of rootFiles) await cp(join(dist, file), join(out, file));

// The bundled assets, with their own root-absolute references made relative.
const astroIn = join(dist, '_astro');
const astroOut = join(out, '_astro');
if (existsSync(astroIn)) await cp(astroIn, astroOut, { recursive: true });
for (const name of existsSync(astroOut) ? await readdir(astroOut) : []) {
  if (!/\.(css|js|mjs)$/.test(name)) continue;
  const file = join(astroOut, name);
  const text = await readFile(file, 'utf8');
  // from a file inside _astro, /_astro/x is ./x
  const fixed = text.replaceAll('/_astro/', './');
  if (fixed !== text) await writeFile(file, fixed);
}

// Check: no root-absolute reference is left, and every relative one resolves.
const problems = [];
async function check(file) {
  const text = await readFile(file, 'utf8');
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
for (const name of existsSync(astroOut) ? await readdir(astroOut) : []) {
  if (/\.(css|js|mjs)$/.test(name)) await check(join(astroOut, name));
}
if (problems.length) fail(`unresolved references:\n  ${problems.join('\n  ')}`);

console.log(`preview-bundle: wrote ${out}`);
