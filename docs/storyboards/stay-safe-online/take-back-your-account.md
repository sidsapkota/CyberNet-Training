# Take Your Account Back (`take-back-your-account`, new lesson)

- **Module:** 4 · When Things Go Wrong · Free (help module, open to guests)
- **The one idea:** a new password alone isn't enough: after telling a trusted adult, lock every door
  whoever got in could use.
- **The story:** the same phone and Chat account as `signs-of-a-hack`, now on its "Security" page. The
  laptop from 2:13 am is still signed in, and the recovery email is one you've never seen. A trusted
  adult sits with you. Each card closes (or tests) one door: the password, the laptop, the recovery
  email, then a stranger's "unlock" offer.
- **Cards:** 8 · difficulty: Predict easy, Easy win easy, Twist medium, Real life stretch
- **From today's lesson:** new lesson, split from `signs-of-a-hack` (proposed order 2 in the module;
  icon `key-round`). Carries over, as new cards in this lesson: the steps from `step-by-step` (now the
  Name it), the "still signed in" idea from `weird-messages` and `lock-them-out` (now Predict and Easy
  win), `recovery-changed` (now the Twist) and `pay-to-unlock` (now Real life). Dropped:
  `order-the-steps` (the later steps have no single right order, so an exact-order drag isn't fair);
  the order now lives in the Name it. "Change that password anywhere you reused it" moves to the Wrap.
  Proposed step order for REVIEW.md: tell a trusted adult, change the password, sign out other
  devices, fix the recovery email, turn on two-step sign-in (sign-out after the password change, so
  whoever got in can't just sign back in with the old one; REVIEW already says the order is a
  sensible default).
- **Needs building:** the `account` scene's `security` view (see `signs-of-a-hack`): four tappable
  rows (Password, Where you're signed in, Recovery email, Two-step sign-in) with their buttons as
  separate parts, so Easy win can make "Sign out" a tap target. Explore and tap modes exist. Real apps
  word these settings differently (already a REVIEW.md simplification). New simplification to record:
  some apps offer to sign out other devices when you change the password, so the lesson says a device
  "may" stay signed in, never that it always does.

## 1 · Hook (`show-an-adult`)
- **Situation:** Someone got into your Chat account. You show a trusted adult.
- **Picture:** you and an older adult side by side on a sofa, both looking at your phone. Your speech
  bubble: "Someone's in my account." The adult's bubble: "Let's fix it together." The phone shows an
  amber banner: "Laptop signed in · 2:13 am".
- **Action:** Tap to start.

## 2 · Play (`security-page`, not graded: hotspot explore on `account`, view `security`)
- **Situation:** This is your account's Security page.
- **Picture:** the phone fills the card, showing four rows:
  - "Password" with a "Change" button
  - "Where you're signed in": "This phone" and "Laptop", each with a "Sign out" button
  - "Recovery email: x9.help@mail.example" with an "Edit" button
  - "Two-step sign-in" with a switch set to Off
  Every row has the same faint hollow ring.
- **Action:** Tap each setting to see what it does.
- **What each tap shows:**
  - Password: "Your key. A new one stops the old one working."
  - Where you're signed in: "Every device in your account right now. Sign out kicks one out."
  - Recovery email: "Forgot your password? A reset link goes to this email."
  - Two-step sign-in: "When it's on, the app also asks for a code from your phone."
- Continue unlocks once all four have been tapped.

## 3 · Predict (`still-signed-in`, easy · multiple choice with picture)
Predict: not scored (any answer, including Not sure, goes straight to the reveal; no hint, no 2nd-wrong step; not counted in first-try accuracy).
- **Situation:** You change your password. The laptop was signed in before.
- **Picture:** the Security page; the Password row now reads "Changed just now". The Laptop row is
  still in the list, dimmed slightly. → **Reveal:** a small pulsing dot and "Active now" appear on the
  Laptop row.
- **Action:** Tap whether the laptop is still in your account.
- **Answers:** "It may still be signed in" · "No: the new password kicked it out" · "No: the app
  spotted it and removed it" · "Not sure"
- **What happens:** "It may still be signed in": the laptop shows "Active now".
- **Reveal line:** Here's what happens… a new password stops new sign-ins, but this laptop was already in, so it stayed in.

## 4 · Name it (`lock-every-door`, explainer)
- **Says:** A new password alone isn't enough. After telling a trusted adult, lock every door:
  **change the password**, **sign out other devices**, fix the **recovery email** and turn on
  **two-step sign-in**.
- **Picture:** the same Security page with a banner on top, "First: tell a trusted adult", and
  numbered markers 1 to 4 beside the rows in that order (Password, Sign out Laptop, Recovery email,
  Two-step sign-in).

## 5 · Easy win (`sign-out-laptop`, easy · hotspot tap on `account`, view `security`)
- **Situation:** Password changed. The laptop is still signed in.
- **Picture:** the Security page as in Play, Password row reading "Changed just now". Every row and
  button has the same hollow ring. → After a right answer, the Laptop row slides away and the list
  shows only "This phone".
- **Action:** Tap what kicks the laptop out.
- **Answers:** the tappable rows and buttons (Password "Change", Laptop "Sign out", Recovery email
  "Edit", Two-step switch).
- **Correct:** "Sign out" on the Laptop row
- **Right:** Signing out other devices kicks the laptop out, and your new password keeps it out. Now
  warn your friends about that link.
- **1st wrong:** Which setting shows every device that's in your account right now?
- **2nd wrong:** It's "Sign out" beside Laptop: that kicks a device out of your account.

## 6 · Twist (`recovery-changed`, medium · multiple choice with picture)
- **Situation:** Laptop gone. But you've never seen this recovery email before.
- **Picture:** the Security page with the Recovery email row highlighted: "x9.help@mail.example".
  → **Reveal:** the row now reads "me@mail.example", and the Two-step switch flips to On.
- **Action:** Tap what you do about it.
- **Answers:** "Remove it and add your own email" · "Leave it: the laptop's signed out now" · "Leave
  it: it's only a backup"
- **Correct:** "Remove it and add your own email"
- **Right:** A recovery email can reset your password, so only yours belongs there.
- **1st wrong:** What can a recovery email do if someone says they forgot the password?
- **2nd wrong:** Remove it and add your own: whoever owns that email could reset your password and get
  back in.

## 7 · Real life (`pay-to-unlock`, stretch · multiple choice with picture)
- **Situation:** Your game account won't let you in. Then this message arrives.
- **Picture:** a phone showing a direct message from an account named "Account Fixer": "Locked out?
  I can unlock it in 5 minutes. Just $20." Below it, the game app's own sign-in screen, faint, with a
  "Forgot password?" link.
- **Action:** Tap what you do.
- **Answers:** "Use the game's own 'Forgot password', with a trusted adult" · "Pay: $20 is worth it to
  get back in" · "Wait for the game's support team to message you"
- **Correct:** "Use the game's own 'Forgot password', with a trusted adult"
- **Right:** Only the app can unlock your account, and its own recovery is free.
- **1st wrong:** Can anyone outside the app open your account for you?
- **2nd wrong:** Use the game's own "Forgot password" and never pay: strangers can't unlock accounts,
  and real support never messages you asking for money.

## 8 · Wrap (`recap`)
- **Takeaway:** Tell a trusted adult, lock every door, then change that password anywhere else you
  used it.
- **Try this:** Check that the recovery email on one of your accounts is really yours.
- **Next:** A call in Grandma's voice that isn't Grandma.
