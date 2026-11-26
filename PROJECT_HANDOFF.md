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
