---
'@surdeddd/liquidglass': minor
---

Glass that stretches when it travels, and one switch that turns the whole material off.

Apple's material is liquid, and the tell is what happens when a control moves: it elongates along
its own travel and pinches across it, like a drop, then settles round again. Nothing here did that —
the physics could squash on press and drift toward a pointer, but a surface crossing the screen
arrived the same shape it left.

`physics.stretch` (0 to 1, default `0.6`) drives it from the element's measured velocity, so it works
for anything that moves the box: a spring-driven tab pill, a drag, a layout animation. The elongation
is capped at 18% and volume-compensated on the cross axis, and it rides its own spring, so it
overshoots slightly and recovers rather than snapping. It costs no extra layout reads — the velocity
comes from the rect the surface tracker already measures each frame. Set it to `0` for travel without
deformation.

`effects: false` turns everything off: no backend, no bevel, no physics, no injected layers — the
element renders exactly as authored, and flipping it back to `true` brings the material and the
chosen backend back. It is a real switch rather than a preset, so a page can offer "reduce effects"
next to its dark-mode toggle, and a consumer who wants glass on some devices and not others does not
have to branch around `attach` at all. `handle.backend` reports `'inert'` while it is off.
