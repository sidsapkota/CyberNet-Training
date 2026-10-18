# How AI Really Works: Lesson Blueprint v1.1 audit

Audited `content/courses/how-ai-really-works/` in the worktree a local copy (branch `next-batch`; lesson 1.1 is identical to `fix-spot-the-ai`). Rules: CLAUDE.md "Lesson Blueprint v1.1", "Zero-confusion rule", "Content style guide" and the card table. CLAUDE.md has no sections called "The lesson pattern (HARD RULE" or "Make it feel like a game" any more; Blueprint v1.1 replaces them. Reference: Stay Safe Online module 1 (`"blueprint": "1.1"`).

## Summary

None of the 18 lessons is built to Blueprint v1.1: none has `"blueprint": "1.1"`, a `hook` card, a `predict: true` card or a `showAnswer` line. The course is still in the old "learn before you do" shape (5–7 core cards, hint + nudge, recap with "Next:"). It does have real strengths: hands-on `train_model` and `next_word` toys in modules 1–3, consistent story objects in a few lessons (fruit in 1.2, "The cat sat on the" in 3.2, the spam filter in 2.1), every card has a hint and nudge, accurate facts, and sourced AI-product and age claims (4.3, `lastChecked: 2026-10-01`, notes in REVIEW.md). The biggest gaps:

- **Pictures:** apart from lesson 1.1 the course has no pictures at all. 17 of 18 lessons are text-only multiple choice, sort bins and scenarios, even 5.1 "How AI Makes Pictures" and 5.3 "Who Made This?".
- **Answers in the prompt:** about 20 cards state the rule in the prompt and then ask the learner to apply it.
- **Wordiness:** 83 of 113 lesson prompts are over 12 words (66 are over 15), and 17 of 18 lessons have an explainer over 40 words.
- **Too many ideas:** five lessons cram 3–5 ideas (1.3, 4.2, 4.3, 6.2 fail; 2.2 has 9 cards).
- **The free funnel:** module 1 is free and 2–6 are Pro, so a guest from TikTok sees only 1.1, then 1.2 and 1.3 after signing up. Lesson 1.1 is the closest to the blueprint, but it opens on a 2-option question whose answer is drawn in the picture, and both later questions have the same answer ("Robot B").

**Status:** quizzes follow the quiz rules (5–8 core, no hints, 4 options). Text in SVGs passes: the only lesson SVGs (1.1) use 16-unit text in a 340-wide viewBox, about 14.6px at 360px, a narrow pass. **Access:** M1 free (guests: lesson 1.1 only); M2–M6 Pro.

