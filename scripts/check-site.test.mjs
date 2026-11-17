import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, afterEach, beforeEach, describe, test } from 'node:test';
import { CACHE_BUST, PAGES, checkSite } from './check-site.mjs';

const RELEASE = {
  'install.sh': Buffer.from('#!/bin/sh\necho floti\n'),
  'update.json': Buffer.from('{"version":"3.0.0"}\n'),
};

/** What the stand-in serves for each page, by path, and the built site holds. */
const SITE = {
  '': '<!doctype html><title>Floti</title>',
  'install/': '<!doctype html><title>Install Floti</title>',
  '404': '<!doctype html><title>Not found</title>',
};

/**
 * A short deadline for the runs that are meant to fail, with room for several
 * tries on a slow machine. The tests assert on what failed and why, never on
 * how many tries fit in it.
 */
const SHORT = { deadlineMs: 1_500, intervalMs: 50, minTryMs: 300 };
/** A long one for the runs that are meant to pass: they end as soon as they do. */
const LONG = { deadlineMs: 30_000, intervalMs: 10, minTryMs: 300 };

/**
 * A stand-in for GitHub Pages: the pages, /404 with a 200, the release files
 * in RELEASE, and 404 for anything else. `override` answers first when it
 * returns true.
 */
function pages(override = () => false) {
  const requests = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push(url);
    if (override(url, res)) return;
    const path = url.pathname.slice(1);
    if (path in SITE) {
      res.writeHead(200, { 'content-type': 'text/html' }).end(SITE[path]);
    } else if (path in RELEASE) {
      res.writeHead(200).end(RELEASE[path]);
    } else {
      res.writeHead(404, { 'content-type': 'text/html' }).end('not found');
    }
  });
  return { server, requests };
}

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/`;
}

describe('checkSite', () => {
  const runs = [];
  const servers = [];
  let root;
  let built;
  let lines;
  const log = (line) => lines.push(line);

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'floti-check-site-'));
    runs.push(root);
    for (const [name, bytes] of Object.entries(RELEASE)) await writeFile(join(root, name), bytes);
    built = join(root, 'dist');
    for (const { path, file } of PAGES) {
      await mkdir(dirname(join(built, file)), { recursive: true });
      await writeFile(join(built, file), SITE[path]);
    }
    lines = [];
  });

  afterEach(async () => {
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      server.close();
      await once(server, 'close');
    }
  });

  after(() => Promise.all(runs.map((dir) => rm(dir, { recursive: true, force: true }))));

  async function serve(override) {
    const site = pages(override);
    servers.push(site.server);
    return { url: await listen(site.server), requests: site.requests };
  }

  test('passes when the pages answer 200, a made-up path 404 and the release files match', async () => {
    const { url, requests } = await serve();
    const { ok, results } = await checkSite({ url, root, log, ...LONG });
    assert.equal(ok, true, lines.join('\n'));
    const paths = results.map((result) => result.path);
    assert.deepEqual(paths.slice(0, 3), ['/', '/install/', '/404']);
    assert.match(paths[3], /^\/floti-site-check-/);
    assert.deepEqual(paths.slice(4), ['/install.sh', '/update.json']);
    assert.equal(requests.length, results.length);
  });

  test('requests only the release files that are in the repository', async () => {
    await rm(join(root, 'install.sh'));
    const { url, requests } = await serve();
    const { ok } = await checkSite({ url, root, log, ...LONG });
    assert.equal(ok, true);
    const asked = requests.map((request) => request.pathname);
    assert.ok(asked.includes('/update.json'));
    for (const absent of ['/install.sh', '/install.ps1', '/update.json.minisig']) assert.ok(!asked.includes(absent));
  });

  test('gives every request a cache-busting query of its own', async () => {
    let installTries = 0;
    const { url, requests } = await serve((request, res) => {
      if (request.pathname !== '/install/' || ++installTries > 2) return false;
      res.writeHead(503).end();
      return true;
    });
    const { ok } = await checkSite({ url, root, log, ...LONG });
    assert.equal(ok, true);
    const busts = requests.map((request) => request.searchParams.get(CACHE_BUST));
    assert.ok(busts.every(Boolean), 'every request has the query');
    assert.equal(new Set(busts).size, busts.length, 'no two requests share one');
  });

  test('tries a URL again until it passes', async () => {
    let tries = 0;
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/update.json' || ++tries > 3) return false;
      res.writeHead(404).end();
      return true;
    });
    const { ok, results } = await checkSite({ url, root, log, ...LONG });
    assert.equal(ok, true);
    assert.equal(results.find((result) => result.path === '/update.json').attempts, 4);
  });

  test('fails when a release file differs from the repository and says how', async () => {
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/install.sh') return false;
      res.writeHead(200).end('#!/bin/sh\necho old\n');
      return true;
    });
    const { ok, results } = await checkSite({ url, root, log, ...SHORT });
    assert.equal(ok, false);
    const failed = results.filter((result) => !result.ok);
    assert.deepEqual(failed.map((result) => result.path), ['/install.sh']);
    assert.ok(failed[0].attempts > 1, 'it retried before giving up');
    assert.ok(
      lines.some((line) => /^failed \/install\.sh: answered 200, but its 19 bytes differ from the repository's 21/.test(line)),
      lines.join('\n'),
    );
  });

  test('fails when a page does not answer 200 and prints its last answer', async () => {
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/404') return false;
      res.writeHead(404).end();
      return true;
    });
    const { ok } = await checkSite({ url, root, log, ...SHORT });
    assert.equal(ok, false);
    assert.ok(lines.some((line) => /^failed \/404: answered 404, not 200 \(last of \d+ tries\)$/.test(line)), lines.join('\n'));
    assert.match(lines.at(-1), /^check-site: 1 of 6 URLs at .* did not pass within 1500ms$/);
  });

  test('fails when a made-up path does not answer 404', async () => {
    const { url } = await serve((request, res) => {
      res.writeHead(200).end(RELEASE[request.pathname.slice(1)] ?? 'everything is here');
      return true;
    });
    const { ok, results } = await checkSite({ url, root, log, ...SHORT });
    assert.equal(ok, false);
    const failed = results.filter((result) => !result.ok);
    assert.equal(failed.length, 1);
    assert.match(failed[0].path, /^\/floti-site-check-/);
    assert.equal(failed[0].detail, 'answered 200, not 404');
  });

  test('a request that never answers is bounded by the deadline', async () => {
    const { url } = await serve((request) => request.pathname === '/install/');
    const started = Date.now();
    const { ok, results } = await checkSite({ url, root, log, ...SHORT });
    assert.equal(ok, false);
    assert.ok(Date.now() - started < SHORT.deadlineMs + 10_000, 'the run ended at its deadline, not the request timeout');
    assert.match(results.find((result) => result.path === '/install/').detail, /^no answer within /);
  });

  test('reports the last answer a URL got, not a later try that timed out', async () => {
    let tries = 0;
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/install/') return false;
      if (++tries === 1) res.writeHead(503).end();
      return true; // every later try gets no answer
    });
    const { ok, results } = await checkSite({ url, root, log, ...SHORT, requestTimeoutMs: 400 });
    assert.equal(ok, false);
    const install = results.find((result) => result.path === '/install/');
    assert.ok(install.attempts > 1, 'it tried again after the 503');
    assert.equal(install.detail, 'answered 503, not 200');
  });

  test('starts no try with less than minTryMs left before the deadline', async () => {
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/404') return false;
      res.writeHead(404).end();
      return true;
    });
    const { ok, results } = await checkSite({ url, root, log, deadlineMs: 500, intervalMs: 10, minTryMs: 1_000 });
    assert.equal(ok, false);
    assert.ok(results.every((result) => result.attempts === 1), 'only the first try ran');
    assert.equal(results.find((result) => result.path === '/404').detail, 'answered 404, not 200');
  });

  test('fails with the network error when nothing answers', async () => {
    const { server } = pages();
    const url = await listen(server);
    server.close();
    await once(server, 'close');
    const { ok, results } = await checkSite({ url, root, log, ...SHORT });
    assert.equal(ok, false);
    assert.ok(results.every((result) => !result.ok));
    assert.match(results[0].detail, /^request failed: ECONNREFUSED$/);
  });

  test('with the built site, passes when every page serves its built bytes', async () => {
    const { url } = await serve();
    const { ok, results } = await checkSite({ url, root, built, log, ...LONG });
    assert.equal(ok, true, lines.join('\n'));
    for (const path of ['/', '/install/', '/404']) {
      assert.equal(results.find((result) => result.path === path).detail, "answered 200 with the build's bytes");
    }
  });

  test('with the built site, tries a stale page again until the new one is served', async () => {
    let tries = 0;
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/' || ++tries > 2) return false;
      res.writeHead(200).end('<!doctype html><title>the old stub</title>');
      return true;
    });
    const { ok, results } = await checkSite({ url, root, built, log, ...LONG });
    assert.equal(ok, true, lines.join('\n'));
    assert.equal(results.find((result) => result.path === '/').attempts, 3);
  });

  test('with the built site, fails at the deadline while a page stays stale', async () => {
    const { url } = await serve((request, res) => {
      if (request.pathname !== '/install/') return false;
      res.writeHead(200).end('<!doctype html><title>old</title>');
      return true;
    });
    const { ok, results } = await checkSite({ url, root, built, log, ...SHORT });
    assert.equal(ok, false);
    const failed = results.filter((result) => !result.ok);
    assert.deepEqual(failed.map((result) => result.path), ['/install/']);
    assert.ok(failed[0].attempts > 1, 'it retried before giving up');
    assert.ok(
      lines.some((line) => /^failed \/install\/: answered 200, but its 33 bytes differ from the build's 43 /.test(line)),
      lines.join('\n'),
    );
  });

  test('with the built site, a page missing from it is an error, not a pass', async () => {
    await rm(join(built, '404.html'));
    const { url, requests } = await serve();
    await assert.rejects(checkSite({ url, root, built, log, ...LONG }), { message: /404\.html is missing/ });
    assert.equal(requests.length, 0, 'nothing was requested');
  });

  test('stops on an address that is not a site URL', async () => {
    await assert.rejects(checkSite({ url: 'floti.dev', root, log }), { message: /is not a URL/ });
    await assert.rejects(checkSite({ url: 'ftp://floti.dev/', root, log }), { message: /not an http or https address/ });
  });
});
