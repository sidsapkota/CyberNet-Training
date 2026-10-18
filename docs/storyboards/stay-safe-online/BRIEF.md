# Brief: Stay Safe Online storyboards (Lesson Blueprint v1)

Write text storyboards only. Do not edit `content/`, `src/`, `CLAUDE.md` or any other file outside
`docs/storyboards/stay-safe-online/`, and do not run git.

## Read first
1. `CLAUDE.md`: the section "Lesson Blueprint v1" (the 8 beats, the 4-part question card, feedback,
   difficulty, words) and the "Content style guide" (especially *Online safety content*, *Help is
   always free*, *Safe examples only*, *Prior knowledge only*, hints and nudges).
2. `docs/storyboards/README.md`: the template. Follow it exactly, one file per lesson.
3. The current lesson JSON in `content/courses/stay-safe-online/modules/<module>/lessons/`, and that
   lesson's entry in `content/REVIEW.md` (its goals, the verified facts and their sources). Rebuild the
   lesson around the same idea and the same verified facts.

## Rules that matter most
- **One idea per lesson, 6–8 cards, one story.** The same characters or objects stay on screen all
  lesson (e.g. one teen, one phone, one fictional bank) and each card changes ONE thing. If today's
  lesson teaches two ideas, storyboard it as two lessons: keep the existing lesson id for the first
  idea and propose a new kebab-case id for the second (say so in "From today's lesson").
- **The 8 beats in order:** Hook (tap to start) → Play (a toy they mess with, not graded) → Predict
  (guess, then the reveal) → Name it (1–2 sentences, the same picture now labelled) → Easy win →
  Twist → Real life (their own phone, apps, home) → Wrap (takeaway, "Try this", one-line tease of the
  next lesson). The Hook can share a card with Play when that's more natural; say so.
- **Every question card has 4 parts:** a situation under 15 words that makes sense on its own (never
  "Who gets it right?" alone), a picture that fills the card, an action verb, and answers that are
  tappable objects where possible.
- **Feedback for every question card:** Right = one line saying why. 1st wrong = a hint pointing to
  the idea, never the answer. 2nd wrong = the answer plus one line. Never show the answer early.
- **Difficulty:** easy, easy, medium, one stretch card. Aim for 80–85% getting each right first try.
- **Words:** plain language a 13-year-old gets on first read. No new term before it has been shown.
  One word per idea, used the same way everywhere (pick the word and stick to it across the course).
- **Defence only.** Never how to make a scam or attack anyone. Every scam example is fictional ("Your
  Bank", "Parcels") and every address uses the reserved `.example` domain. Calm and empowering, never
  scary; it's never the learner's fault and a trusted adult is always an option.
- **Facts:** only use facts, numbers, services and advice already verified in `content/REVIEW.md`
  for this course (help services: eSafety, Scamwatch, IDCARE, cyber.gov.au, ACCCE, Kids Helpline with
  Lifeline next to it). Never invent a statistic, phone number or claim. If a beat needs a fact you
  can't find there, write `NEEDS FACT CHECK:` and what's needed.
- **Prior knowledge:** a card may only rely on what's been shown earlier in the lesson or an earlier
  lesson of this course.
- **Help is always free:** help and recovery content stays in its free module, in core cards.
- **What exists:** card types are listed in CLAUDE.md (multiple choice with a picture and a reveal
  picture, sort bins, match pairs, drag to order, hotspot on the `email`, `text-message` and
  `fake-website` scenes, scenario, simulator with the `password` model, reveal, explainer, true or
  false, fill the gap). Prefer them. If a beat really needs something new (an ungraded "play" mode for
  a simulator, answers that are tappable parts of a picture, a new scene), write it under "Needs
  building" with one line on what it does.
- **Picture descriptions are concrete** (what's drawn, where, what text appears in it, in which
  state), so an illustrator could draw it. Any text inside a picture must be short enough to read at
  14px on a phone.
- **Keep it short.** Situations under 15 words; feedback lines one sentence; Name it 1–2 sentences.

## Output
One Markdown file per lesson, `docs/storyboards/stay-safe-online/<lesson-id>.md` (and the proposed new
id for a split-off lesson), plus one file per module quiz, `<quiz-id>.md`, as a list of 5–8 questions
in the same 4-part form (situation, picture, action, answers, correct, and the one-line explanation
shown on the results screen; quizzes have no hints) that only test what the storyboarded lessons teach.

Finish with a short report: the files written, any proposed splits (with new ids), anything under
"Needs building", and any NEEDS FACT CHECK lines.
