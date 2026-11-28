# Bubble Magic — Development Handoff

## Current status

Prototype 0.9.1 is implemented. Read README.md for usage and TESTING.md for verified behavior and limits. GAME_DESIGN.md remains the broader design proposal.

Development now takes place on a Windows PC without a camera. The user can test the hosted game from another laptop's browser without installing ChatGPT. The older personal Mac is a 2018 Intel i5 MacBook Pro with 8 GB RAM; it has not been benchmarked.

## Next steps

1. Test the live-camera path on the other laptop in Chrome. Inspect its copied diagnostics.
2. Validate one player, then two, in the real play area; check framing, hand alignment, cutout edges, tracking loss, and responsiveness.
3. Test different heights and natural movement, then HDMI TV display latency.
4. Tune target reach, rate, and reward progression based on playtesting.
5. Add explicit player admission if needed. Current prototype uses up to two detected people automatically, so bystanders must stay out of view.
6. Test Safari and actual lower-powered hardware before claiming support/performance there.

All video processing must stay in the browser on the device. Do not record or upload camera frames. Use localhost for development and HTTPS for deployment. Keep pinned model files, asset licenses, and GitHub Pages repository-relative URLs in mind. Deployment target is main / root on GitHub Pages.

## Scope differences from the design proposal

- No explicit raise-hand join or reliable bystander exclusion yet.
- No untimed practice setting; a 3-second hands-present countdown starts scored play automatically.
- Accessories use AI artwork with approximate body attachment.
- The diagnostic sample image is a static-pose test, not a video or live-camera benchmark.
- No persistent wardrobe storage, fully offline packaging, or camera selection menu.
- No projector/ball-impact detection work.

## Workflow

Commit code, setup instructions, tested behavior, and remaining issues so development can move between computers. Do not commit personal camera recordings, secrets, or machine-specific credentials. Verify performance on the actual Mac; mouse simulation and prerecorded input cannot establish live-camera performance.

## Suite expansion (0.6.0)
Play Garden is the suite name; existing repository and Pages URL are unchanged. Three games are playable. game-modes.js owns difficulty values and movement rules. Next: live camera playtest of fruit swipes and pet reach zones; tune speeds for the two children; consider per-game themes; generated fruit/pet sprites are now included.

## Version 0.6.0
Visible Solo/Together controls, shared score, AI knife/basket wrist props, varied bubble hitboxes, swipe-aligned fruit cuts, and clearer rewards at 5/15/30 catches. Preview rewards does not grant progress. Solo defaults on page load. Test props and directional slicing with real webcam; code and mouse tests do not establish live tracking feel.

Latest: 0.10.0 adds original Web Audio melodies (`music.js`), visible fullscreen controls with expanded-view fallback, and expanded regression coverage plus `.github/workflows/tests.yml`. Music is opt-in and muted outside active rounds.

Latest: 0.11.0 replaces pet baskets with separate hand-to-hand nets for every player. JumpTracker in tree-game.js detects torso rise/landing; either player advances shared tree growth. Four jumps from an empty tree release the first two treasures. Branch items ease toward growth/opacity targets; only further jumps release mature items. Cats, dogs, apples and oranges score shared points; no pet-game cacti. Demo Jump! button or Space simulates a jump.

0.11.2: tree roots grounded at 83% stage height; branch positions adjusted. Camera imageRect now covers the whole stage with no crop. Native camera aspect ratio may be stretched to match stage; video and pose coordinates stay aligned. Camera requests ideal 1280x720 and stage aspect ratio; inference stays at 640px (480px light).

0.11.3: sound defaults on; baseSession unlocks AudioContext from the Play gesture. Existing Music button mutes music and effects for all subsequent games until toggled back on. No audio plays on initial page load.

0.12.0: pets forces Easy/gentle internally and hides difficulty/hazard controls. Fixed max 14 falling; 4 new branch items per jump; 18 branch-item cap. New 2x2 tree-treasures-ai-v1.png cells: squirrel, pear, peach, cherries. treasureArt renders new sheet throughout growth/drop/catch. Woven net uses the same sag polygon for rendering and collisions.

## Jungle Trail feature branch handoff — 2026-11-26

Baseline verified: clean 976acad, package 0.12.0, all 53 tests passing. Implementation is on feature/jungle-trail. runner.html/css/js and runner-core.js isolate the new single-player course; index.html only adds its menu link. Existing gameplay and vision-worker files remain unchanged. npm run check includes the new modules. 65 tests now pass, including 12 runner tests. No deployment or version release has been made.

Browser QA was attempted but blocked: browser-extension surfaces were unavailable; native Chrome getApp twice failed with unknown/expired node_repl continuation; recovered in-app browser could not reach the Windows localhost server (ERR_CONNECTION_TIMED_OUT). Do not describe this as a visual browser playtest. Production renderer/update/input paths were exercised under Node with DOM/canvas doubles. Next priority is real browser visual QA, followed by webcam and TV testing, then movement threshold tuning. No physical-camera, physical-touch, Safari or old-Mac benchmark performed.

Keep the conservative pause-on-uncertainty behavior. Explicit reselection is preferable to unverified automatic reacquisition. See README for limitations. Add motion prediction/appearance evidence only with appropriate local processing and tests; never imply pose indices are persistent identities.

Jungle Trail visual refresh: deterministic voxel forest with layered canopy, mossy ruins, grass and mushrooms, stone lane paving, faceted star collectibles, atmospheric haze and a stitched explorer backpack. Renderer still uses bounded Canvas 2D projected geometry; no WebGL/assets added. Core movement/collision unchanged. Real browser keyboard/touch-button demo tested, but physical webcam/old-Mac performance remains unverified.