Key: **P** pass, **~** partial, **F** fail, **R** = scroll risk at 360×560. "Words" = prompts ≤12 words (v1.1's own limit is a situation line under 15 words) and explanations ≤2 sentences / ≤26 words.

---

## Module 1: What AI Actually Is (free)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 Spot the AI | 6 (6 core) | P recipe vs learned | P | ~ no hook/play; `watch` is a question; `name-it` ok; recap has Try this + Next | F `green-apple` is a scored predict | P pictures on all 3 MCs; `two-ways` sort has none | F `watch` has 2 options | F `watch` picture and alt show Robot B holding photos; `green-apple` and `red-ball` both answer "Robot B" | ~ hint + option nudges, no showAnswer | ~ `watch` 20w prompt; `two-ways` 31w, `red-ball` 27w expl | R recap 62w, `name-it` 47w | P 16/340 ≈ 14.6px | **5** |
| 1.2 Patterns Everywhere | 8 (6 core) | ~ data+labels+model, then steps of learning, k=3 bonus | P | F opens on a graded `train_model`; no hook/predict; recap has no Try this | F | ~ train_model visuals; `best-fix`, `steps-of-learning` text-only | P | ~ `examples-labels-models` explainer gives `best-fix` and `choose-the-data` away (acceptable as an easy win) | ~ old style | ~ `best-fix` 31w, `green-pear` 18w prompt | R explainers 42w/43w | n/a | **5** |
| 1.3 What AI Can't Do | 7 (6 core) | F 4 ideas: confident-wrong, face mislabel, AI can't care + helplines, big decisions need people | P | F opens on a scenario; no hook/predict/Try this | F | F no pictures | P | F `homework-helper` prompt: "AI answers are predictions…"; `ai-or-person` prompt states the rule | ~ old style | F 3/5 prompts >15w (`why-confidently-wrong` 22w) | R `if-a-chat-upsets-you` 54w (helplines: keep) | n/a | **3** |
| Quiz | 7 core | n/a | P | n/a | n/a (none allowed) | ~ train_model only | P | ~ `q-daylight-dogs` "night" option mirrors the stem | P no hints (quiz) | ~ `q-skipped-test` 20w | ok | n/a | **6** |

## Module 2: How Machines Learn (Pro; teaser `training-data/label-messages`)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.1 Training Data | 8 (6 core) | ~ one word tips it, plus good-data rules | P | ~ `free-pizza-guess` is a natural predict, then play, name-it, fix; no hook/Try this | F `free-pizza-guess` is scored | ~ word-vote bubbles; MCs text-only | P | ~ `helpful-or-problem` prompt lists the answer criteria | ~ old style | ~ 3 prompts >15w | R `words-that-vote` 51w | n/a | **5** |
| 2.2 Testing a Model | 9 (7 core) | F memorising, split, accuracy maths, fair tests, plus a data-gap weather model | F 9 | F | F | F mostly text | P | F `seen-before` ("A model can simply remember…") and `too-good` ("Models can memorise…") give the answer | ~ old style | F 5/7 prompts >15w (`seen-before` 25w) | R `fair-or-unfair` 6 items + 17w; `train-and-test` 49w | n/a | **3** |
| 2.3 Bias In, Bias Out | 8 (6 core) | P bias from data gaps | P | F opens on a graded fix | F | ~ word-vote only | P | ~ `fixes-that-help` prompt: "Testing with many kinds of people catches bias" | ~ old style | ~ `fixes-that-help` 18w | ok | n/a | **4** |
| Quiz | 8 core | n/a | P | n/a | n/a | F all text | P | P | P | F 7/8 prompts >12w | ok | n/a | **5** |

## Module 3: How Chatbots Think (Pro; teaser `next-word-machines/hungry-horse`)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.1 Next-Word Machines | 8 (7 core) | P one word at a time | P | ~ `hungry-horse` works as hook + predict; no Try this | F scored | ~ next_word bars; no picture | P | ~ `the-loop` prompt gives away the `no-going-back` bonus | ~ old style | F 6/6 prompts >12w; `how-it-knows` 35w expl | R `guess-the-next-word` 46w | n/a | **5** |
| 3.2 Temperature | 8 (7 core) | P | P | ~ `make-it-predictable` is a real play card and `cold-ten-times` a predict; same story throughout; no hook/Try this | F scored | ~ slider toy, no picture | P | ~ `low-or-high` prompt states the rule | ~ old style | ~ 5/6 >12w | R `what-temperature-does` 56w | n/a | **6** |
| 3.3 Made-Up Answers | 8 (7 core) | ~ hallucination, plus checking, medicine, links | P | F | F (`mars-walk` scored) | ~ | P | ~ `check-or-fine` prompt hints the medicine item | ~ old style | F 4 prompts >15w | R `hallucination` 55w | n/a | **4** |
| Quiz | 8 core | n/a | P | n/a | n/a | ~ one next_word | P | P | P | ~ 5/8 >12w | ok | n/a | **6** |

## Module 4: Talking to AI (Pro; teaser `writing-good-prompts/vague-or-clear`)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 4.1 Writing Good Prompts | 9 (7 core) | ~ goal/context/format, plus privacy, plus long chats | F 9 | F | F | F all text | P | ~ `include-or-leave-out` prompt: "keep private details out" | ~ old style | ~ 5/7 >12w | R `include-or-leave-out` 21w + 6 items; `what-a-prompt-needs` 59w | n/a | **3** |
| 4.2 Checking AI's Work | 8 (6 core) | F four checks, knowledge cut-off, learn vs cheat, school rules | P | F | F | F | P | ~ `learn-or-do` prompt states the rule | ~ old style | F 6/6 >12w | R `four-checks` 57w | n/a | **3** |
| 4.3 AI Tools Today | 8 (7 core) | F AI in apps, tool kinds, products, age rules, school rules | P | F | F | F | P (match has 3 pairs) | F `kind-of-tool` prompt defines each tool, which is the answer; `which-apps-use-ai` defines AI | ~ old style; `kind-of-tool` nudge mentions a missing translation pair | F 5 prompts >15w (`best-ai` 20w) | R `rules-and-ages` 61w | n/a | **2** |
| Quiz | 8 core | n/a | P | n/a | n/a | F | P | P | P | ~ | ok | n/a | **6** |

## Module 5: AI Images, Video and Voices (Pro; teaser `how-ai-makes-pictures/prompt-words`)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5.1 How AI Makes Pictures | 8 (7 core) | ~ generative AI, prompt words, diffusion, randomness, give-aways | P | F opens on an explainer (`cat-astronaut`) | F (`same-prompt-twice` scored) | F no pictures in a picture lesson | P | F `noise-steps` prompt gives the order ("colour, then shapes, then detail"); `same-prompt-twice` prompt gives its answer | ~ old style | F 6/6 prompts >15w | R `cat-astronaut` 48w | n/a | **3** |
| 5.2 Cloned Voices and Faces | 8 (7 core) | ~ help vs harm, how clones work, consent, clue types, scam call | P | F | F | F | P | ~ `teacher-video` prompt states the rule; `video-or-situation` prompt is garbled ("Best check: the real person, another way.") | ~ old style; `help-or-harm` explanation names a "museum guide" item that isn't on the card | F `teacher-video` 47w expl | R explainer and recap 59w each | n/a | **3** |
| 5.3 Who Made This? | 8 (6 core) | P check where a picture came from | P | F | F | F no picture of the shark etc. | P | ~ `the-shark` prompt: "You can search with a picture itself" | ~ old style | F 5 prompts >15w | R `how-to-check-a-picture` 64w (longest); `clue-or-myth` 7 items | n/a | **4** |
| Quiz | 7 core | n/a | P | n/a | n/a | F | P | P | P | ~ `q-name-it` 37w expl | ok | n/a | **6** |

## Module 6: Using AI Safely and Fairly (Pro; teaser `spotting-ai-fakes/review-check`)

| Lesson | Cards | One idea | 6–8 | 8 beats | Predict | Situation+picture+action | 3+ options | No leaks | Feedback | Words | 360×560 | SVG text | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6.1 Spotting AI Fakes | 8 (7 core) | ~ fake reviews, inside/outside checks, bots, emotional sharing | P | F opens on an explainer; 3 sort bins in a row | F | F | P | F `review-check`, `real-or-suspicious-review` and `inside-or-outside` prompts state the rule | ~ old style; `real-or-suspicious-review` explanation names "brand-new accounts", not on the card | F 6/6 prompts >15w | R `two-hundred-reviews` 48w | n/a | **3** |
| 6.2 What Not to Share | 8 (6 core) | F chat privacy, app permissions, AI "friends" + helplines | P | F | F | F | P | F `type-or-keep` and `app-permissions` (25w) prompts give the rule | ~ old style; `type-or-keep` and `needs-it` explanations name items that aren't there | F 6/6 prompts >15w | R `not-a-person` 60w | n/a | **2** |
| 6.3 Fair and Honest Use | 8 (6 core) | ~ honesty, artist credit, fair AI decisions | P | F opens on an explainer | F | F | P | ~ `captain-picker` prompt states the rule | ~ old style | ~ 4/6 >12w | R `whose-poster` 53w | n/a | **3** |
| Final | 8 core | n/a | P | n/a | n/a | ~ train_model + next_word | P | P | P | ~ 5/8 >12w | ok | n/a | **6** |

### Facts and sources
- **Accurate and sourced** (REVIEW.md): Moon about 384,000 km; octopus has one brain plus arm nerve clusters; penguins "about 18" kinds; nobody has walked on Mars (`mars-walk`); Kids Helpline 1800 55 1800 (ages 5–25), Lifeline 13 11 14, 000; the deepfake sexual material law (Criminal Code Amendment (Deepfake Sexual Material) Act 2024); 4.3 products (ChatGPT/OpenAI, Claude/Anthropic, Copilot/Microsoft, Gemini/Google) and age rules checked 1 Oct 2026, recheck due by **1 Jan 2027**. The vote counts in `words-that-vote` check out.
- **Stale review notes:** REVIEW.md 4.2 cites "15% of 80 = 12" (no such card). REVIEW.md 4.3 quotes lines the lesson no longer has ("some let a parent switch on access…", "Many can also read files…").
- **Possibly out of date by 2026:** 4.2/`latest-phone` and the quizzes treat "can't search the web" as the default. Most major chat assistants now search by default. The cards hedge ("unless it searches the web"), so this is fine, but the framing is ageing. 5.1 recap says "millions" of captioned pictures, which is an understatement (billions). It isn't wrong for a beginner.
- **Mismatched copy** (left over from removed items, so the explanation mentions things the learner never saw): `check-or-fine` ("quotes", "chat names"), `which-apps-use-ai` ("captions"), `kind-of-tool` (translation app, in both nudge and explanation), `always-true` ("a word at a time", "pictures"), `help-or-harm` ("museum guide"), `real-or-suspicious-review` ("brand-new accounts"), `type-or-keep` ("made-up ideas", "friends' photos"), `needs-it` ("every photo").
- **Help placement:** helplines are in free lesson 1.3 and repeated in Pro 6.2, as CLAUDE.md requires. Privacy-with-AI (6.2) is safety content behind Pro; worth considering for free.

---

## Top 10 weaknesses (worst first: impact on a new 13+ learner arriving from TikTok)

1. **1.1 Spot the AI (the only guest lesson) isn't game-like, and its answers give themselves away.** Card 1 (`watch`) is a 20-word, **2-option** question whose answer is drawn in the picture (Robot B holding photos, also in the alt text). `green-apple` and `red-ball` both answer "Robot B", there's no Hook, and no unscored Predict. **Fix:** rebuild 1.1 to v1.1 first: hook ("Your phone unlocked for your face, not your friend's"), a play card (watch both robots sort), `green-apple` as `predict: true` with "Not sure", then vary the winner (add a case the recipe gets right, like "2 + 2"), and give `watch` 3 options.
2. **No pictures in 17 of 18 lessons.** Text-only 4-option MCs (~50-character options) and text sort bins, even in 5.1 "How AI Makes Pictures" and 5.3 "Who Made This?" (`the-shark`, `no-label`). **Fix:** storyboard one recurring picture per lesson (hook, predict and reveal SVGs), starting with 1.2, 1.3 and the five teaser lessons.
3. **No Hook and no unscored Predict anywhere (0/18). 5.1, 6.1 and 6.3 open on an explainer** (`cat-astronaut`, `two-hundred-reviews`, `whose-poster`). **Fix:** turn the natural predicts into `predict: true` cards (`free-pizza-guess`, `hungry-horse`, `cold-ten-times`, `same-prompt-twice`, `mars-walk`) and make each opening explainer a `hook` card.
4. **The answer is in the prompt on about 20 cards,** so they test reading, not thinking: `noise-steps` gives the exact order; `seen-before`, `too-good`, `review-check`, `real-or-suspicious-review`, `inside-or-outside`, `low-or-high`, `homework-helper`, `ai-or-person`, `kind-of-tool`, `type-or-keep`, `app-permissions`, `captain-picker`, `fixes-that-help`, `teacher-video`. **Fix:** move each rule into a Name-it explainer after the predict, and leave the prompt as situation plus action only.
5. **The free module's last lesson (1.3, right before the Pro wall) crams 4 ideas into 7 text cards.** It covers confident-wrong, face mislabel, AI can't care plus helplines, and big decisions need people. **Fix:** split 1.3 into "Sure isn't right" (story: the bridge date) and "Big calls need people", keeping `if-a-chat-upsets-you` word for word.
6. **Wall of words.** 83 of 113 lesson prompts are over 12 words (66 over 15); explainers run to 64 words (`how-to-check-a-picture`), 62 (`spot-the-ai-recap`) and 61 (`rules-and-ages`); explanations reach 47 words (`teacher-video`). These are likely to scroll at 360×560. **Fix:** situation lines under 15 words, explainers 1–2 sentences, explanations one line.
7. **Teaser cards that sell Pro are mostly dull text sorts** (`vague-or-clear`, `review-check`, `prompt-words`). Only `hungry-horse` and `label-messages` are toys. **Fix:** pick a visual toy per Pro module (e.g. `make-it-predictable` for M3 or `fix-the-data` for M2) and add pictures to the M4–M6 teasers.
8. **Several lessons hold too much or run long:** 4.2 (4 ideas), 4.3 (5 ideas), 6.2 (3 ideas: privacy, permissions, AI friends), 2.2 (9 cards, with the off-topic `weather-model`/`cloudy-dry`), 4.1 (9 cards). **Fix:** split 4.3 and 6.2. Cut 2.2 to the memorise-vs-learn story, moving the weather cards to 2.1. Drop one bonus from 4.1.
9. **Explanations that mention items not on the card** (8 cards: `check-or-fine`, `which-apps-use-ai`, `kind-of-tool`, `always-true`, `help-or-harm`, `real-or-suspicious-review`, `type-or-keep`, `needs-it`). This reads as broken. **Fix:** rewrite each explanation and nudge to name only the items shown. This is a bug, so fix it now on every branch.
10. **No 2nd-wrong reveal** (no `showAnswer`, no `"blueprint": "1.1"`), so big sort and match cards can loop on Try again: `clue-or-myth` (7 items), `fair-or-unfair`, `include-or-leave-out`, `review-check` (6 items each). **Fix:** add `showAnswer` lines and the blueprint flag on rebuild, and keep sort cards at 4–5 items.
