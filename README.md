# Play Garden

A browser-only movement game suite: Bubble Magic, Fruit Slice, and Cats & Dogs Catch. All share webcam tracking, mouse/video inputs and dress-up rewards.

**Prototype 0.6.0.** Live performance and tracking quality with children still need testing. No application installation is required on the computer used to play.

## Play

Play online: **https://zhengyonglei.github.io/bubble-magic/**

Pick a game, choose Easy, Medium, or Hard, then:

- **Play with camera:** allow camera access, stand with head and hands visible, and press Start round after tracking finds you. Keep only one or two players in view; anyone detected may become a player in this prototype. No automatic bystander exclusion or raise-hand admission yet.
- **Try mouse demo:** move the pointer to pop bubbles. The two illustrated people are simulated. Arrow keys can also move the hand cursor when the game canvas has focus.
- **Use a video:** choose a local MP4/WebM supported by your browser. It plays in a loop through the same tracking and segmentation pipeline. The file stays on the device.

Settings include one/two players, lighter processing, optional background removal, cactus hazards, lower targets, and a diagnostic report you can copy. Camera-processing changes apply to the next camera/video session. On Medium and Hard, cacti reset combos and deduct up to 20 points (score never goes below zero). Rewards are shared and persist between rounds until reset or page reload.

The default is a 60-second round with practice bubbles first. When all hands are lost, the clock pauses. Taking a break ends the camera stream. Switching away from the browser tab pauses gameplay and disables camera video tracks until you return.

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
