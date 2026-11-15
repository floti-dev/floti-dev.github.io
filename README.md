# floti.dev

The website for Floti, served at [floti.dev](https://floti.dev) by GitHub Pages.
`CNAME` holds the domain.

The home page and the install guide (`/install/`) are built with
[Astro](https://astro.build) into static files; the not-found page is plain
HTML in `public/` and is copied into the build unchanged. GitHub Pages has to serve the built `dist/`
folder (a Pages workflow), not the repository as it is.

```sh
npm install
npm run dev            # http://localhost:4321
npm run build          # dist/, what GitHub Pages serves
npm run preview:bundle # build, then preview/: the home page and the install
                       # guide shaped for a hosted preview
                       # (see scripts/preview-bundle.mjs)
```

All of the home page's wording, from the nav to the footer and what each demo
says to a screen reader, is in `copy.yaml` at the root, with a comment over
each block saying where it shows. Edit it and rebuild; a missing or empty
entry stops the build and names the entry. Text inside the demos' drawings
(terminal lines, file names) stays in the demo components.

The install guide's prose is `install.md` at the root: Markdown, with the
headline, the paragraph under it and the not-released notice at its top. The
comment there says how to edit it. Its short labels sit in `copy.yaml` beside
the home page's.

`released: false` at the top of `copy.yaml` is the one switch for the first
stable release: while it is false the install guide says Floti is not
released yet and every install box marks its commands as not live yet. Set it
to true when the release puts the install scripts on floti.dev.

- Nothing on the site comes from another origin: no script, font, image,
  stylesheet or tracker. Fonts are self-hosted from `@fontsource`. Each page's
  Content-Security-Policy allows the site's own files and nothing inline, so
  the build never inlines a stylesheet or script and markup has no `style`
  attributes.
- The pages are written in the two brand palettes, Gold and Sky; the toggle in
  the nav switches them and remembers the choice. The home page starts in
  Gold and the install guide in Sky until the visitor picks one. `src/styles/tokens.css`
  holds both, and the matching Floti themes for the app window in the demos.
- The logo, wordmark and ship silhouette in `src/assets/brand/` are traced
  from the vector paths of the approved brand artwork and coloured from the
  palette tokens.
- Each section's demo is drawn in HTML, CSS and SVG and animated with GSAP:
  it plays once when it comes into view, pauses off screen, and keeps its
  final frame under reduced motion. Only the demos ship JavaScript.
- The not-found page still uses the app's own colours (`public/site.css`,
  named after the roles in the app's design system).
- Every page works at phone width.
- Install scripts the release workflow publishes belong in `public/`, so the
  build carries them.
