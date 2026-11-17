// Renders public/og.png, the 1200x630 picture a shared floti.dev link shows:
// scripts/og-image.html with the lockup (src/assets/brand/lockup.svg) and the
// hero's tagline (copy.yaml's hero.headline) put in, screenshotted in
// Chromium. Run it by hand after changing either, and commit the PNG.
//
//   node scripts/og-image.mjs [playwright]
//
// playwright is the folder of a Playwright install (or set PLAYWRIGHT to it);
// without one the script imports `playwright` as a package. Playwright is not
// one of the site's dependencies, and its Chromium must be installed
// (`npx playwright install chromium` from that install).

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGE = new URL('./og-image.html', import.meta.url);
const OUT = resolve(ROOT, 'public/og.png');
const WIDTH = 1200;
const HEIGHT = 630;
const FONT = 'italic 800 56px "JetBrains Mono"';

/** The Playwright module from the given install folder, else the package. */
async function loadPlaywright(spec) {
  if (!spec) {
    return import('playwright').catch((error) => {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      throw new Error('Playwright is not installed here: pass the folder of a Playwright install, or set PLAYWRIGHT to it.');
    });
  }
  return createRequire(import.meta.url)(resolve(spec));
}

/** copy.yaml's hero.headline, the text the picture shows. */
async function readHeadline() {
  const copy = parse(await readFile(resolve(ROOT, 'copy.yaml'), 'utf8'));
  const headline = copy?.hero?.headline;
  if (typeof headline !== 'string' || headline.trim() === '') {
    throw new Error('copy.yaml: "hero.headline" is missing or empty.');
  }
  return headline.trim();
}

/** The lockup's SVG, decorative here: the picture's alt names it. */
async function readLockup() {
  const svg = await readFile(resolve(ROOT, 'src/assets/brand/lockup.svg'), 'utf8');
  return svg
    .trim()
    .replace(/\s(role|aria-label)="[^"]*"/g, '')
    .replace('<svg ', '<svg aria-hidden="true" ');
}

async function main() {
  const [headline, lockup] = await Promise.all([readHeadline(), readLockup()]);
  const { chromium } = await loadPlaywright(process.argv[2] ?? process.env.PLAYWRIGHT);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(fileURLToPath(PAGE)).href);
    const problem = await page.evaluate(
      async ({ headline, lockup, font, width, height }) => {
        document.getElementById('lockup').innerHTML = lockup;
        document.getElementById('headline').textContent = headline;
        await document.fonts.load(font, headline);
        await document.fonts.ready;
        if (!document.fonts.check(font, headline)) return 'the JetBrains Mono font file did not load';
        for (const id of ['lockup', 'headline']) {
          const box = document.getElementById(id).getBoundingClientRect();
          if (box.left < 0 || box.top < 0 || box.right > width || box.bottom > height) {
            return `#${id} runs past the ${width}x${height} frame`;
          }
        }
        return null;
      },
      { headline, lockup, font: FONT, width: WIDTH, height: HEIGHT },
    );
    if (problem) throw new Error(`og-image.html: ${problem}.`);
    await page.screenshot({ path: OUT, type: 'png' });
  } finally {
    await browser.close();
  }
  console.log(`Wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
