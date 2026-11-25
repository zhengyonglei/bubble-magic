# Bubble Magic — Development Handoff

## Current status

Design only; no game code or playable build exists yet. Read GAME_DESIGN.md first. Its rules and numeric values are proposals for playtesting. The latest requirement is simultaneous multiplayer, initially one or two active players; older single-player-only planning is superseded.

## Next steps on the Mac

1. Clone https://github.com/zhengyonglei/bubble-magic and open the local checkout in Codex.
2. Inspect the MacBook Pro chip/year and available developer tools.
3. Build a camera diagnostic to validate two-player pose tracking and foreground masks in Chrome before investing in game polish.
4. Implement the minimal cooperative bubble game, then clouds, shared scoring, and wearable rewards as described in GAME_DESIGN.md.
5. Test with the built-in webcam on the laptop first, then with an HDMI-connected TV.

All video processing must stay in the browser on the device. Do not record or upload camera frames. Use localhost for development and HTTPS for deployment. Keep model files, asset licenses, and GitHub Pages repository-relative URLs in mind. No GitHub Pages deployment has been configured yet.

## Workflow

Commit code, setup instructions, tested behavior, and remaining issues so development can move between computers. Do not commit personal camera recordings, secrets, or machine-specific credentials. Verify performance on the actual Mac; mouse simulation and prerecorded input cannot establish live-camera performance.
