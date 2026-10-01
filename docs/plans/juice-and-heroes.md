# Plan: juice and hero interactions

Status: **prototype on `/dev/hero`** (owner, 2 Oct 2026). Nothing goes into lessons until the owner
has seen the preview and the numbers. Brand, minimalism and accessibility rules all apply.

## 1. Juice across every card type (after the prototypes are approved)
- **Natural dragging:** `@use-gesture/react` for drag and fling, with motion springs
  (`PRESS_SPRING`-like, ≤7% overshoot) for momentum and snapping; drop targets attract the item
  within ~24px. Replaces dnd-kit's default feel in sort_bins, drag_to_order and teardown drags, but
  keeps dnd-kit's keyboard and screen-reader support (gestures add feel, they don't remove paths).
- **Sound:** `howler.js` plays a sprite of short sounds (snap, whoosh, correct ding, soft wrong).
  The sounds stay **synthesised and original** (rendered once from our Web Audio voices into a WAV
  in memory, then handed to Howler), so there are still no audio files to license. Sounds follow the
  existing toggle (`preferences.sound`) and play only after the first tap. Browsers can't tell
  whether a phone is on silent; iOS mutes web audio in silent mode anyway, and Android follows the
  media volume. A "Sounds in lessons" default of on stays, with the toggle one tap away.
- **Haptics:** a tiny vibration (≈12 ms) on correct answers where supported (Android); off under
  reduced motion or with sound off (as today).
- **Under 100 ms:** every touch gives visual feedback on the next frame (pressed state, lift, ring);
  checked with Event Timing in the perf script.

## 2. Three hero prototypes (`/dev/hero`, each lazy-loaded, nothing on other pages)
- **3D phone (Inside Your Devices)**, React Three Fiber + drei: a simplified, brand-coloured phone
  built from shapes (no downloaded model): spin it with a finger, press **Pull apart** to explode it
  into back cover, battery, board, CPU, RAM, storage and camera; tap a part to see its name and job
  (the same one-line jobs as the explore cards). No zoom, no free camera.
- **Packet race (How the Internet Works)**, Matter.js: tap **Send** and five numbered packets
  bounce through router pegs to the other phone; one gets lost on the way, the receiver notices the
  gap and asks for it again, and the resent packet arrives so the message completes.
- **Train the model (How AI Really Works)**: fling or tap fruit pictures into "the model"; each
  one flies in with a spring and the model's guess for the yellow apple visibly flips when the
  golden apple goes in.

## 3. Measuring (the numbers decide)
`npm run e2e:hero-perf` (Playwright on the preview build): a **mid-range phone** (360×740, CPU
slowed 4×, 4G-like network) and the **Instagram in-app browser** (its user agent, 360×560, CPU 6×,
slower network). For each hero: download size of its own code, time until it can be touched,
frame rate while it animates (average and worst 5%), and tap-to-paint delay.

## 4. Fallbacks
- **Reduced motion:** every hero renders its final state still (exploded phone with labels, the
  finished race as a diagram, the fruit already in the model).
- **Slow devices:** if the first second runs below ~40 fps, or the device reports ≤2 CPU cores or
  ≤2 GB of memory, the 3D phone switches to the 2D phone scene and the race to a simple animated
  diagram (no physics).
- **No WebGL:** the 2D fallback.
