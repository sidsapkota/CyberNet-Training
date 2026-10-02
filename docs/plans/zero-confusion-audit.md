# Zero-confusion and playbook audit (2 Oct 2026)

Read-only audits of all four courses against the **zero-confusion rule** and the **CyberNet design
playbook** (CLAUDE.md). Fixes land in the "learn before you do" rollout branch (`ldyd-pilot`),
course by course. Done so far: **train_model redesign** (all 11 cards, see below).

## Counts (463 interactive cards; estimates from length and count thresholds)

| Rule | AI (Medium) | Internet (Hard) | Devices (Easy) | Stay Safe (Easy) |
|---|---|---|---|---|
| 1 Problem first (long or multi-paragraph prompt, setup before the ask) | 53 | 65 | 32 | 49 |
| 2 Show, don't describe (charts, bars or meters only) | 10 | 0 | 5 | 3 |
| 3 One action / pre-selected | 19 | 0 | 21 | 12 |
| 4 Too many choices (Easy/Medium) | 17 | n/a | 12 | 6 |
| 5 Delayed feedback (scenario endings show after Check) | 39 | 0 | 14 | 32 |
| 6 Jargon in the instruction | 40 | 76 | 17 | 4 |
| 7 Fit risk at 360×560 | 22 | 28 | 23 | 19 |

## Card types: what breaks by design, and the fix

- **train_model** (done): chart of dots, pre-ticked examples, 7–11 rows, guesses below the fold.
  Now real pictures, problem first, one change from 2–4 tiles, live guess flip, fits 360×560.
- **next_word**: % bar chart, slider plus "Generate 5" (two actions), "Temperature" label. Fix:
  samples update as the slider moves (no button); label the slider "Same every time ↔ Surprising"
  with "temperature" as a glossary word.
- **simulator**: meters-only cards (password, too-hot, battery); 5–6 controls on Easy cards. Fix:
  every card has a picture output (device, battery, laptop that glows hot); at most 4 controls.
- **scenario**: the prompt is story setup and the question sits further down; steps pile up;
  consequences only after Check. Fix: the step's question on top in bold, setup as a small line;
  collapse past steps; one step per card on Easy courses.
- **teardown**: safety paragraph plus a long prompt. Fix: a one-line safety chip on the scene, the
  full warning in the explainer before; prompts ≤60 characters ("Open the phone: 4 taps.").
- **sort_bins / match_pairs / drag_to_order / hotspot label / multiple_choice**: helper lines
  repeat the instruction; too many items. Fix: helper only on a type's first card in a lesson; caps
  of 4–6 items (4 options for multiple choice, 3 on Easy); options ≤50 characters.
- **numeric_input / terminal**: text only, jargon by nature: keep terminal to the Hard course.

## Worst 25 cards (before → after, to fix in the rollout)

1. SSO getting-help/who-to-tell (MC): helplines packed in a 375-char prompt → helplines in an
   explainer just before (help info stays in core cards); prompt "Ali isn't ready to tell family.
   Who could he call?"
2. SSO deepfake-scams/do-or-dont (sort): 394 chars → guidance in an explainer; "A fake picture of
   you is shared. Do, or don't?"
3. SSO deepfake-scams/fake-image-report (scenario): 364 chars of services → explainer first;
   "A fake picture of you is online. What do you do first?"
4. SSO getting-help/where-to-go (match, 5 pairs) → explainer first; 4 pairs, "Match each problem
   to who helps."
5. SSO getting-help/group-chat (scenario, 2 steps) → one step: "People in your group chat are
   posting mean things about you. What first?"
6. IYD memory-vs-storage/fill-the-ram (simulator) → "Make the racing game smooth. Keep the music
   on." (device output only)
7. AI testing-a-model/cloudy-dry (train_model) → done.
8. AI training-data/fix-the-data (train_model) → done.
9. IYD meet-the-os/memory-leak (simulator, 6 controls) → drop the time slider: "One app keeps
   eating memory. End it; keep the music."
10. IYD whats-in-the-box/open-the-phone (teardown) → done in the pilot (short prompt, one-paragraph
    safety note).
11. IYD meet-the-cpu/how-long (numeric) → removed in the pilot (depth, not exam prep).
12. IW https-and-the-padlock/cafe-can-see (MC, 261 chars) → theory to an explainer; "On café
    Wi-Fi you open a padlocked page. What can the café see?"
