# Lock Your Accounts: Module Quiz (`lock-your-accounts-quiz`)

- **Module:** 1 · Lock Your Accounts · Free
- **Tests:** `strong-passwords`, `one-password-each`, `two-step-sign-in`, `strongest-lock` (as
  storyboarded). Nothing else. No hints; one try per question; the explanation shows on the results
  screen.
- **Questions:** 8 (2 per lesson) · pass mark 70% as today
- **From today's quiz:** keeps `q-easy-or-hard`, `q-long-enough`, `q-passphrase`, `q-reused`,
  `q-stolen-password`, `q-code-request` and `q-hardest-account` (each reworded to the new words and
  pictures, and none a copy of a lesson card). New: `q-manager-leak`. `q-stolen-password` no longer
  mentions the authenticator app (that's tested by `q-hardest-account`).
- **Needs building:** nothing beyond the lessons' (`q-reused` uses the `home-screen` scene).

## 1 · `q-easy-or-hard` (strong-passwords)
- **Situation:** Your cousin lists four password ideas. Sort each one.
- **Picture:** Four sticky notes on a desk: `Zoe2009` (a tiny "Zoe, born 2009" doodle), `abc12345`,
  `S@f3ty!`, `pepper orbit willow canoe`. Two bins: "On the guess list" and "Hard to guess".
- **Action:** Drag each note into a bin.
- **Answers:** the four notes.
- **Correct:** On the guess list: `Zoe2009`, `abc12345`, `S@f3ty!`. Hard to guess:
  `pepper orbit willow canoe`.
- **Explanation:** Names, years, common patterns and symbol swaps get tried first; four random words
  aren't on the guess list.

## 2 · `q-long-enough` (strong-passwords)
- **Situation:** Make an all-lowercase password last at least a million years.
- **Picture:** The guessing computer from the lesson ("Scammer's computer", "1 billion guesses a
  second") with its timer, and the password box above a length slider (4–20 letters).
- **Action:** Drag the slider.
- **Answers:** any length on the slider.
- **Correct:** 16 letters or more (16 is about 1 million years; 15 is about 53,000).
- **Explanation:** Around 16 lowercase letters gets past a million years: each letter means 26 times
  more guesses.

## 3 · `q-passphrase` (strong-passwords)
- **Situation:** Your aunt needs a new password for her email. Pick the best.
- **Picture:** Your aunt's laptop on a "New password" screen, with three password cards above it.
- **Action:** Tap the password she should use.
- **Answers:** `cactus orbit lantern velvet` · `To be or not to be, that is the question` ·
  `P@ssw0rd!Summer2026`
- **Correct:** `cactus orbit lantern velvet`
- **Explanation:** Four random words make a passphrase; a famous line and swaps on a common word are
  on the guess list.

## 4 · `q-reused` (one-password-each)
- **Situation:** Your music app leaks. You used that password everywhere. Which do you change first?
- **Picture:** The `home-screen` scene with Game Club, Email and Music, one key for all three, and a
  red "Hacked!" banner across Music.
- **Action:** Tap the app to change first.
- **Answers:** the three app icons.
- **Correct:** Email.
- **Explanation:** Email first, because it can reset all your other passwords; then give every app
  its own.

## 5 · `q-manager-leak` (one-password-each)
- **Situation:** Leo's password manager gives his 30 accounts each their own password.
- **Picture:** Leo's phone with a vault app holding many different keys and a "30" counter. One
  game site's icon has a red "Hacked!" banner.
- **Action:** Tap what the scammer can now open.
- **Answers:** "Just that game account" · "All 30 accounts" · "Leo's password manager"
- **Correct:** Just that game account.
- **Explanation:** Every account has its own password, so one leak only opens one account.

## 6 · `q-stolen-password` (two-step-sign-in)
- **Situation:** A leak gave a stranger your game password. Two-step sign-in is on.
- **Picture:** Far away, the stranger's laptop on your game's sign-in page, your password typed in
  and the pointer on "Next"; close by, your phone in your pocket.
- **Action:** Tap whether they can get in.
- **Answers:** "No: they'd need the code from your phone" · "Yes: the password is all they need" ·
  "Yes: the code goes to whoever types the password"
- **Correct:** No: they'd need the code from your phone.
- **Explanation:** The password is only step one; the code goes to your phone, which they don't have.

## 7 · `q-code-request` (two-step-sign-in)
- **Situation:** Someone from "game support" messages you about a code.
- **Picture:** Your phone: a notification "Your sign-in code is 552 018", and under it a chat from
  "Game Support": "We just texted you a code. Tell us it so we can check it's you."
- **Action:** Tap what this is.
- **Answers:** "A scam: nobody real asks for your code" · "Real support checking it's you" · "Safe,
  if they already know your username"
- **Correct:** A scam: nobody real asks for your code.
- **Explanation:** No real company ever asks for a sign-in code; whoever asks is trying to get into
  your account.

## 8 · `q-hardest-account` (strongest-lock)
- **Situation:** Four friends lock their email in different ways. Whose is hardest to break into?
- **Picture:** Four friends in a row, each with a card over their head: Ava "Passkey" (face icon),
  Ben "Password + authenticator app", Cleo "Password + text code", Dev "Long passphrase, nothing else".
- **Action:** Tap the friend.
- **Answers:** Ava · Ben · Cleo · Dev
- **Correct:** Ava.
- **Explanation:** A passkey is strongest, then an authenticator app, then a text code; a password alone,
  however long, has no second lock.
