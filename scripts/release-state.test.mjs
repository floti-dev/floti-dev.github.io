import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { describeReleaseState, releaseState } from './release-state.mjs';

describe('releaseState', () => {
  let base;
  let withFile;
  let withoutFile;

  before(async () => {
    base = await mkdtemp(join(tmpdir(), 'floti-release-state-'));
    withFile = join(base, 'released');
    withoutFile = join(base, 'unreleased');
    await mkdir(withFile);
    await mkdir(withoutFile);
    await writeFile(join(withFile, 'update.json'), '{"version":"3.0.0"}\n');
  });

  after(() => rm(base, { recursive: true, force: true }));

  test('counts Floti as released when update.json is at the root', () => {
    assert.deepEqual(releaseState(withFile, {}), {
      released: true,
      reason: 'update.json found at the repository root',
    });
  });

  test('counts Floti as not released when update.json is not at the root', () => {
    assert.deepEqual(releaseState(withoutFile, {}), {
      released: false,
      reason: 'no update.json at the repository root',
    });
  });

  test('treats an empty FLOTI_RELEASED as unset', () => {
    assert.equal(releaseState(withFile, { FLOTI_RELEASED: '' }).released, true);
    assert.equal(releaseState(withoutFile, { FLOTI_RELEASED: '' }).released, false);
  });

  test('FLOTI_RELEASED=true forces released without update.json', () => {
    assert.deepEqual(releaseState(withoutFile, { FLOTI_RELEASED: 'true' }), {
      released: true,
      reason: 'forced by FLOTI_RELEASED=true',
    });
  });

  test('FLOTI_RELEASED=false forces not released with update.json', () => {
    assert.deepEqual(releaseState(withFile, { FLOTI_RELEASED: 'false' }), {
      released: false,
      reason: 'forced by FLOTI_RELEASED=false',
    });
  });

  test('any other FLOTI_RELEASED stops the build and names the value', () => {
    for (const value of ['yes', 'TRUE', '1', 'auto']) {
      assert.throws(() => releaseState(withFile, { FLOTI_RELEASED: value }), {
        message: new RegExp(`FLOTI_RELEASED is "${value}"`),
      });
    }
  });

  test('a folder named update.json does not count as a release', async () => {
    const root = join(base, 'folder');
    await mkdir(join(root, 'update.json'), { recursive: true });
    assert.equal(releaseState(root, {}).released, false);
  });
});

describe('describeReleaseState', () => {
  test('says which way it went and why', () => {
    assert.equal(
      describeReleaseState({ released: true, reason: 'update.json found at the repository root' }),
      'floti.dev: Floti counts as released (update.json found at the repository root)',
    );
    assert.equal(
      describeReleaseState({ released: false, reason: 'forced by FLOTI_RELEASED=false' }),
      'floti.dev: Floti counts as not released yet (forced by FLOTI_RELEASED=false)',
    );
  });
});
