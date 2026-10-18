# Two-Step Sign-In (`two-step-sign-in`)

- **Module:** 1 · Lock Your Accounts · Free
- **The one idea:** Two-step sign-in sends a code to your phone, so a stolen password alone can't get
  in, as long as you never give the code away.
- **The story:** Mia's email sign-in page and Mia's phone. Mia sits at home on the left; far away on
  the right (across a dotted line), the same calm grey scammer with a laptop from last lesson. Each
  card changes one thing: who is typing, or what arrives on Mia's phone.
- **Cards:** 8 · difficulty: easy, easy, medium, stretch
- **From today's lesson:** keeps `thief-hits-step-two` (Predict), `meet-two-step` (Name it),
  `the-code-text` (Easy win: its first step only) and `recap`. Its second step (the "friend" asking
  for the code) becomes its own card, `friend-wants-code` (Twist). New: `scammer-has-password`,
  `sign-in-demo`, `email-first`. Dropped: `stranger-far-away` (its point, "a stranger far away can't
  grab your phone", now sits in the Hook picture and Name it). Moved: `forty-accounts` (password
  manager) to `one-password-each`. **Split:** passkeys, authenticator apps and the ranking of second
  locks are a second idea, so `meet-passkey`, `meet-authenticator`, `rank-proofs` and
  `text-codes-only` move to the new lesson `strongest-lock`.
- **Needs building:** a **sign-in demo** toy for card 2 (ungraded: tap Next, Mia's phone buzzes
  with a code, tap the code to fill the box, the inbox opens; fallback: explore mode on a new
  generic `sign-in` scene with three parts, the password box, the code box and the phone). Card 7
  reuses the **`home-screen` scene** from `one-password-each`, with a fourth app, Photos.

## 1 · Hook
`scammer-has-password`
- **Situation:** A scammer far away got Mia's email password from a leak.
- **Picture:** A wide strip. Left: Mia on her couch, her phone poking out of her hoodie pocket.
  Right, across a long dotted line over a little sea: the scammer at a laptop, a sticky note on it
  reading "Mia's email password ••••••••".
- **Action:** Tap to start.

## 2 · Play
`sign-in-demo` · not graded.
- **Situation:** Sign in to Mia's email, the way she does.
- **Picture:** Mia's laptop with a plain "Email" sign-in page: "Step 1: Password" with the box
  filled in (dots) and a "Next" button; Mia's phone lies beside it. After Next: the page changes to
  "Step 2: Enter the code we sent to your phone" with an empty box, and the phone buzzes with
  "Your sign-in code is 481 902". Tapping the code drops it into the box, and the page opens on an
  inbox reading "Welcome back, Mia".
- **Action:** Tap Next, then tap the code on the phone.

## 3 · Predict
`thief-hits-step-two` · multiple choice with a picture and a reveal picture · Predict: not scored (any answer, including Not sure, goes straight to the reveal; no hint, no 2nd-wrong step; not counted in first-try accuracy).
- **Situation:** Far away, the scammer types Mia's password and taps Next.
- **Picture:** The scammer's laptop showing the same "Email" page, "Step 1: Password" filled in, the
  pointer on "Next". Small inset, far away: Mia's phone in her pocket. → **Reveal:** the scammer's
  screen shows "Step 2: Enter the code we sent to your phone" with an empty box; far away, Mia's
  phone buzzes with the code. The scammer sits stuck, a little "?" over their head.
- **Action:** Tap what happens next.
- **Answers:** "The scammer gets in" · "The scammer is stuck" · "The code goes to the scammer" ·
  "Not sure"
- **What happens:** "The scammer is stuck".
- **Reveal line:** Here's what happens… the code goes to Mia's phone, so the scammer is stuck at step 2.

## 4 · Name it
`meet-two-step`
- **Says:** This is **two-step sign-in**: your password, then a second lock, a **code** sent to your
  phone. A scammer far away can steal a password, but not the phone in your pocket.
- **Picture:** The same strip as the Hook, now labelled: "Step 1: password" by the scammer's sticky
  note (with a tick: they have it) and "Step 2: code" by Mia's phone (with a cross on the scammer's
  side: they don't).

## 5 · Easy win
`the-code-text` · multiple choice with a picture and a reveal picture.
- **Situation:** Mia's phone buzzes with a sign-in code. She didn't sign in.
- **Picture:** Mia on the couch watching TV, her lock screen showing "9:14 pm" and the notification
  "Email: Your sign-in code is 481 902". → **Reveal:** an inset bubble shows the scammer, far away,
  stuck on "Enter the code"; Mia's screen shows "Password changed ✓".
- **Action:** Tap what the code means.
- **Answers:** "Someone has my password and is trying it" · "Nothing: codes just turn up sometimes" ·
  "The app is testing my phone"
- **Correct:** Someone has my password and is trying it.
- **Right:** Yes: a code only comes when someone types your password, so change it now.
- **1st wrong:** When does a code get sent? Think back to the scammer's screen.
- **2nd wrong:** Someone has her password: codes only come when it's typed, so she changes it now.

## 6 · Twist
`friend-wants-code` · multiple choice with a picture and a reveal picture.
- **Situation:** Mia just got a sign-in code. Then her friend Leo messages her.
- **Picture:** Mia's phone. At the top, the notification "Your sign-in code is 481 902". Below, a
  chat from "Leo" (a plain circle with the letter L, no photo): "Oops, I sent my code to you by
  mistake! Can you send it back?" → **Reveal:** the L circle flips over to show the grey scammer
  behind it, typing; Mia's email padlock stays shut.
- **Action:** Tap what Mia should do.
- **Answers:** "Send it back to help Leo" · "Don't send it, and change my password" · "Ask Leo why,
  then send it"
- **Correct:** Don't send it, and change my password.
- **Right:** Right: that code unlocks Mia's account, so it never goes to anyone, even a friend.
- **1st wrong:** Look at the top of the screen: whose account is that code for?
- **2nd wrong:** Don't send it: the code unlocks Mia's account, and "Leo" could be a scammer using his
  account.

## 7 · Real life
`email-first` · hotspot tap mode on the `home-screen` scene.
- **Situation:** Your phone has these apps. Which gets two-step sign-in first?
- **Picture:** Your own home screen (no Mia now) with four app icons: Game Club, Email, Music,
  Photos, each with a small open padlock. → **Reveal:** Email's padlock shuts with a "Two-step on" tag,
  and dotted lines run from Email to the other three, labelled "can reset".
- **Action:** Tap the app to protect first.
- **Answers:** the four app icons.
- **Correct:** Email.
- **Right:** Yes: your email can reset your other passwords, so lock it first.
- **1st wrong:** Think back to "Forgot password?": where do reset links go?
- **2nd wrong:** Email: whoever gets into it can reset the rest, so it gets two-step sign-in first.

## 8 · Wrap
`recap`
- **Takeaway:** Two-step sign-in means a stolen password isn't enough, as long as you never share
  your code.
- **Try this:** With a trusted adult, or on your own if you're 18+, turn on two-step sign-in for your
  email.
- **Next:** Which second lock is hardest to break, and why your face beats a text.
