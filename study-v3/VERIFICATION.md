# FlickSort V3 verification record

Date: 2026-10-25 (Asia/Hong_Kong)

Build: `3.1.0`
Asset set: `image-selection-realistic-v2`

## Completed checks

- Loaded the standalone page over local HTTP in a real Chromium browser with no console errors.
- Confirmed the setup page has no participant-selectable technique field. A random seed chooses the first technique, and Classic/FlickSort then alternate by photo; the active controls and technique chip change with the displayed photo.
- Classified the four Demo photos in free browsing order using two real diagonal pointer drags and two Classic button taps. No target-image restriction or `Return to TARGET` message appeared.
- Confirmed chapter Submit is blocked while images are unfinished and lists the unfinished image IDs. After all four were classified, the chapter advanced normally.
- Confirmed each navigation trial starts on a non-target photo, requires browsing to the named ID, and records 2/2 correct arrival in Demo Mode.
- Completed the mixed-technique Demo and confirmed a perfect run reports 4/4 classification, 2/2 navigation and Overall Score 100.
- Downloaded and inspected Trials CSV and Events CSV. Each classified photo records its actual technique, `run_technique=mixed_auto_alternating`, the randomization seed, classification source and free-order marker.
- Completed Full Pilot Mode from tutorial through 24 scored classification trials and four navigation trials. A deliberately wrong final classification produced 23/24 (96%) accuracy and Overall Score 97 with the fixed demonstration benchmark.
- Tested the results page at a 390×844 mobile browser viewport. The result card was approximately 496 px high and the document did not exceed the 844 px viewport.
- Loaded all 24 independent PNG stimulus URLs over HTTP with zero missing assets.
- Visually reviewed both generated source sheets and all 24 browser-rendered crops against their manifest bus/car flags and answer labels. Each target vehicle is distinct and the backgrounds contain no unplanned buses or passenger cars.
- Ran automated boundary checks for Overall Score, rounding, clipping and all six gesture mappings (next, previous, Edit, Keep, Maybe, Reject), plus short-motion cancellation.
- Verified EN / 中文 switching on the revised results screen, including the image-selection study title and mixed auto-alternating technique label. The selected language does not change experiment codes or answers.

## Honest remaining limitations

- `T_ref = 180 seconds` is a fixed provisional demonstration benchmark. It has not been validated by a pilot and must be frozen from pilot evidence before formal data collection.
- Independent human stimulus review is not complete. The manifest therefore remains `human_reviewed: false`, and `asset-review.html` is provided to conduct and document that review.
- Responsive behavior from the prior build was verified in a real browser at a phone-sized viewport; this build was functionally verified in Chromium but still needs final physical-device checks. Test at least one iPhone-class and one Android-class device for pointer behavior, rule-card wrapping, safe-area layout, CSV download and screenshot capture.
- Demo scores use 4 classification tasks and 2 navigation tasks, so they are labelled as previews and are not comparable with Full Pilot scores.
