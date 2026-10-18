# Storyboards

Lesson Blueprint v1 (CLAUDE.md → CyberNet design playbook): every lesson is storyboarded in text
first, the owner OKs each course's storyboards on one review page, then the course is built to them.

- One file per lesson: `docs/storyboards/<course-id>/<lesson-id>.md` (quizzes too, as a question list).
- A rebuilt lesson keeps the ids of cards that survive (progress is keyed on ids); new cards get new ids.
- A lesson that holds two ideas is split; the storyboard says so and names the new lesson's id.

## Template

```md
# <Lesson title> (`lesson-id`)

- **Module:** <n> · <title> · Free | Pro
- **The one idea:** <one plain sentence>
- **The story:** <the characters and objects on screen all lesson; each card changes one thing>
- **Cards:** <6–8> · difficulty: easy, easy, medium, stretch
- **From today's lesson:** <card ids kept, and what's new or dropped>
- **Needs building:** <any card type or feature the player doesn't have yet, or "nothing new">

## 1 · Hook
- **Situation:** <under 15 words>
- **Picture:** <what's drawn; any text in it is listed and reads at 14px on a phone>
- **Action:** <the verb>

## 2 · Play
- **Situation / Picture / Action** as above (not graded)

## 3 · Predict (not scored: "Not sure" is added; any answer goes straight to the reveal)
- **Situation:** <under 15 words; makes sense on its own>
- **Picture:** <before> → **Reveal:** <shown after any answer>
- **Action:** <verb>
- **Answers:** <3+ tappable objects or short text>, Not sure
- **What happens:** <which answer turns out to be what happens>
- **Reveal line:** Here's what happens… <one line: what happened and why>

## 4 · Name it
- **Says:** <1–2 plain sentences> · **Picture:** <the same picture, now labelled>

## 5 · Easy win · 6 · Twist · 7 · Real life
(question cards, 3+ answers)
- **Situation / Picture (→ Reveal after a right answer) / Action / Answers**
- **Correct:** <which>
- **Right:** <one line saying why>
- **1st wrong:** <a hint pointing to the idea; never the answer>
- **2nd wrong:** <the answer + one line, then continue>

## 8 · Wrap
- **Takeaway:** <one line> · **Try this:** <one thing to do today> · **Next:** <one-line tease>
```
