import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { RELEASE_FILES, copyReleaseFiles } from './copy-release-files.mjs';

const SCRIPT = fileURLToPath(new URL('./copy-release-files.mjs', import.meta.url));
const run = promisify(execFile);

describe('copyReleaseFiles', () => {
  const runs = [];
  let from;
  let to;

  beforeEach(async () => {
    const base = await mkdtemp(join(tmpdir(), 'floti-copy-release-'));
    runs.push(base);
    from = join(base, 'repo');
    to = join(base, 'dist');
    await mkdir(from);
    await mkdir(to);
  });

  after(() => Promise.all(runs.map((base) => rm(base, { recursive: true, force: true }))));

  /** Writes each named file into the repository with bytes unique to it. */
  async function release(names) {
    for (const name of names) await writeFile(join(from, name), Buffer.from(`${name}\n\u0000ÿ bytes`));
  }

  test('copies all four release files byte for byte', async () => {
    await release(RELEASE_FILES);
    const result = await copyReleaseFiles(from, to);
    assert.deepEqual(result, { copied: RELEASE_FILES, missing: [] });
    for (const name of RELEASE_FILES) {
      assert.deepEqual(await readFile(join(to, name)), await readFile(join(from, name)));
    }
  });

  test('copies the files that are there and skips the rest', async () => {
    await release(['update.json', 'update.json.minisig']);
    const result = await copyReleaseFiles(from, to);
    assert.deepEqual(result, { copied: ['update.json', 'update.json.minisig'], missing: ['install.sh', 'install.ps1'] });
    assert.deepEqual((await readdir(to)).sort(), ['update.json', 'update.json.minisig']);
  });

  test('copies nothing and does not fail before the first release', async () => {
    const result = await copyReleaseFiles(from, to);
    assert.deepEqual(result, { copied: [], missing: RELEASE_FILES });
    assert.deepEqual(await readdir(to), []);
  });

  test('copies no other file from the repository', async () => {
    await release(['install.sh']);
    await writeFile(join(from, 'README.md'), 'not a release file');
    await copyReleaseFiles(from, to);
    assert.deepEqual(await readdir(to), ['install.sh']);
  });

  test('replaces a file already in the built site', async () => {
    await release(['install.ps1']);
    await writeFile(join(to, 'install.ps1'), 'stale');
    await copyReleaseFiles(from, to);
    assert.deepEqual(await readFile(join(to, 'install.ps1')), await readFile(join(from, 'install.ps1')));
  });

  test('stops when the built site is not a folder', async () => {
    await rm(to, { recursive: true });
    await assert.rejects(copyReleaseFiles(from, to), { message: /is not a folder: build the site/ });
    await writeFile(to, 'a file, not a folder');
    await assert.rejects(copyReleaseFiles(from, to), { message: /is not a folder: build the site/ });
  });

  test('stops on a failure other than a missing file', async () => {
    await release(['update.json']);
    await mkdir(join(to, 'update.json'));
    await assert.rejects(copyReleaseFiles(from, to), (error) => {
      assert.ok(error.code && error.code !== 'ENOENT', `expected a write error, got ${error.code}`);
      return true;
    });
  });

  test('the command line copies, names each file and fails without a built site', async () => {
    await release(['install.sh']);
    const { stdout } = await run(process.execPath, [SCRIPT, from, to]);
    assert.match(stdout, /^copied install\.sh$/m);
    assert.match(stdout, /^skipped update\.json: not in the repository yet$/m);

    await rm(to, { recursive: true });
    await assert.rejects(run(process.execPath, [SCRIPT, from, to]), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /^copy-release-files: .* is not a folder/m);
      return true;
    });
  });
});
