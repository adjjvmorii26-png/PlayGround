# PULSE // LATTICE

> A synchronization ritual for one organism.

A complete, self-contained rhythm-strategy game built for the IXPANSION world.
You are the pacemaker of a living lattice. A single arm of light circles the body;
every cell must be touched exactly as the arm crosses its halo. Dissonant voids must
be left alone. Chains raise the harmonic multiplier, and a full core can bend time.

**Play it:** open `index.html` directly in a browser, or serve it:

```bash
cd projects/pulse-lattice
python3 -m http.server 8080
# http://127.0.0.1:8080
```

No dependencies, no network requests, no build step. Desktop, tablet, and phone.

---

## The ritual

| Wave | Name | What changes |
|---|---|---|
| 01 | **FIRST BREATH** | Five cells, one slow heartbeat. Learn the crossing. |
| 02 | **DISSENT** | A red void appears. Touching it tears coherence. |
| 03 | **ORBIT** | The rings rotate. Meet the cells where they move. |
| 04 | **ECHO** | Some cells sleep every other revolution. Only tap the lit ones. |
| 05 | **SINGULARITY** | Nine cells, three voids, three echo cells, faster arm. |

### Rules

- **Tap a cell** (click/touch) when the sweeping arm is inside its glowing halo.
  The halo is ±0.205 rad around the exact crossing; the tight centre is a
  **PERFECT**.
- **Do not tap voids** (red, jagged, marked ×). Letting one pass untouched is a
  **CLEAN** dodge: score, a little overdrive, and no damage. Touching one costs
  12 coherence.
- **Don't tap too early.** A tap in the 0.72-rad run-up is a flinch: chain reset
  and 3 coherence lost.
- **Coherence** is your life. Misses and void contacts tear it; hits knit it back.
  Reach zero and the lattice decoheres.
- **Harmonic multiplier** rises with every three chained hits, up to ×8.
- **Overdrive** fills from hits and clean dodges. At 100%, press **SPACE** or tap
  the core: time slows, voids dissolve, and score doubles for 8 seconds. It
  carries across wave transitions if you still have time left.

### Controls

| Input | Action |
|---|---|
| Click / tap cell | Synchronize it |
| Click / tap core, **SPACE** | Release overdrive |
| **P** / **Esc** | Pause |
| **M** | Mute |
| **Enter** | Start / retry from a full-screen panel |

Sound is generated live with Web Audio: a breathing drone, a heartbeat tick on
every quarter-revolution, and a pentatonic note for each cell. No audio files.

---

## Design notes

- **The arm is the clock.** Every judgement is measured in sweep radians, not
  wall-clock milliseconds, so visuals, hit windows, and audio ticks share one
  source of timing.
- **Rotating rings are honest.** When a ring spins, the node's target time is
  shifted by the same delta as its angle. The relative approach speed is
  `sweepSpeed − ringSpin`, so the window stays fair.
- **Echo gates are staggered.** Each echo cell gets an `echoPhase`, guaranteeing
  roughly half are asleep each revolution rather than all flipping together.
- **The body remembers.** Every run builds a **memory sigil** from its hit angles
  and radii: perfect hits become gold points, ordinary hits cyan, and the current
  constellation shows through as ghosts on a failed run. The end screen can export
  the sigil as a standalone SVG.
- **Failure is legible.** Low coherence tints the core rose; void windows are red;
  sleeping echo cells are dimmed, dashed, and marked with a small *z*.

## Files

```
index.html    entire game (HTML + CSS + canvas + Web Audio)
README.md     this
PLAYTEST.md   automated browser playtest log
preview.png   hero shot
```

## Dev hooks

For testing and curious players, `window.PULSE_LATTICE` exposes:

```js
PULSE_LATTICE.state            // live state
PULSE_LATTICE.nodes()          // current cells
PULSE_LATTICE.tap(i)           // attempt a tap on cell i
PULSE_LATTICE.overdrive()      // try to release
PULSE_LATTICE.start(waveIndex) // jump to a wave (0-4)
PULSE_LATTICE.menu()
```

Deep links: `?autostart=1` starts immediately; `&wave=4` jumps to the final wave.

Best score and mute preference live in `localStorage`
(`pulseLattice.best`, `pulseLattice.muted`).
