// Checks that a deploy of floti.dev went live. The Pages workflow runs it
// after each deploy:
//
//   node scripts/check-site.mjs <site url> [built site] [--deadline <seconds>]
//
// It requests the home page, the install guide and /404 (GitHub Pages answers
// it with 404.html and a 200), a made-up path that must answer 404, and each
// release file that is at the root of this repository (install.sh,
// install.ps1, update.json, update.json.minisig), whose served bytes must
// match the repository's. Given the folder of the site the deploy uploaded
// (the workflow unpacks its Pages artifact), the three pages must also match
// that folder's index.html, install/index.html and 404.html byte for byte, so
// a pass proves this deploy is what is served, released or not; a page
// missing from the folder stops the run. Without it, a page only has to
// answer 200. Pages' CDN caches for about ten minutes, so every request
// carries a query of its own, and each URL is tried again every few seconds
// until it passes or one deadline for the whole run (10 minutes, or
// --deadline) passes; no try starts too close to it. It then prints, for
// each URL that never passed, the last answer it got (or, if none came, why),
// and exits with 1.

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { RELEASE_FILES } from './copy-release-files.mjs';

/** The query parameter that makes each request miss the CDN's cache. */
export const CACHE_BUST = 'floti-check';

/** The pages checked, and the built file each must match when a built site is given. */
export const PAGES = [
  { path: '', file: 'index.html' },
  { path: 'install/', file: 'install/index.html' },
  { path: '404', file: '404.html' },
];

/**
 * @typedef {{ path: string, status: number, bytes?: Buffer, source?: string }} Check
 * @typedef {{ path: string, ok: boolean, attempts: number, detail: string }} Result
 * @typedef {{ kind: 'answer' | 'error' | 'timeout', detail: string }} Problem
 * @typedef {{
 *   url: string,
 *   root: string,
 *   built?: string,
 *   deadlineMs?: number,
 *   intervalMs?: number,
 *   requestTimeoutMs?: number,
 *   minTryMs?: number,
 *   log?: (line: string) => void,
 * }} Options
 */

/**
 * What to request, relative to the site's URL: the pages (with the bytes of
 * their built files when `built` is given), a made-up path, and each release
 * file found in `root`.
 * @param {string} root
 * @param {string} [built]
 * @returns {Promise<Check[]>}
 */
