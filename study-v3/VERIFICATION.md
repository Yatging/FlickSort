# FlickSort V3 verification record

Date: 2026-10-25 (Asia/Hong_Kong)

Build: `3.2.0`
Asset set: `image-selection-realistic-v2`

## Completed checks

- Loaded the standalone page over local HTTP in a real Chromium browser with no console errors.
- Confirmed the setup page has no participant-selectable technique field. A random seed chooses the first technique, then the study uses two contiguous groups: 2+2 photos in Demo and tutorial, and 6+6 in each full classification chapter.
- Confirmed the two full Level 1 blocks each contain 3 Keep and 3 Reject answers. The two Level 2 blocks use complementary 2/1/2/1 and 1/2/1/2 answer distributions so randomized starting technique counterbalances the blocks across participants.
- Confirmed an anonymous participant ID is generated automatically at setup and remains editable before Start.
- Classified the four Demo photos in two contiguous technique groups using two real diagonal pointer drags and two Classic button taps. No target-image restriction or `Return to TARGET` message appeared within either group.
- Confirmed the first-group Continue button is blocked while images are unfinished and lists the unfinished image IDs. After the active group was complete, the interface explicitly switched to the other technique and restricted browsing to its two photos.
- Confirmed each navigation trial starts on a non-target photo, requires browsing to the named ID, and records 2/2 correct arrival in Demo Mode.
- Completed the grouped-technique Demo end to end and confirmed a perfect classification/navigation run reports 4/4 classification, 2/2 navigation, the active-time score component and `Mixed · grouped alternation` on Results.
- Inspected the Trials/Events CSV formatter and confirmed Build 3.2 writes the group assignment method, group index, group count, group size and free-order-within-group marker in addition to actual technique and randomization seed. The in-app browser did not expose its downloaded file to the system Downloads folder, so a fresh external-browser file inspection remains listed below.
- The prior Build 3.1 baseline completed Full Pilot Mode from tutorial through 24 scored classification trials and four navigation trials, including a deliberate 23/24 result. Build 3.2 received current browser verification for Demo and tutorial group containment, while the score boundary suite remains unchanged and passing.
- Tested Build 3.2 setup and grouped task screens at a 390×844 browser viewport. The generated participant ID, group status, primary rule, 2×2 rule card, highlighted current-task panel, active controls and group Continue/Submit area remained visible without horizontal overflow. The unchanged result card previously passed the same viewport.
- Loaded all 24 independent PNG stimulus URLs over HTTP with zero missing assets.
- Visually reviewed both generated source sheets and all 24 browser-rendered crops against their manifest bus/car flags and answer labels. Each target vehicle is distinct and the backgrounds contain no unplanned buses or passenger cars.
- Ran automated boundary checks for Overall Score, rounding, clipping and all six gesture mappings (next, previous, Edit, Keep, Maybe, Reject), plus short-motion cancellation.
- Verified EN / 中文 switching on the revised results screen, including the image-selection study title and grouped-alternation technique label. The selected language does not change experiment codes or answers.
- Verified the revised L2 task hierarchy in English and Chinese: the complete classification rule is the primary page heading, the same live instruction is repeated in a highlighted `CURRENT TASK` panel beside the controls, and the photo ID is reduced to secondary metadata.

## Honest remaining limitations

- `T_ref = 180 seconds` is a fixed provisional demonstration benchmark. It has not been validated by a pilot and must be frozen from pilot evidence before formal data collection.
- Independent human stimulus review is not complete. The manifest therefore remains `human_reviewed: false`, and `asset-review.html` is provided to conduct and document that review.
- Responsive behavior from the prior build was verified in a real browser at a phone-sized viewport; this build was functionally verified in Chromium but still needs final physical-device checks. Test at least one iPhone-class and one Android-class device for pointer behavior, rule-card wrapping, safe-area layout, CSV download and screenshot capture.
- Demo scores use 4 classification tasks and 2 navigation tasks, so they are labelled as previews and are not comparable with Full Pilot scores.
- Download and inspect one Build 3.2 Trials CSV and Events CSV in an external desktop browser to confirm the newly added technique-block columns in the saved files.
- Cloud submission is not enabled. The public static GitHub Pages build has no server-side secret or durable database; adding shared storage requires an approved data owner, access control, retention policy and backend configuration.
