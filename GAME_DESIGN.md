# Bubble Magic — Game Design

Version 0.1 · 2026-11-24 · Design proposal, not an implemented game

## Concept

A cooperative magic-mirror game: players see their live camera cutouts inside a colorful world, pop bubbles with their hands, avoid sleepy clouds, and earn silly accessories that appear on their bodies. The central promise is immediate cause and effect: move, pop, sparkle, transform.

Start with bubbles rather than fruit slicing. Bubbles support slow reaching as well as energetic swipes, generous collision detection, and a gentle mode for very young children. Slicing can become a later game using the same camera foundation.

## Requested requirements

1. Recognize multiple people in the camera view.
2. Remove the room background and show the players inside the game.
3. Generate bubbles and objects players should avoid.
4. Encourage players to pop as many bubbles as possible.
5. Include a scoring system.
6. Reward players with virtual props attached to their bodies.

The rules and numbers below are proposed starting values for playtesting, not confirmed user decisions. Multiplayer is part of the intended first playable release. A single-player technical spike is only a development step, not a replacement for that requirement.

## Audience and feel

Designed for young children and older siblings playing together. Support a very forgiving mode for approximately age 2 and a challenge mode suitable for approximately age 8. Default to shared success rather than ranking siblings. Avoid reading-dependent instructions, elimination, frightening hazards, and punishing missed targets.

Visual tone: bright garden or sky, translucent bubbles with clear thick outlines, friendly clouds, expressive stars, soft sparkle effects. Keep player cutouts prominent. Use small particle bursts instead of full-screen flashes. Sound effects are short and pleasant; volume and mute controls remain available.

## Session flow

1. Adult selects Gentle or Challenge and enables the camera.
2. Load model assets with visible progress and a retry option.
3. Show a mirrored preview, detected-player count, and simple framing guidance.
4. Invite up to two active players to stand side by side and raise a hand to join. An adult can also confirm players.
5. Run a short practice with three large bubbles and a demonstration of a sleepy cloud when hazards are enabled.
6. Start a 60-second round. Both players contribute to the same score and reward progress.
7. Briefly celebrate cosmetic unlocks without stopping the round or hiding targets.
8. End with total bubbles, team score, earned accessories, and a short celebration. Offer another round or a break; no automatic endless restart.

The first release supports one or two active players. Other detected people are spectators until a slot is available and they explicitly join. More than two active players is later scope and must be benchmarked.

## What appears on screen

Back to front: illustrated background; decorative particles; player cutout layer; body-attached accessories; bubbles/clouds; hand cursors and pop effects; minimal score/timer UI.

Targets remain visible even when they overlap a player's cutout. Use sufficiently opaque outlines. Mirroring must apply consistently to video, masks, pose coordinates, and interactions. Render accessories from the same coordinate system.

## Movement and interaction

- Either hand can pop a bubble by touching it with an on-screen hand cursor.
- Approximate the cursor from wrist/hand landmarks. Detailed finger gestures are unnecessary.
- Collision uses a forgiving circular region around each hand, scaled to player size, with a larger allowance in Gentle mode.
- Check the path between consecutive reliable hand positions so quick swipes do not skip targets. Do not connect paths across tracking gaps or implausible jumps.
- Each bubble awards points exactly once, even if both players hit it simultaneously.
- Only hands interact with bubbles and clouds in version one. Heads and torsos do not accidentally trigger hazards.
- Estimate comfortable target regions from each player's observed shoulders, hips, and reach. Provide an adult adjustment if calibration is poor.
- Ensure each active player's region receives targets. Avoid patterns that encourage crossing into another player's space, running at the display, or jumping to unreachable targets.
- Bubbles float slowly and expire without penalty. Keep enough targets available to prevent long idle gaps, without cluttering the camera view.

## Modes

| Setting | Gentle | Challenge |
| --- | --- | --- |
| Intended experience | Immediate playful feedback | Cooperative score chasing |
| Targets | Large and slow | Moderately smaller and faster |
| Hazards | Off by default; optional harmless practice clouds | Sleepy clouds enabled |
| Missed bubbles | No penalty | No penalty |
| Hazard contact | Friendly puff, no score loss | Combo resets, existing score stays |
| Timer | 60-second round; adult may choose untimed practice | 60-second round |
| Scoring | Flat values | Values plus capped combo multiplier |
| Rewards | Earned through successful pops | Same reward progression |

For mixed ages, begin in Gentle mode with both children. Separate per-player difficulties are later scope because the youngest player must not be penalized by an older player's settings.

## Objects and scoring

| Object | Behavior | Score / effect |
| --- | --- | --- |
| Regular bubble | Large colored bubble | 10 base points |
| Star bubble | Occasional bubble with a clearly visible star | 30 base points |
| Sleepy cloud | Visually distinct soft gray cloud; avoid with hands | No points; Challenge combo resets |

Challenge combo proposal: consecutive bubble pops no more than two seconds apart form a shared streak. Pops 1–4 earn 1x, 5–9 earn 2x, and 10+ earn 3x. Apply the resulting multiplier to that pop's base value. After a gap longer than two seconds or a cloud hit, the next bubble starts at 1x. Gentle mode always uses 1x. Score never goes below zero and is never deducted.

A contacted cloud disappears immediately, produces one gentle feedback event, and cannot repeatedly penalize a held hand. Resolve multiple contacts deterministically; a cloud contact resets the streak before scoring bubbles from the same update. Do not spawn hazards under a current hand cursor, on top of another target, or during tracking recovery. Use roughly one cloud per six bubble spawns as an initial Challenge tuning value, with at most two clouds visible.

