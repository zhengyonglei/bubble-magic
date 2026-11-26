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
