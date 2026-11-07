# floti.dev

The website for Floti, served at [floti.dev](https://floti.dev) by GitHub Pages
from `main`, as it is: no build step and no Jekyll (`.nojekyll`). `CNAME`
holds the domain.

- Nothing on the site comes from another origin: no script, font, image,
  stylesheet or tracker. Each page's Content-Security-Policy says so, and a
  page that needs something from elsewhere is the wrong page.
- The colours and rules are the app's design system (`docs/DESIGN.md` in the
  app's repository): Daylight in a light scheme, Nocturne in a dark one.
  `site.css` names each role the way the app does, and a change to a value
  starts there.
- Every page works at phone width, in light and dark.
- The release workflow copies the install scripts here.
