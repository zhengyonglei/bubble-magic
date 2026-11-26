# Play Garden

A browser-only movement game suite: Bubble Magic, Fruit Slice, and Cats & Dogs Catch. All share webcam tracking, mouse/video inputs and dress-up rewards.

**Prototype 0.9.1.** Live performance and tracking quality with children still need testing. No application installation is required on the computer used to play.

## Play

Play online: **https://zhengyonglei.github.io/bubble-magic/**

Pick a game (Fruit Slice and Cats & Dogs also offer Easy, Medium, or Hard), then:

- **Play with camera:** allow camera access, stand with head and hands visible, and hold ready for the automatic 3-second countdown. Keep only one or two players in view; anyone detected may become a player in this prototype. No automatic bystander exclusion or raise-hand admission yet.
- **Play with mouse or touch:** move the pointer to pop bubbles. No illustrated player is shown; your pointer controls the prop. Arrow keys can also move the hand cursor when the game canvas has focus.
- **Use a video:** choose a local MP4/WebM supported by your browser. It plays in a loop through the same tracking and segmentation pipeline. The file stays on the device.

Settings include one/two players, lighter processing, optional background removal, cactus hazards, lower targets, and a diagnostic report you can copy. Camera-processing changes apply to the next camera/video session. On Medium and Hard, cacti reset combos and deduct up to 20 points (score never goes below zero). Rewards are shared and persist between rounds until reset or page reload.

The default is a 60-second round after a 3-second countdown. When all hands are lost, the clock pauses. Taking a break ends the camera stream. Switching away from the browser tab pauses gameplay and disables camera video tracks until you return.

## Test on a work laptop

Open the HTTPS game link in a current browser (Chrome first), allow its camera if organizational policy permits, and try one player before two. There is no need to install ChatGPT, Git, Node, or a camera driver. For slow tracking, stop the session, choose Lighter processing or turn Magic cutout off, then reopen the camera. Use Settings → Testing & diagnostics → Copy diagnostics when reporting an issue. The report does not contain camera images or video filenames.

## Develop on a camera-free PC

Requires Node 18 or newer. No npm dependencies need installing for the local server or tests.

```sh
git clone https://github.com/zhengyonglei/bubble-magic.git
cd bubble-magic
npm start
```

Open http://127.0.0.1:4173. Do not double-click index.html: module workers and camera access need an HTTP localhost or HTTPS origin.

```sh
npm test
npm run check
```

The pure gameplay tests cover exactly-once scoring, combos, hazard penalties, paused clocks, stale/teleported hand rejection, rewards, and position-based player matching. Mouse mode is useful for game mechanics. Video mode exercises the real model. A public Google sample-image check is also available under diagnostics; it verifies inference and compositing, not natural movement quality or live-camera performance.

## Architecture

- Buildless HTML/CSS/JavaScript and Canvas 2D.
- MediaPipe Tasks Vision **0.10.21**, loaded from jsDelivr only when vision is requested.
- Pose Landmarker Lite, float16 model version **1**, loaded from Google's model storage.
- Classic Web Worker for inference, with an OffscreenCanvas GPU delegate and CPU fallback.
- At most one frame is in flight; frames and unioned segmentation masks travel back together for synchronized compositing.
- Capture input is 640 pixels wide in Balanced mode or 480 in Lighter mode. Dispatch is capped at approximately 15 or 10 frames/second, respectively; actual speed depends on hardware.
- The game renderer runs independently, with confidence gating and positional matching. Crossings and occlusion can still swap player identities. Shared rewards reduce the consequence.
- The prototype automatically uses up to the configured number of detected people. Keep bystanders out of frame. It does not identify faces.

## Privacy and network use

No accounts, uploads, recording, analytics, or server-side inference. Camera/video frames are only processed locally. Network requests download the app, Google Fonts, the pinned MediaPipe code/WASM, and the model. The optional sample-image diagnostic downloads a public Google image. Hosting/CDN providers receive ordinary asset requests, not camera footage. Internet is needed for first loading; offline operation is not guaranteed.

Do not commit personal camera clips or credentials. `private-fixtures/` is ignored for local test footage and test helpers. See THIRD_PARTY.md for external asset references.

