---
'@surdeddd/liquidglass': minor
---

The page stops freezing while you scroll, and the fps watchdog can finally see what it is guarding.

Three faults compounded into the stutter people actually felt.

The overlay backend rasterized the **whole document** through `html-to-image` whenever anything
relevant mutated — and scrolling a page with reveal-on-scroll sections mutates constantly, because
each section that fades in is an attribute change. A profile of the docs site showed the cost plainly:
`setProperty`, `getPropertyValue` and `serializeToString` at the top, with main-thread freezes up to
1054 ms. Yet the texture never needed re-capturing for a scroll at all: it lives in document
coordinates, so panning cannot invalidate it. Snapshots are now held back while the viewport is
moving and taken once it settles. Measured on the docs site, interleaved A/B under matched load:
78–82 fps and 1073–1219 ms of blocking became 113–114 fps and **zero** long tasks.

The watchdog was measuring nothing. It listened on the passive frame channel, but that channel only
reports a gap when the previous frame scheduled the next one — and on a page whose only motion is
scrolling, the loop sleeps between events, so every sample it received was exactly `0` and was
discarded on arrival. It now measures in short bursts while the viewport is actually moving, taking
real timestamps instead of the delta the physics integrator clamps to 1/20 s for stability.

Its window was also counted in frames: 90 frames, three windows. At 60 fps that is a 4.5 s reaction,
but at 8 fps it is 38 s — the worse the stall, the longer the rescue took. Windows now close on
elapsed time as well, so relief arrives in seconds no matter how bad it gets. On the ten-lens
benchmark the watchdog now drops dispersion from three passes to one in both headed and software
rendering, and the settled figure went from 7–9 fps to 119.
