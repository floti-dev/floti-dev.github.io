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

## DNS

The domain is registered at Squarespace Domains, which holds these records and
no others:

| Host | Type | Data |
|---|---|---|
| `@` | A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www` | CNAME | `floti-dev.github.io` |
| `@` | TXT | `v=spf1 -all` (the domain sends no mail) |
| `_github-pages-challenge-floti-dev` | TXT | the floti-dev org's Pages verification |

`www.floti.dev` redirects to `floti.dev`, and Pages enforces HTTPS.
