// Decides whether the site counts Floti as released. astro.config.mjs calls
// it once per build and hands the answer to the pages (src/release.ts).
//
// Floti's release job commits update.json (with install.sh, install.ps1 and
// update.json.minisig) to the root of this repository on each stable release,
// so Floti counts as released exactly when update.json is there.
// FLOTI_RELEASED=true or FLOTI_RELEASED=false in the environment forces the
// answer either way; unset or empty leaves it to update.json, and any other
// value stops the build.

import { statSync } from 'node:fs';
import { join } from 'node:path';

/** The file whose presence at the repository root means Floti is released. */
export const RELEASE_MARKER = 'update.json';

/**
 * @typedef {{ released: boolean, reason: string }} ReleaseState
 */

/**
 * @param {string} root the repository root
 * @param {Record<string, string | undefined>} [env] the environment
 * @returns {ReleaseState}
 */
export function releaseState(root, env = process.env) {
  const forced = env.FLOTI_RELEASED ?? '';
  if (forced === 'true' || forced === 'false') {
    return { released: forced === 'true', reason: `forced by FLOTI_RELEASED=${forced}` };
  }
  if (forced !== '') {
    throw new Error(
      `FLOTI_RELEASED is "${forced}": set it to true or false to force whether Floti counts as released, or leave it unset to decide by ${RELEASE_MARKER} at the repository root.`,
    );
  }
  const found = isFile(join(root, RELEASE_MARKER));
  return {
    released: found,
    reason: found ? `${RELEASE_MARKER} found at the repository root` : `no ${RELEASE_MARKER} at the repository root`,
  };
}

/**
 * The build log line for a release state.
 * @param {ReleaseState} state
 */
export function describeReleaseState({ released, reason }) {
  return `floti.dev: Floti counts as ${released ? 'released' : 'not released yet'} (${reason})`;
}

/** @param {string} path */
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}