13. IW ports/nat-table-lookup (numeric) → the table as a picture; "Which laptop gets this reply?"
14. AI patterns-everywhere/three-fruits (train_model) → done.
15. AI patterns-everywhere/choose-the-data (train_model) → done.
16. SSO getting-help/helps-or-worse (sort, 261 chars) → "Something bad happened online. Helps,
    or makes it worse?"
17. IW http-requests-and-responses/curl-headers (terminal) → teach headers first; "Run `curl -I
    …/old-news`. Where did the page move?"
18. IW https-and-the-padlock/order-https (drag) → "Put the steps of opening a padlocked page in
    order."
19. IYD meet-the-cpu/too-hot (simulator, meters only) → a laptop picture that glows hot.
20. IYD whats-in-the-box/open-the-laptop (teardown) → done in the pilot.
21. IYD meet-the-os/end-the-frozen-app (simulator, 5 buttons) → 3 apps plus System: "One app froze
    the laptop. End it."
22. SSO signs-of-a-hack/weird-messages (scenario, 3 steps) → two cards, one step each.
23. SSO signs-of-a-hack/hacked-or-normal (sort) → "Was this you, or someone else in your account?"
24. AI temperature/even-it-out (next_word) → "Slide right until the guesses mix it up." (no %
    target to read off bars)
25. SSO two-step-sign-in/match-tools (match, 5 pairs) → 4 pairs, ≤25 characters a side.

## Playbook (rules 1, 2, 4, 7) across 52 lessons

| Course | 1 Real-life opener ✓/weak/✗ | 2 Predict first | 4 Wrong answers teach | 7 "Try this" ending |
|---|---|---|---|---|
| AI (18) | 11 / 6 / 1 | 4 / 6 / 8 | 11 / 5 / 2 | 0 / 9 / 9 |
| Internet (17) | 6 / 6 / 5 | 7 / 6 / 4 | 6 / 6 / 5 | 0 / 2 / 15 |
| Devices (7) | 5 / 2 / 0 | 1 / 3 / 3 | 6 / 1 / 0 | 0 / 6 / 1 |
| Stay Safe (10) | 4 / 5 / 1 | 0 / 3 / 7 | 6 / 4 / 0 | 0 / 10 / 0 |

- **No lesson ends with "Try this"** (rule 7). Recaps sum up or say "Next: …". Every lesson needs one
  safe, practical line; the "weak" ones can turn their existing action bullet into it.
- **Need a real-life opener (26):** patterns-everywhere (your photo app finds every dog picture),
  testing-a-model (a plant app sure your cactus is a cucumber), bias-in-bias-out (a voice
  assistant understands your friend but not your gran), temperature (the same story request twice,
  two stories), made-up-answers (a chatbot recommends a book that doesn't exist),
  writing-good-prompts ("tell me about dogs" → 2,000 words on poodles), cloned-voices-and-faces,
  bits-and-binary (every photo stored as on/off), bytes-file-sizes-and-hex ("Storage almost full"),
  meet-ipv6, routers-and-hops, different-roads-same-destination, the-lookup-journey (second visit
  loads faster), dns-records-and-tools, ports (music, chat and browsing at once), tcp-and-udp
  (a game lags but a download never arrives broken), protocols-as-shared-rules, http-requests (a
  404), meet-the-cpu (frames drop when things explode), files-and-folders (can't find yesterday's
  essay), strong-passwords (a friend's game account taken over), two-step-sign-in (a code you
  didn't ask for), fake-websites, your-digital-footprint, signs-of-a-hack (friends ask why you sent
  a weird link), getting-help (a friend too embarrassed to say they were scammed).
- **Wrong answers that don't teach visually (rule 4 ✗):** spot-the-ai, how-ai-makes-pictures,
  bytes-file-sizes-and-hex, meet-ipv6, why-data-travels-in-packets, tcp-and-udp,
  protocols-as-shared-rules: only multiple choice, sort, match, order or numeric cards. Add one
  hands-on card whose scene changes on a wrong answer.
- **"Try this" endings:** a suggested line for every lesson is in the audit notes; each must be
  safe for 13+, brand-free, and say "with an adult" for settings, devices and physical actions
  (e.g. "Try this: find the biggest app in your storage settings", "Try this: agree a family safe
  word tonight", "Try this: turn on two-step sign-in for one account, with an adult").
