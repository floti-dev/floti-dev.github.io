// @ts-check
import { fileURLToPath } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig } from 'astro/config';
import { describeReleaseState, releaseState } from './scripts/release-state.mjs';

// Whether Floti counts as released, decided once from the repository root
// (update.json there, or FLOTI_RELEASED) and handed to the pages through
// Vite's define; src/release.ts is the one module that reads it.
const release = releaseState(fileURLToPath(new URL('.', import.meta.url)));
console.log(describeReleaseState(release));

// A static site for GitHub Pages. Stylesheets and scripts are always files
// (never inlined) and nothing is turned into a data: URL, because the pages'
// Content-Security-Policy allows the site's own files and nothing inline.
// For the same reason Markdown (install.md) gets no syntax highlighting:
// the highlighter colours code with style attributes.
export default defineConfig({
  site: 'https://floti.dev',
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  vite: {
    define: {
      __FLOTI_RELEASED__: JSON.stringify(release.released),
    },
    build: {
      assetsInlineLimit: 0,
    },
  },
  markdown: {
    syntaxHighlight: false,
    processor: satteri(),
  },
  devToolbar: { enabled: false },
});