export async function checksFor(root, built) {
  /** @type {Check[]} */
  const checks = [];
  for (const { path, file } of PAGES) {
    if (built === undefined) {
      checks.push({ path, status: 200 });
      continue;
    }
    const where = join(built, file);
    try {
      checks.push({ path, status: 200, bytes: await readFile(where), source: 'the build' });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      throw new Error(`${where} is missing: pass the folder of the site the deploy uploaded.`);
    }
  }
  checks.push({ path: `floti-site-check-${randomUUID()}`, status: 404 });
  for (const name of RELEASE_FILES) {
    try {
      checks.push({ path: name, status: 200, bytes: await readFile(join(root, name)), source: 'the repository' });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
  }
  return checks;
}

/**
 * Requests every check until each passes or the deadline passes.
 * @param {Options} options
 * @returns {Promise<{ ok: boolean, results: Result[] }>}
 */
export async function checkSite({
  url,
  root,
  built,
  deadlineMs = 10 * 60_000,
  intervalMs = 5_000,
  requestTimeoutMs = 30_000,
  // no try starts with less than this left before the deadline, so the
  // deadline never cuts one short and hides the answer before it
  minTryMs = 2_000,
  log = console.log,
}) {
  const base = siteUrl(url);
  const end = Date.now() + deadlineMs;
  const run = randomUUID().slice(0, 8);
  const checks = await checksFor(root, built);

  const results = await Promise.all(
    checks.map(async (check, index) => {
      /** @type {Result} */
      const result = { path: `/${check.path}`, ok: false, attempts: 0, detail: '' };
      // The last problem of each kind. A URL that gives up reports the last
      // answer it got, as that is what is wrong with the site; a failed
      // request, then a timeout, only when it never got one.
      /** @type {Partial<Record<Problem['kind'], string>>} */
      const last = {};
      // The first try always runs; a later one only with time left to finish.
      while (result.attempts === 0 || end - Date.now() >= minTryMs) {
        result.attempts++;
        const timeoutMs = Math.max(Math.min(end - Date.now(), requestTimeoutMs), 1);
        const problem = await probe(check, base, `${run}-${index}-${result.attempts}`, timeoutMs);
        if (problem === null) {
          result.ok = true;
          result.detail = `answered ${check.status}${check.bytes ? ` with ${check.source}'s bytes` : ''}`;
          log(`ok ${result.path}: ${result.detail} (try ${result.attempts})`);
          return result;
        }
        last[problem.kind] = problem.detail;
        if (end - (Date.now() + intervalMs) < minTryMs) break;
        await sleep(intervalMs);
      }
      result.detail = last.answer ?? last.error ?? last.timeout ?? '';
      return result;
    }),
  );

  const failed = results.filter((result) => !result.ok);
  for (const result of failed) {
    log(`failed ${result.path}: ${result.detail} (last of ${result.attempts} tries)`);
  }
  if (failed.length > 0) {
    log(`check-site: ${failed.length} of ${results.length} URLs at ${base.href} did not pass within ${formatMs(deadlineMs)}`);
  }
  return { ok: failed.length === 0, results };
}

/**
 * One request. Returns null when it passes, or what was wrong: a wrong
 * answer, a request that failed, or no answer in time.
 * @param {Check} check
 * @param {URL} base
 * @param {string} bust
 * @param {number} timeoutMs
 * @returns {Promise<Problem | null>}
 */
async function probe(check, base, bust, timeoutMs) {
  const target = new URL(check.path, base);
  target.searchParams.set(CACHE_BUST, bust);
  try {
    const response = await fetch(target, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = Buffer.from(await response.arrayBuffer());
    if (response.status !== check.status) {
      return { kind: 'answer', detail: `answered ${response.status}, not ${check.status}` };
    }
    if (check.bytes && !body.equals(check.bytes)) {
      return {
        kind: 'answer',
        detail: `answered ${response.status}, but its ${body.length} bytes differ from ${check.source}'s ${check.bytes.length}`,
      };
    }
    return null;
  } catch (error) {
    const failure = /** @type {Error & { cause?: { code?: string, message?: string } }} */ (error);
    if (failure.name === 'TimeoutError') return { kind: 'timeout', detail: `no answer within ${formatMs(timeoutMs)}` };
    return { kind: 'error', detail: `request failed: ${failure.cause?.code ?? failure.cause?.message ?? failure.message}` };
  }
}

/**
 * The site's URL as a base for relative paths.
 * @param {string} url
 */
function siteUrl(url) {
  let base;
  try {
    base = new URL(url);
  } catch {
    throw new Error(`"${url}" is not a URL: pass the site's address, such as https://floti.dev/.`);
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new Error(`"${url}" is not an http or https address.`);
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  base.search = '';
  base.hash = '';
  return base;
}

/** @param {number} ms */
function formatMs(ms) {
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000} minute${ms === 60_000 ? '' : 's'}`;
  if (ms >= 1_000 && ms % 1_000 === 0) return `${ms / 1_000}s`;
  return `${Math.round(ms)}ms`;
}

const USAGE = 'usage: node scripts/check-site.mjs <site url> [built site] [--deadline <seconds>]';

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { deadline: { type: 'string' } },
  });
  const [url, built, ...extra] = positionals;
  if (!url || extra.length > 0) throw new Error(USAGE);
  /** @type {number | undefined} */
  let deadlineMs;
  if (values.deadline !== undefined) {
    const seconds = Number(values.deadline);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`--deadline must be a number of seconds above 0. ${USAGE}`);
    deadlineMs = seconds * 1_000;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const { ok } = await checkSite({ url, root, built: built === undefined ? undefined : resolve(built), deadlineMs });
  if (!ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`check-site: ${error.message}`);
    process.exit(1);
  });
}
