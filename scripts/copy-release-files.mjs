// Copies the files Floti's release job commits to the root of this
// repository into the built site, so floti.dev serves them beside the pages:
// install.sh, install.ps1, update.json and update.json.minisig. The Pages
// workflow runs it after the build.
//
//   node scripts/copy-release-files.mjs [from] [to]
//
// from is the folder holding the files (the repository root by default), to
// the built site (dist/ by default), which must exist. Until the first stable
// release none of the files exist, so a missing one is skipped, not an error;
// any other failure to read or write one stops the run.

import { copyFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Exactly the files release.yml's `floti-dev` job commits to the site. */
export const RELEASE_FILES = ['install.sh', 'install.ps1', 'update.json', 'update.json.minisig'];

/**
 * Copies each release file found in `from` into `to`.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<{ copied: string[], missing: string[] }>}
 */
export async function copyReleaseFiles(from, to) {
  const target = await stat(to).catch(() => null);
  if (!target?.isDirectory()) {
    throw new Error(`${to} is not a folder: build the site before copying the release files into it.`);
  }
  const copied = [];
  const missing = [];
  for (const name of RELEASE_FILES) {
    try {
      await copyFile(join(from, name), join(to, name));
      copied.push(name);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      missing.push(name);
    }
  }
  return { copied, missing };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const [from = root, to = join(root, 'dist')] = process.argv.slice(2);
  const { copied, missing } = await copyReleaseFiles(resolve(from), resolve(to));
  for (const name of copied) console.log(`copied ${name}`);
  for (const name of missing) console.log(`skipped ${name}: not in the repository yet`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`copy-release-files: ${error.message}`);
    process.exit(1);
  });
}
