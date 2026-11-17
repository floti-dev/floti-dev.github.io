# floti.dev

The website for Floti, served at [floti.dev](https://floti.dev) by GitHub Pages.
`CNAME` holds the domain.

The home page and the install guide (`/install/`) are built with
[Astro](https://astro.build) into static files; the not-found page is plain
HTML in `public/` and is copied into the build unchanged. GitHub Pages serves
the built `dist/` folder, not the repository as it is: the Pages workflow
(`.github/workflows/pages.yml`) runs `npm test`, builds and deploys it on
every push to `main` and when run by hand, and the repository's Pages source
is set to GitHub Actions. A pull request to `main` is tested and built but not
deployed. After each deploy the workflow's check job
(`scripts/check-site.mjs`) requests the home page, the install guide, `/404`,
a made-up path and each release file from the live site, with a query that
gets past Pages' cache, until each answers as it should or 10 minutes pass,
and fails the run naming what did not. The pages must match, byte for byte,
the site that run uploaded, so a green run means that deploy is live. `npm test` runs the tests of the
scripts in `scripts/`.

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

Whether Floti is released is not set by hand: the build counts it as
released exactly when `update.json` is at the root of the repository, which
Floti's first stable release puts there (`scripts/release-state.mjs`; the
build log says which way it went and why). Until then the install guide says
Floti is not released yet and every install box marks its commands as not
live yet. `FLOTI_RELEASED=true` or `FLOTI_RELEASED=false` forces it either
way for a build, as does the `released` choice when the Pages workflow is run
by hand.

- Nothing on the site comes from another origin: no script, font, image,
  stylesheet or tracker. Fonts are self-hosted from `@fontsource`. Each page's
  Content-Security-Policy allows the site's own files and nothing inline, so
  the build never inlines a stylesheet or script and markup has no `style`
  attributes.
- The pages are written in the brand's Sky palette. `src/styles/tokens.css`
  holds it, and the matching Floti theme for the app window in the demos.
- The lockup, wordmark, ship and one-colour ship in `src/assets/brand/` are
  the approved logo's vector files, cropped to the art and coloured from the
  page's tokens. The nav shows the lockup, the hero and the install section
  the wordmark, and the footer the one-colour ship.
  The tab icons in `public/` are the round mark: an SVG, a 32px PNG and the
  180px touch icon.
- Each section's demo is drawn in HTML, CSS and SVG and animated with GSAP:
  it plays once when it comes into view, pauses off screen, and keeps its
  final frame under reduced motion. Only the demos ship JavaScript.
- The not-found page still uses the app's own colours (`public/site.css`,
  named after the roles in the app's design system).
- Every page works at phone width.
- Floti's release job (`release.yml`'s `floti-dev` job, in the floti
  repository) commits `install.sh`, `install.ps1`, `update.json` and
  `update.json.minisig` to the root of this repository on each stable
  release. They are not in `public/`: the Pages workflow copies whichever of
  them are there into `dist/` after the build
  (`scripts/copy-release-files.mjs`), so floti.dev serves them at
  `/install.sh` and so on, and their commit starts the workflow that puts
  them live. The same commit brings `update.json`, so that build is the first
  to count Floti as released. Never commit these files by hand.
