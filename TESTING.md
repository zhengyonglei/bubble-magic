# Prototype validation — 2026-11-25

## Verified locally
- Six automated gameplay tests pass: exactly-once scoring, combos/clouds, paused clocks, stale/teleported hand rejection, rewards, positional player matching.
- JavaScript syntax checks pass.
- Welcome screen, mouse practice and scoring inspected in browser at 1280 × 720.
- Actual MediaPipe model loaded with GPU delegate. A public sample photograph produced visible person segmentation and wrist tracking.

## Still to verify
- Live webcam capture, permissions, latency and tracking on the test laptop.
- Two real moving people, occlusions, children of different heights and accessory stability.
- Prerecorded video selection/playback is implemented but not yet validated end to end: the synthetic fixture download stalled in browser automation.
- Safari, the 2018 Intel Mac with 8 GB RAM, mobile layouts, TV display and extended sessions.

The sample-photo check validates inference/compositing only. Mouse play does not validate computer vision. No live-camera performance claim is made.

## First laptop test
1. Open the hosted page in Chrome and try mouse demo.
2. Choose camera, grant access, and frame one person with head and hands visible.
3. Start a round; check hand alignment and cutout responsiveness.
4. Try two people, then Challenge. Observe crossings and lost tracking.
5. End / take a break to release the camera. If slow, choose Lighter processing or disable cutout before a new session.
6. Copy Settings → Testing & diagnostics and report what felt wrong. No footage is needed.

## Version 0.2.0
User confirmed live hand tracking works on their laptop. Added butterfly wrist markers, a layered garden, faster drifting bubbles and Challenge cacti. Cacti subtract up to 20 points and reset the streak; Gentle never spawns cacti. Seven gameplay tests cover the new penalty including zero-floor and duplicate collisions. Live-camera regression testing of the new visuals remains to be done.

## Version 0.4.0
Ten unit tests pass, including Easy obstacle exclusion, ordered density/speed settings, distinct movement directions, fruit arcs and swipe gating. Browser QA covers game-menu navigation, Fruit Slice scoring and split animation, pet gameplay and cactus appearance. New game camera ergonomics and difficulty tuning need user playtesting.

## Version 0.5.0 artwork
Shared AI sprite atlas replaces procedural targets, pets, rewards, welcome mascot, menu icons and simulated people. Existing garden background is also AI-generated. UI controls and simple particle motion remain code-rendered. Atlas failure falls back to previous Canvas illustrations. Demo people are illustrative stand-ins; they are not live tracking.

## Version 0.6.0
Tests added for bubble size variety, horizontal/vertical/diagonal cut geometry and crown threshold. Shared exactly-once scoring and Easy obstacle exclusion remain covered. Live-camera ergonomics of the new hand props still require user testing.

## Version 0.7.0
21 automated tests pass. New integration tests execute the production app update loop with synthetic inputs and a minimal DOM: all three games auto-start and score; floating +10 labels appear; bars fill and unlock crown/wings; Solo Medium/Hard spawn hazards and Easy excludes them; side contacts bounce without scoring. Pure tests cover fruit size ordering and basket entry direction.

Browser mouse-mode play testing: Bubble Magic scored 50 and a cactus reduced it to 30; Fruit Slice scored 10 from a horizontally split watermelon; Cats & Dogs scored 20 from top-entry catches and displayed Boing on side hits without increasing the score. Pause froze the round. Full-body sprites, larger basket, distinct fruit sizes, visible score and reward bars inspected. Live camera, two real players, TV latency and older Mac performance remain untested in this change.

## Version 0.7.1
22 tests pass, including catch animation lifetime, full-size retention, pause behavior and exactly-once scoring. Browser mouse testing confirmed no illustrated player, larger animals, a puppy visibly descending and sitting behind the basket front, and score increasing once per catch. Saved preview captures the puppy inside the basket. Camera regression remains untested.

## Version 0.7.2
25 tests cover smaller basket geometry, two-person hand grouping, midpoint camera catches (synthetic tracking input), and crown bounds above the eyes. Camera appearance at approximately two meters still requires a laptop check; the webcam has no metric distance calibration.

## Version 0.8.0
Tests cover off-screen bubble entry, increased bubble density, hidden bubble difficulty controls, no bubble obstacles, multi-finger quick taps released between frames, exactly-once scoring and touch cancellation. Other games retain difficulty/cactus tests. Physical-phone touch responsiveness and live-camera ergonomics require device testing.

Version 0.8.0 verification: 28 automated checks pass. Browser QA at 390 × 844 confirmed the difficulty picker is absent for Bubble Magic, the game fits the portrait viewport, many bubbles stream in from the sides, and swipe pops display rings/sparkles and award points and rewards. Browser preview uses mouse input; multi-touch behavior was tested with synthetic pointer events, not a physical phone.

## Version 0.9.0
31 automated tests pass. New checks verify off-screen launch, center apex and downward fall for all difficulties, camera-jump rejection versus valid direct-input sweeps, and a quick mobile swipe that scores, produces directional fruit halves, and creates a fading trail. Physical-phone and live-camera checks remain to be done on the user devices.