Runner tracking fix: identify by shoulders/hips (not ankle confidence); gate marching on knee visibility. Brief missing/partial torso pauses and can recover within 1200 ms; crossing/nearby bystanders, replacement, and longer loss still require reselection. Fresh-frame budget 700 ms; slow inference pauses without permanently blocking. Expanded synthetic regression coverage; needs real laptop webcam validation.

Build runner-04: persistent bottom-right ID, mirrored pose body-outline overlay, session-only shirt/trousers RGB-chromatic histograms with optional frontal face-color cue (not face recognition). Features extracted from the returned inference frame before disposal, not a newer video frame. Appearance anchor stays fixed until reselect/end; ambiguous overlapping/similarly dressed people pause. Reacquisition needs 3 matching frames over 450 ms. No photos, localStorage, identity embeddings or uploads. Physical camera accuracy remains unverified; synthetic coverage tests matching, lighting, overlap, missing cues, stale overlays and reset.

Build runner-05: automatic forward running in demo and when camera player lock is fresh. No knee-alternation detection or march button. Jump/duck/lean remain; pause, stale tracking, missing player and appearance uncertainty freeze travel/collisions. Regression verifies stationary locked player advances and stale tracking stops.

Build runner-06: star bursts, flying star to HUD, +1 text, warm collision border/wobble and jump/duck prompts; medal finish panel and 8-second bounded fireworks. runner-effects.js owns cosmetic effects, frozen on pause and cleared on restart. Fixed camera replay silently becoming demo: replay preserves mode, reopens camera and requires fresh player lock plus new Movement baseline. Session-token guard rejects all old-worker replies. 84 tests pass; full demo browser round and replay visually verified, camera restart tested with mocked camera/worker and poses (no physical webcam test).

Build runner-07: Hopping Logs/River Hops each have 3 full-width logs at 12 m spacing. Leaf/Vine Tunnels require continuous ducking across 24 m; one collision or clear event per tunnel, with no repeat penalties. Section cues warn 18 m early and prompt jump 2.7 m before each log. Conflicting legacy hazards removed around sections. At 350 m a stone-and-gold temple doorway with banners/open doors marks the destination, preserving finish fireworks. Browser inspected section warnings, tunnels and destination; 87 tests pass.

Suite 0.12.1: tree art is 93% of stage height, grounded at 94%. Branch growth and release centers are at 11–16% of stage height, with sprite bounds in the top quarter. Root-relative coordinates keep branch/release positions aligned. Runner build 07 unchanged.

Suite 0.12.2: corrected oversized tree composition: art is 165% stage height and 160% width, rooted at 94%, with canopy cropped beyond top/sides. Spawns span 6–94% of stage width, remaining at 11–16% height.

- v0.12.3: reduced tree height to 110% while retaining 160% width and grounded roots. The cropped canopy now stays visible behind the full-width 11–16% spawn band, instead of exposing the trunk there.

- v0.13.0: Fruit Slice Remix is a separate Preview card. Original fruit rules retained. Dedicated fruit-remix.js owns wave pacing, per-hand directional swipe combos, juicy cut surfaces and slice audio. No Remix obstacles; 3/4/5-fruit waves then 7-fruit finale at 50 seconds. Tests cover full rounds, touch combos, resets and no hazards.

- v0.13.1: Remix-only automatic four-person roster (900ms join, 1500ms style reservation), unique per-player cyan/coral/gold/violet trails with circle/diamond/star/cross accents. Other games retain existing player controls. Positional tracking cannot guarantee identity through overlapping people.

- v0.13.2: Remix wave sizes scale with joined players: +2 fruit per extra person (opening 3/5/7/9; finale 7/9/11/13). Multiplayer waves enter from both sides, reserve population for 1.5-second tracking gaps, cap targets at 32. Solo and other games retain pacing.

- v0.13.3: Bubble Magic now shares automatic joining (up to 4) with Remix; no player-count picker or settings override. Existing bubble pacing and props preserved; original Fruit Slice and Cats & Dogs retain their selection.

- v0.14.0: Bubble Magic uses AI-generated fairy atlas (assets/fairies-ai-v2.png), groups from randomized outside edges, mirrored sprites/wand origins, and growing wand bubbles. Giant bubbles release six non-recursive little bubbles with 450ms protection. FairyGarden owns spawning; capped live fairies and bubble emissions; pause/replay tested.

- v0.14.1: Fairy routes use cubic curves (S-shaped cross-screen sweeps and top/side swoops). No bottom entrances or exits; sprite mirroring follows horizontal tangent.

- v0.15.0: Shared games offer 1/2/3/5 minute rounds on start screen and Settings (next-round change only). Remix cycles gentle/building/busy waves in 50-second phases for longer sessions, with a finale only in the final 10 seconds. Jungle Trail remains distance-based.

- v0.15.1: Remix now varies side entry heights, apex locations, gentle flight times and cluster width; solo waves sometimes enter from both sides. Adds one fruit per wave and reduces ordinary gaps to 2.8–3.2s. Slice rules and original Fruit Slice untouched.
## Runner build 08 handoff — 2026-11-28

User reports frequent loss during ordinary movement on M1/M2 MacBook Pro Chrome and requests removal of ducking. Build 08 removes duck inputs, pose action, low obstacles, tunnel rendering and effects/cues. Tracking retains continuity despite moderate appearance changes or brief missing colour evidence, tolerates one marginal torso landmark, keeps up to eight appearance references with bounded adaptation, and preserves strict recovery after ambiguity. No frame may advance gameplay after a reported pose gap, crossing or stale-frame pause. Diagnostic reports contain aggregate timings and cause counts only. Existing games and shared vision worker unchanged. Work isolated in a separate worktree because concurrent edits exist in the original checkout.
