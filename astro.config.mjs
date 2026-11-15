// @ts-check
import { defineConfig } from 'astro/config';

// A static site for GitHub Pages. Stylesheets and scripts are always files
// (never inlined) and nothing is turned into a data: URL, because the pages'
// Content-Security-Policy allows the site's own files and nothing inline.
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
  devToolbar: { enabled: false },
});
