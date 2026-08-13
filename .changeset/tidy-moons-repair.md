---
'@surdeddd/liquidglass': minor
---

The fps watchdog now helps the tier most pages actually use.

It only ever armed for an auto-selected `webgl-overlay`, the one tier it could re-mount. A Chromium
page full of `css-svg` lenses — the common case — had no recovery path at all: it just stayed slow.

Measured on ten lenses scrolling continuously, headed Chromium, M-series: 31 fps with dispersion at
three displacement passes, 54 with dispersion off, 118 with no glass on the page. Dispersion is most
of the cost, and it is the part that can be given up without losing the refraction.

So the watchdog arms whenever any surface is on `auto`, and when it fires it drops dispersion to a
single pass page-wide before re-mounting any overlay lenses. The same bench page recovers from 22 to
77 fps on its own. Explicit `backend` choices are still never re-mounted, and a page that configures
every surface by hand never arms the watchdog at all.