## GitHub Pages

Publish from **main / (root)** under repository Settings → Pages. `.nojekyll` is included. All app files use relative paths for the `/bubble-magic/` project URL. GitHub Pages serves the static files; the computer opening the page does the processing. There is no backend or API key.

## Design and status

- [Game design](GAME_DESIGN.md)
- [Development handoff and remaining work](PROJECT_HANDOFF.md)
- [Validation notes](TESTING.md)

## Games and difficulty (0.6.0)

- Bubble Magic: touch floating bubbles.
- Fruit Slice: swipe a moving hand through arcing fruit to split it. Standing still does not slice.
- Cats & Dogs Catch: touch falling animal friends. Misses float offscreen without an injury animation or point deduction.
- Cacti have no bubble border. Orange warning ticks and a HANDS OFF label distinguish them.
- Easy: at most 5 targets, one spawn per 1.1 seconds, slow movement, no obstacles.
- Medium: at most 8 targets, one spawn per 0.72 seconds, faster movement, occasional cacti.
- Hard: at most 12 targets, one spawn per 0.43 seconds, fastest movement, more frequent cacti.

Limits count all targets; placement may delay a spawn to avoid overlaps. Settings can disable obstacles on Medium/Hard but cannot enable them on Easy. Games returns to the suite menu and releases camera access. Difficulty remains selected when changing games. The new fruit and pet games are first playable prototypes using AI-generated sprites rendered on Canvas; live camera playtesting is still needed.

## Artwork (0.6.0)
The garden and all principal game illustrations are AI-generated: bubble/star targets, fruit, pets, cactus, butterfly markers, crown/wings/bracelet rewards, mascot, demo characters and menu art. The 4×4 transparent atlas is shared by Canvas and CSS; selected sprite crops exclude neighboring artwork. UI text, controls and lightweight particles stay code-rendered. The atlas is 1.43 MB and loads once; older illustrations remain as Canvas fallbacks. Prompts are in assets/ART_PROMPTS.md.

## Version 0.6.0
Solo and Together are available on each game setup screen; Solo tracks one person and Together up to two. Both share one score and one wardrobe. Difficulty controls obstacles independently of player count; practice has no cacti. Wrist props are butterfly (bubbles), rounded toy knife (fruit), and basket (pets). Bubble targets cycle small/regular/large sizes with matching hitboxes. Fruit split lines use the colliding hand path in screen pixels, and halves separate perpendicular to that line. Rewards unlock at 5/15/30 shared catches (bracelets/crown/wings); progress carries across rounds and games until reload/reset. Settings offers a clearly marked reward preview without granting unlocks.

## Version 0.7.0 gameplay

Scores are prominent and every successful target shows +points where it was collected. The pre-round unscored practice phase is replaced by an automatic countdown. Reward bars fill after each catch: bracelets at 5, crown at 15, wings at 30. Unlocks apply to everyone and last across games/rounds in this page session.

Medium/Hard schedule cacti after about 4/3 active seconds, subject to safe placement and a maximum of two on screen; Solo and Together use the same rules. Easy has none. Fruit sizes differ: oranges < apples < watermelons. Animals have full-body artwork. Hold the larger basket under a falling animal: entry through the top scores; side contact bounces without points.

Version 0.7.1 removes illustrated demo players, enlarges animals by 60%, and widens baskets to fit. Caught animals descend at full size behind the front rim, settle visibly, and fade after a 2.4-second catch animation. Camera players and their earned wearables remain visible in camera mode.

Version 0.7.2 uses one smaller basket per person, centered between their two tracked hands. Both hands must be visible; loss of both-hand control pauses the clock when no player can hold a basket. Basket width follows projected shoulder width with limits, and animals fit the opening. Mouse demo uses one pointer-controlled basket. Crowns anchor above the forehead using eye/ear landmarks. Distance is inferred from body size in the camera image, not measured in meters.

Version 0.8.0: Bubble Magic uses one obstacle-free Bubble party mode (no difficulty picker), spawning up to 20 varied bubbles from outside the left/right edges. Pop feedback adds expanding rings and sparkle bursts. Choose Play with mouse or touch to test on a phone without a camera: tap, swipe or use several fingers. Touch cancel/release clears controls, and the play area fits the phone viewport. Fruit and pet games retain Easy/Medium/Hard.