The shared score is the primary score. Also display the team's bubble count. Do not show individual rankings in version one. Reward progress counts bubbles rather than score, so Challenge multipliers do not make Gentle mode unrewarding.

## Wearable rewards

Rewards are cosmetic, earned through play, and have no purchase or account requirements. They must feel like they belong to the live player rather than merely appearing as icons in a menu.

Proposed team milestones within a session:

| Cumulative bubbles popped | Unlock | Body attachment |
| --- | --- | --- |
| 10 | Sparkle bracelets | Both wrists |
| 25 | Star crown | Above the head |
| 45 | Butterfly wings | Behind the shoulders |

Both active players receive each unlock together. A late joiner gets the team's already-unlocked cosmetics. Milestones are initial tuning values; shorten them if a young child cannot earn the first reward promptly. Once all props are earned, continue score play without repeatedly triggering unlock notices.

Use stylized 2D artwork scaled to the player's shoulder width or head size. Smooth position and rotation. Keep headwear above the face. Wings can be a simple behind-the-body layer; realistic fabric simulation and precise body occlusion are out of scope. Cap overlapping effects so the silhouette, hands, and targets remain readable.

At the end of a round, retain cosmetics for the next round in the same session. An adult reset clears session rewards. Persistent wardrobe storage is optional later; no photos or video are needed to remember cosmetic choices.

## Multiplayer and tracking recovery

Use stable temporary player slots rather than face recognition. Associate detections over time by position and pose continuity; this may fail when players overlap or leave and return. Shared scoring and identical earned rewards reduce the consequences of identity swaps.

If one player is briefly lost, hide/fade that player's unreliable cursors and props and suspend their collisions. Let the other continue. On recovery, require a short period of stable tracking and avoid immediate hazard penalties. If all players are lost, pause the timer and spawning and display a friendly return-to-frame prompt. Exclude paused time from the round timer and combo expiry.

Two-player foreground segmentation must be validated early. Start with the union of all active-player masks for composition; do not assume a mask's array index is a permanent player identity. If the chosen model cannot reliably separate active players from spectators, document that limitation and request a clear camera area rather than silently including bystanders. Multi-person cutouts and matching poses may require a different or additional segmentation model.

## Browser architecture and privacy

Target a MacBook Pro using its built-in camera, initially in Chrome, with HDMI to a TV as an optional display. All camera capture, vision inference, rendering, game rules, and audio run in the browser. Camera frames stay on the device; do not record, upload, or include them in analytics.

Candidate implementation: TypeScript, a lightweight 2D Canvas/WebGL renderer, and MediaPipe Pose Landmarker with multi-pose settings and optional masks, subject to a technical spike. Pin library/model versions and verify asset licenses before including them in a public repository or hosting them.

Keep each segmentation mask aligned with its source camera frame. Avoid an inference backlog by using only the latest available work when busy. Measure performance and adjust inference resolution/rate; 20–30 tracking updates/second is a provisional target, not a guarantee. Rendering can run independently. Prioritize responsive cursors over expensive visual effects.

Development uses localhost. Public deployment uses GitHub Pages over HTTPS. The repository and hosted game can be public without making camera video public. Initial asset downloads require internet; full offline support needs explicit caching and is later scope. No API key or paid model service should be needed for ordinary play.

## First playable release scope

Included: one scene, one/two-player cooperative rounds, mirrored cutouts, wrist interaction, regular/star bubbles, optional clouds, two modes, shared score and combos, three wearable rewards, camera/error/recovery flows, audio controls, basic mouse testing, and a collapsible diagnostics view.

Excluded: fruit slicing, ball-impact detection, projector-specific integration, more than two active players, online multiplayer, personal leaderboards, accounts, recording, realistic 3D costumes, face identification, and mobile optimization.

## Development sequence and acceptance checks

1. **Camera spike:** inspect Mac specifications; test camera permission, framing, one/two-player pose detection and segmentation. Confirm actual mask outputs and measure inference time. Stop and revise the tracking approach if two players are not usable.
2. **Core play:** implement mirrored cutouts, cursors, bubbles, and shared scoring. Confirm left/right alignment, exactly-once pop scoring, two simultaneous players, and no collision from stale poses.
3. **Game loop:** add round transitions, mode rules, star bubbles, clouds, and combos. Verify clock/score behavior during loss of one or all players.
4. **Rewards:** attach bracelets, crown, and wings, then test differing player heights, crossings, and exits/rejoins.
5. **Family playtest:** observe whether the youngest understands cause and effect, both can reach targets, the older child enjoys repeat rounds, and rewards arrive soon enough. Adjust values based on observed play rather than assumptions.
6. **TV and release:** test HDMI responsiveness, audio, fullscreen, mute, stop-camera behavior, HTTPS permissions, and GitHub Pages asset paths. Inspect network behavior to verify camera frames are not transmitted. Check on the actual Mac before claiming performance success.

Use mouse input to test game rules without a camera and prerecorded non-private footage to exercise inference when useful. Neither replaces live testing with the actual camera and play area.

## Open decisions

- Confirm working title and repository name.
- Inspect MacBook Pro chip/year and browser versions.
- Playtest 60-second rounds, hazard density, combo timing, and reward milestones.
- Decide whether cosmetic choices need to persist across browser sessions after the initial release.

## References

- MediaPipe Pose Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web
- Browser camera requirements: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
