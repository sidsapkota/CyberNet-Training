# One Password Each (`one-password-each`) · NEW lesson, split from `strong-passwords`

- **Module:** 1 · Lock Your Accounts · Free
- **The one idea:** Give every account its own password, so one leak only opens one account.
- **The story:** Mia's phone home screen with three apps: **Game Club**, **Email** and **Music**.
  Each app has a small padlock on its corner. Mia's great passphrase from last lesson,
  `violet cactus harbour pepper`, is drawn as one cyan key. Far away (top corner, small and calm, not
  scary): a grey figure with a laptop, the scammer. Each card changes one thing: which keys open
  which apps.
- **Cards:** 8 · difficulty: easy, easy, medium, stretch
- **From today's lesson:** a new lesson (proposed id `one-password-each`, order 2, after
  `strong-passwords`). Takes `the-leak` from `strong-passwords` (now the Twist, change email first)
  and `forty-accounts` from `two-step-sign-in` (now Real life; the password manager moves here, where
  it answers "how do I remember them all?"). New: `same-key-everywhere`, `tap-each-app`,
  `what-opens`, `meet-leak`, `own-passwords`. The words "leak" (not "data breach") and "password
  manager" are introduced here and used the same way in later lessons.
- **Needs building:** a **`home-screen` scene** (a generic phone home screen; parts: Game Club,
  Email, Music; each app icon a tappable part with a padlock that can show
  locked or open), used in explore mode (card 2) and tap mode (cards 3, 5, 6), with a "Not sure"
  button when tap mode is a Predict (card 3); and a **reveal state for hotspot tap cards** (after a
  right answer, or after any answer on a Predict: padlocks swing open or stay shut). Fallback if
  not built: multiple choice with a picture and a reveal picture, answers as short text ("Only Game
  Club", "Game Club and Email", "All three").
- **Fact checked (18 Oct 2026):** card 7's "you only remember the one password that opens it": a
  password manager is opened with one **master password**, which should be your strongest passphrase and
  used nowhere else (cyber.gov.au, *Personal cyber security: Next steps*). Goes into `content/REVIEW.md`
  at build time.

## 1 · Hook
`same-key-everywhere`
- **Situation:** Mia loves her new passphrase. So she uses it everywhere.
- **Picture:** Mia's home screen with the three apps (Game Club, Email, Music). One cyan key
  labelled `violet cactus harbour pepper` hovers over them, with three thin lines from the key to
  each app's padlock.
- **Action:** Tap to start.

## 2 · Play
`tap-each-app` · explore mode on the `home-screen` scene (not graded).
- **Situation:** Tap each app to see how Mia signs in.
- **Picture:** The same home screen; each app icon has a softly pulsing ring. Each tap slides the
  cyan key into that app's padlock, the padlock clicks open, and the callout (pinned inside the
  panel) says the app's name and "Password: `violet cactus harbour pepper`". After all three: three
  open padlocks, one key.
- **Action:** Tap each app.

## 3 · Predict
`what-opens` · hotspot tap mode on the `home-screen` scene · Predict: not scored (any answer, including Not sure, goes straight to the reveal; no hint, no 2nd-wrong step; not counted in first-try accuracy).
- **Situation:** Game Club gets hacked, and Mia's password is stolen.
- **Picture:** The home screen, all padlocks shut. Game Club's icon has a red "Hacked!" banner
  across it. Top corner: the scammer, now holding a copy of the cyan key. → **Reveal:** the copied
  key flies to each app in turn and all three padlocks swing open.
- **Action:** Tap every app the scammer can now open.
- **Answers:** the three app icons (Game Club, Email, Music), then a "Not sure" button under the scene.
- **What happens:** All three open.
- **Reveal line:** Here's what happens… the scammer tries the stolen password everywhere, and Mia used it on all three apps.

## 4 · Name it
`meet-leak`
- **Says:** When a site is hacked and passwords are stolen, that's a **leak**. Scammers try leaked
  passwords on other apps, so give every account its **own** password.
- **Picture:** The same home screen, now with three different keys (cyan, amber, green), one per
  app, labelled "own password" under each. The "Hacked!" banner on Game Club is labelled "leak".

## 5 · Easy win
`own-passwords` · hotspot tap mode on the `home-screen` scene.
- **Situation:** Mia gives each app its own password. Then Game Club leaks.
- **Picture:** The home screen with three different keys, one per app, all padlocks shut. Game Club
  has the "Hacked!" banner; the scammer holds a copy of Game Club's amber key only. → **Reveal:**
  the amber key opens Game Club; it bounces off Email and Music, which stay locked.
- **Action:** Tap every app the scammer can now open.
- **Answers:** the three app icons.
- **Correct:** Game Club only.
- **Right:** Right: the stolen key only fits Game Club, so Email and Music stay safe.
- **1st wrong:** Which app's key did the scammer copy?
- **2nd wrong:** Only Game Club: each app has its own password, so one leak opens one app.

## 6 · Twist
`the-leak` · hotspot tap mode on the `home-screen` scene.
- **Situation:** Game Club leaks. Mia used that password everywhere. Which does she change first?
- **Picture:** Back to one cyan key for all three apps, Game Club has the "Hacked!" banner. Under the
  home screen, a small Game Club sign-in screen with a "Forgot password?" link and the line "We'll
  email you a link". → **Reveal:** Email's padlock gets a brand-new key and shuts with a click; a
  dotted line shows reset links flowing from Email to Game Club and Music.
- **Action:** Tap the app to change first.
- **Answers:** the three app icons.
- **Correct:** Email.
- **Right:** Yes: reset links go to your email, so whoever has it can reset the rest.
- **1st wrong:** Look at "Forgot password?": where does the reset link go?
- **2nd wrong:** Email first: it can reset all your other passwords. Then give each app its own.

## 7 · Real life
`forty-accounts` · multiple choice, each answer drawn as an object.
- **Situation:** You have 40 accounts. How can each have its own password?
- **Picture:** Your phone with a full home screen (rows of plain app icons, no names) and a little
  "40" counter. Three answer tiles under it: a single key with "×40" ("One great password for all
  40"), a sticky note reading `game1 game2 game3…` ("A pattern"), and a locked vault app holding
  many different keys ("An app that remembers each one").
- **Action:** Tap the safest way.
- **Answers:** "One great password for all 40" · "A pattern: game1, game2, game3…" · "An app that
  remembers each one"
- **Correct:** An app that remembers each one.
- **Right:** That's a **password manager**: it remembers every password, so you only remember the
  one that opens it.
- **1st wrong:** If one of your 40 passwords leaks, what happens to the others?
- **2nd wrong:** The app, called a **password manager**: one password for all 40, or a pattern that's
  quick to guess, lets one leak open the rest.

## 8 · Wrap
`recap`
- **Takeaway:** Every account gets its own password; a password manager remembers them for you.
- **Try this:** If your email password is used anywhere else, change it to a new passphrase. With a
  trusted adult, or on your own if you're 18+, set up a password manager.
- **Next:** The second lock that stops a stolen password cold.