Version 0.9.0: Fruit Slice replaces the toy knife with a violet-and-white glowing motion trail for each hand/finger. Fruit launches from below the screen toward the center, reaches an apex, and falls under gravity. Easy/Medium/Hard control toss speed as well as spawn rate. On a phone select Play with mouse or touch and swipe through the fruit; stationary taps do not slice. Quick finger swipes are retained between frames, while camera tracking jumps remain rejected.

Version 0.9.1: fruit launches fully outside the left/right edges at a lower-middle height and arcs inward. Newly tossed objects cannot be hit during their first quarter-second or while their collision circle still crosses a side edge. Side margins scale with the screen aspect ratio, including portrait phones.

### Fullscreen and music (0.10.0)
Use **Fullscreen** in the top bar for TV play; use **Exit fullscreen** or Escape to return. Unsupported browsers get an expanded play area. Tap **Music off** to enable original gentle background melodies and game sounds. Music plays during active rounds and stops on pause, hidden tabs, menus and round end.

Regression checks run with `npm test` and `npm run check`, and automatically on GitHub pushes and pull requests.

### Jump & catch tree (0.11.0)
Cats & Dogs Catch now grows treasures with jumps. Each player has a separate net between their wrists; either player can jump or catch. First jumps gradually reveal cats, dogs, apples and oranges in the branches. Repeated jumps release mature treasures. Any contact with the net catches them, awards shared points, and shows them settling before fading. Solo and Together are supported.
Mouse: move the pointer for a net; use Jump! or Space to simulate jumping. Touch: one finger moves the net, two fingers set its endpoints; tap Jump! to advance the tree. Camera jump detection uses torso rise and landing, so keep shoulders and hips visible.

### Automatic music (0.11.3)
Background music now starts when you begin any game. Use Music on to mute; your mute choice remains in effect across games until you reload or turn music back on. Music pauses with gameplay and hidden tabs.

### Treasure party (0.12.0)
The tree game has one cooperative mode, without difficulty levels or obstacles. Each jump grows four new treasures, with up to 18 on the tree and 14 falling. Added squirrels, pears, peaches and cherries alongside cats, dogs, apples and oranges. The hand-to-hand net now has woven diamond mesh, a rope rim and wooden grips.

## Jungle Trail — feature prototype (2026-11-26)

Open `runner.html` through `npm start` (http://127.0.0.1:4173/runner.html), or choose Jungle Trail from the suite menu. Single player only. Hold W/Up to march, A/D or Left/Right to change lanes, Space to jump, S/Down to duck. Touch controls offer the same actions. A 350 m course has stars, logs and leafy arches; bumps never deduct stars. Pause and tab loss freeze play. Restart begins a new independent score.

The separate runner page uses world-space cuboid meshes and perspective projection into Canvas 2D. It adds no runtime package dependency and does not modify the existing games' gameplay code. Camera mode reuses the pinned worker with segmentation disabled, 480 x 360 input, at most one inference in flight, and a 10 Hz dispatch ceiling. Four pose candidates permit conservative bystander checks; actual inference rate and performance on the 2018 Mac are unmeasured.

Experimental camera: stand alone, centered, with full body visible; raise both hands for 1.2 seconds. Lower hands, alternate knees to march, lean for lanes, jump or squat. Current thresholds need real child/laptop tuning. Select again to recalibrate. Camera errors allow returning to controls; navigation and round completion release camera tracks.

Player lock is temporary position/torso-scale continuity, not durable identity. Distant detected newcomers are allowed; close people, incomplete detections, missing player, implausible movement or stale samples pause all simulation. Uncertainty is latched until deliberate re-selection. Pose-only tracking cannot guarantee identity if the detector merges or misses people, or another person occupies the same position with similar proportions. There is no face recognition, clothing analysis, saved identity or avatar photo storage. Future local avatar appearance must remain separate from session tracking, with deletion and device-specific storage explained. Photo personalization and the dance game are not implemented.
