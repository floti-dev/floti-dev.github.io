// @ts-check
import { readFileSync } from 'node:fs';
import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig } from 'astro/config';
import { parse } from 'yaml';
import { switchesPlugin } from './src/markdown/switches.mjs';

// copy.yaml's switches (released, package_managers) decide which sections of
// install.md are built; src/copy.ts checks the same file.
const switches = parse(readFileSync(new URL('./copy.yaml', import.meta.url), 'utf8'));

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
    build: {
      assetsInlineLimit: 0,
    },
  },
  markdown: {
    syntaxHighlight: false,
    processor: satteri({ mdastPlugins: [switchesPlugin(switches)] }),
  },
  devToolbar: { enabled: false },
});
