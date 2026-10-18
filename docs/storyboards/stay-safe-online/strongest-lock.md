# The Strongest Lock (`strongest-lock`) · NEW lesson, split from `two-step-sign-in`

- **Module:** 1 · Lock Your Accounts · Free
- **The one idea:** Some second locks are harder to steal than others: a passkey is strongest, then
  an authenticator app, then a text code, and any of them beats a password alone.
- **The story:** Mia's phone open on her email's **"Sign-in options"** screen, with three rows: "Text
  me a code", "Authenticator app" and "Passkey". The same calm grey scammer from the last two
  lessons sits far away. Each card changes one thing: the trick the scammer tries, or the lock Mia
  picks.
- **Cards:** 8 · difficulty: easy, easy, medium, stretch
- **From today's lesson:** a new lesson (proposed id `strongest-lock`, order 4, after
  `two-step-sign-in`). Takes from `two-step-sign-in`: `meet-passkey` (now Name it, naming all three
  locks), `rank-proofs` (Easy win) and `text-codes-only` (Real life). Drops `meet-authenticator`
  (folded into the Play and Name it). New: `make-a-passkey`, `try-each-lock`, `number-stolen`,
  `fake-page`, `recap`.
- **Needs building:** a **`security-settings` scene** (a generic phone screen titled "Sign-in
  options" with three tappable rows: Text me a code, Authenticator app, Passkey), used in explore
  mode (card 2) and tap mode (card 3), plus the **reveal state for hotspot tap cards** asked for in
  `one-password-each` (padlocks hold or break, after a right answer, or after any answer on a
  Predict), with its "Not sure" button for card 3.

## 1 · Hook
`make-a-passkey`
- **Situation:** Mia's email asks her to make a passkey. She's never heard of one.
- **Picture:** Mia's phone with a pop-up over her inbox: a small key-and-face icon, "Sign in faster
  with a passkey?", and two buttons, "Not now" and "Make a passkey". A little "?" floats over Mia's
  head beside the phone.
- **Action:** Tap to start.

## 2 · Play
`try-each-lock` · explore mode on the `security-settings` scene (not graded).
- **Situation:** Mia's email offers three locks. Tap each to see how it works.
- **Picture:** Mia's phone on the "Sign-in options" screen, three rows with softly pulsing rings.
  Each tap plays that lock and pins a one-line callout inside the panel:
  - **Text me a code:** a text bubble slides in with "481 902". Callout: "A code comes by text
    message. You type it in."
  - **Authenticator app:** a small app opens showing a code, "730 215". Callout: "An app on your
    phone makes the code. Nothing is sent."
  - **Passkey:** a face outline scans, then a tick. Callout: "Your phone checks your face,
    fingerprint or PIN. No code to type."
- **Action:** Tap each lock.

## 3 · Predict
`number-stolen` · hotspot tap mode on the `security-settings` scene (two targets) · Predict: not scored (any answer, including Not sure, goes straight to the reveal; no hint, no 2nd-wrong step; not counted in first-try accuracy).
- **Situation:** A scammer steals Mia's phone number, so her texts go to them.
- **Picture:** The "Sign-in options" screen with all three rows, each with a shut padlock. Far
  away, the scammer holds a second phone with a "Mia's number" tag, a text bubble arriving on it.
  → **Reveal:** "Text me a code" breaks open, its code bubble flying to the scammer's phone; the
  Authenticator app and Passkey padlocks stay shut, each tagged "Still locked".
- **Action:** Tap every lock that still keeps the scammer out.
- **Answers:** the three rows, then a "Not sure" button under the scene.
- **What happens:** Authenticator app and Passkey still keep the scammer out.
- **Reveal line:** Here's what happens… only the text code travels to Mia's number, so the other two locks hold.

## 4 · Name it
`meet-passkey`
- **Says:** Strongest to weakest: a **passkey**, an **authenticator app**, then a text code. Any of
  them beats a password alone.
- **Picture:** The same three locks, now standing on a podium: Passkey on 1st, Authenticator app on
  2nd, Text code on 3rd, and a lone "Password alone" key on the floor beside it, dashed and grey.

## 5 · Easy win
`rank-proofs` · drag to order (4 items).
- **Situation:** Mia lines up four ways to sign in. Drag strongest to weakest.
- **Picture:** A short ladder with four rungs, top labelled "Strongest" and bottom "Weakest", and
  four shuffled cards beside it, each with its little icon: "Passkey" (face), "Password + authenticator app"
  (app), "Password + text code" (text bubble), "Password alone" (a single key).
- **Action:** Drag each card onto a rung.
- **Answers:** the four cards.
- **Correct:** Passkey · Password + authenticator app · Password + text code · Password alone.
- **Right:** Spot on: each one is harder to steal than the one under it.
- **1st wrong:** Start at the bottom: which one has no second lock at all?
- **2nd wrong:** Passkey, then authenticator app, then text code, then a password alone, with no second lock.

## 6 · Twist
`fake-page` · multiple choice with a picture and a reveal picture; answers drawn as the three locks.
- **Situation:** A fake copy of Mia's email page asks for her password and code.
- **Picture:** A laptop showing a page that looks exactly like Mia's email sign-in, with boxes
  "Password" and "Code". An amber tag on its corner reads "Fake copy" (so the learner knows); the
  scammer peeks from behind the screen. → **Reveal:** Mia's phone says "No passkey for this site"
  and the fake page's boxes stay empty; the scammer shrugs.
- **Action:** Tap the lock that keeps Mia safe here.
- **Answers:** "Text code" · "Authenticator app" · "Passkey"
- **Correct:** Passkey.
- **Right:** Yes: a passkey only works on the real site, so the fake copy gets nothing.
- **1st wrong:** If Mia types a code into this page, who sees it?
- **2nd wrong:** The passkey: any code Mia types goes to the fake page, but a passkey only works on
  the real site.

## 7 · Real life
`text-codes-only` · multiple choice with a picture and a reveal picture.
- **Situation:** Your music app only offers text codes. Turn on two-step sign-in?
- **Picture:** Your phone (no Mia now) on a music app's settings: "Two-step sign-in", one option
  "Text me a code", and its switch off. → **Reveal:** the switch flips on; far away, the scammer is
  stuck at "Enter the code".
- **Action:** Tap what you'd do.
- **Answers:** "Yes: a weak lock beats no lock" · "No: text codes can be stolen" · "Not yet: wait for
  passkeys"
- **Correct:** Yes: a weak lock beats no lock.
- **Right:** Right: most scammers only have a password, and a text code stops them.
- **1st wrong:** Which is harder to get into: a password plus a text code, or a password alone?
- **2nd wrong:** Turn it on: any second lock beats a password alone, and you can switch to a better
  one later.

## 8 · Wrap
`recap`
- **Takeaway:** Use the strongest lock an app offers: passkey, then authenticator app, then text
  code. Any beats none.
- **Try this:** With a trusted adult, or on your own if you're 18+, look in one app's settings for a
  passkey or authenticator app.
- **Next:** The scam email that pretends to be someone you trust.
