# PLAYTEST — PULSE // LATTICE

Automated verification run · 2026-11-04 · Chromium headless (new), no GPU.

The harness in these tests is deliberately mechanical: it taps each active sync cell
when the sweep is within 0.10 rad of the crossing, ignores voids, and releases
overdrive when the core is full. It is a correctness probe, not a difficulty
benchmark. A full run is roughly two minutes.

## What was checked

| Check | Result |
|---|---|
| Menu → play → pause → resume | Pass |
| Pointer/touch tap on a cell (synthetic `pointerdown` at cell coordinates) | Pass — score 0 → 152, hit registered |
| Perfect/good/late windows and chain multiplier | Pass — chain 29 reached ×8 |
| Void contact penalty and clean-dodge reward | Pass — dodged count tracked, coherence unchanged on clean passes |
| Overdrive release at 100% | Pass — timer set to 8.0 s, gauge switches to countdown |
| Overdrive while playing the final wave | Pass — time-dilated field, gold palette, ×2 scoring |
| Wave transition (clear → next wave) | Pass — wave 4 → wave 5 |
| Victory after wave 5 | Pass — rank A, memory sigil rendered, record saved |
| Coherence failure | Pass — 17 misses → 0 coherence → decoherence screen |
| Echo gates | Pass — 2 of 3 echo cells active at revolution 0; inactive tap scored 0 and caused no miss |
| Mobile layout at 390×844 | Pass — HUD, field, overdrive bar all fit; wave label visible |
| Console exceptions / errors | 0 |

## Sample runs

**Wave 1 autoplay (17.8 s in)**

```
score 20,368 · hits 29 · misses 0 · chain 29 · ×8 · coherence 100
overdrive active with 5.4 s remaining
```

**Final-wave autoplay → victory**

```
score 52,879 · hits 44 · misses 7 · voids untouched 33 · best chain 44
rank A · new signal record · 86% sync accuracy
```

**No-input failure (wave 1)**

```
misses 17 · coherence 0 · game over
```

**Echo wave gate probe**

```
echo cells: phases 0/1/2 → active, asleep, active
inactive tap: score 170 → 170, misses 0
```

## Notes for future passes

- The auto-harness can hit about 2 taps/second reliably; human mouse travel between
  cells is the real difficulty ceiling in waves 3–5, not raw arm speed.
- The overdrive banner is now compact and sits above the cell field so it does not
  cover a live node.
- Best score and mute state persist in `localStorage`; headless profiles start clean,
  which is why the screenshots show `BEST 0`.
