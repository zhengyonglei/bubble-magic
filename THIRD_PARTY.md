# Third-party resources

The repository contains original game code and vector/Canvas artwork. It references, rather than redistributes, these external resources:

- **MediaPipe Tasks Vision 0.10.21**: https://www.npmjs.com/package/@mediapipe/tasks-vision/v/0.10.21 — Apache-2.0 package. Source/license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE . JavaScript and WASM are loaded from the version-pinned jsDelivr npm path.
- **Pose Landmarker Lite float16 v1**: Google's hosted model, https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task . Model documentation: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker . The model is fetched directly from Google; no model binary is committed here.
- **DM Sans and Outfit**: served by Google Fonts. These fonts are distributed under the SIL Open Font License. System fonts are fallbacks if their download is blocked.
- **Optional diagnostic photograph**: https://storage.googleapis.com/mediapipe-assets/pose.jpg , linked from Google's pose examples. Downloaded only when the user starts the sample-image check. The photo and derived local testing clips are not committed or republished as game assets.

No original character art, music, or branding from Fruit Ninja or other games is used.