Browser QA at 390 x 844 confirmed upward fruit tosses, no knife prop, a visible violet/white swipe trail, two fruit sliced for 20 points, and directional separation of the halves. No browser runtime errors observed.

## Version 0.9.1
Trajectory tests cover center-directed side launches and complete off-screen sprite placement on landscape and portrait aspect ratios. Entry collision gating prevents hits while fruit is still entering.

## 0.9.2 — Bubble Magic rendering regression
Restored butterfly renderer accidentally removed in 0.9.0. Added production draw tests for active hands in all three games with loaded and fallback artwork. Test reproduced `ReferenceError: butterfly is not defined` before the fix.

## 0.10.0 — Rendering, fullscreen and music coverage
Added complete-round draw checks across all games, difficulty levels and loaded/fallback artwork; camera-pose reward rendering; fullscreen enter/exit/fallback/Escape; audio initialization failures; opt-in music, pause, hidden-tab and end-round muting; bounded music scheduling after suspension. GitHub Actions runs syntax checks and all tests on pushes and pull requests.
Browser smoke test: fullscreen layout, active butterfly input and scoring, music on/off, pause and fullscreen exit; no console errors. Audio scheduling is tested with an AudioContext test double; actual speaker sound and HDMI hardware were not verified.

## 0.11.0 — Jump-grown treasure tree
Regression tests cover torso rise/landing, jitter and tracking loss, two independent nets, side/mesh contact, fast object and net sweeps, gradual tree growth and repeated-jump release, shared scoring, pause, and camera-pose integration. Full-round draw tests exercise the growing tree and caught treasures. Browser smoke test checked successive Jump! presses reveal, grow and release treasures, and net catches add points. Live physical jumps and two-person webcam performance still need laptop testing.

## 0.11.1 — Grounded tree
Tree roots now sit at the garden ground line with a contact shadow. Shaking pivots at the roots. Treasure branch positions follow the taller canopy.

## 0.11.2 — Full-area camera
Camera video/cutout and pose coordinates share full-canvas bounds for all games. Preserve both camera edges without a centered letterbox or reserved bottom strip. Request a widescreen camera stream when available; inference remains downscaled. Regression coverage includes mirrored camera edges and center on TV, desktop and portrait layouts.

## 0.11.3 — Music on game start
Background music defaults on for all games. Audio is unlocked by the Play action, with mute preserved between games in the current page. Regression tests cover each game’s melody activation, camera/video audio setup, mute across sessions, and existing pause/visibility/error behavior.

## 0.12.0 — Treasure variety and woven net
Added coverage for fixed tree-party settings, larger batches, mixed treasure types and no hazards after switching from Hard Fruit Slice. Existing draw tests cover new sprites with loaded and fallback art, net rendering and complete rounds.

## Jungle Trail prototype — 2026-11-26

65 Node tests pass (53 baseline plus 12 new). New coverage: no movement without marching, full pause, exactly-once stars, harmless obstacles, jump/duck clearance, lane avoidance, course completion, sustained deliberate admission, distant newcomer/reordering, crossing/ambiguity, occlusion/partial landmarks, exit/replacement and stale tracking. Synthetic movement covers knee alternation, jump edge, squat and mirrored lean. Production-page tests execute draw/update with DOM/canvas doubles, marching/scoring, pause/restart, pointer cancellation, blur cleanup and camera uncertainty collision freeze. Syntax and diff whitespace checks pass.

These are synthetic tests, not a real browser or camera validation. Browser automation failed before visual verification (native Chrome continuation failure; in-app browser localhost timeout). No measured frame rate or memory usage is claimed.

Laptop acceptance checklist:
1. Start local preview and open runner.html. Inspect menu, desktop/portrait layout, explorer visibility, lane/obstacle alignment, scoring, jump/duck timing, finish/restart, fullscreen and keyboard/touch combinations.
2. Enable camera on HTTPS or localhost. Frame one full body. Hold both hands raised in the outline; verify no play starts before admission. March, stop, lean, jump, squat and check comfort at both children's heights.
3. A newcomer at the edge must not control the game. Bring them near/crossing the player: simulation and collisions must freeze. Have the player leave, partly hide, or be occluded. No bystander takeover; clear the scene and deliberately select again. Detector misses/merged poses remain a known limitation.
4. Hide tab, return, resume and reselect. Check stop-camera and navigation release webcam indicator. Test camera denial/model failure and switching to keyboard.
5. On 2018 Intel Mac/HDMI TV, assess frame rate, thermal load, input latency, actual camera processing rate, and a complete session before tuning thresholds or claiming support.

## Jungle Trail build 08 validation — 2026-11-28

Synthetic regressions cover sustained mild posture/colour changes, brief missing appearance with a strict time limit, quick recovery from a pose gap, multi-frame crossing recovery, long-gap similar outfits, bounded reference learning, strong mismatch rejection, soft histogram boundaries, numeric diagnostics and clipboard fallback. Course/interface tests verify no duck action or low obstacles; existing jump, scoring, lifecycle and suite regressions remain. These do not establish real webcam accuracy, M1/M2 performance or child ergonomics. Next laptop test: select player, lower arms, stand/lean/jump naturally, introduce a distant newcomer then a crossing person, and copy diagnostics after pauses.
