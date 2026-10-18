# Scam Emails (`phishing-emails`)

- **Module:** 2 · Spot the Scam · Pro
- **The one idea:** A scam email pretends to be someone you trust, but its warning signs give it away.
- **The story:** Sam, Sam's phone and one email from "Your Bank" (the `email` scene). Each card changes
  one thing: the email arrives, Sam looks closer, taps the button, sees the signs named, finds them
  alone, then gets a friendly prize email and an email that knows Sam's name.
- **Cards:** 8 · difficulty: easy (3 Predict), easy (5 Easy win), medium (6 Twist), stretch (7 Real life)
- **Teaser card (`teaserCard` in module.json):** card 6, `prize-email`. Its situation stands on its own,
  it's interactive and core, and it isn't a hotspot.
- **From today's lesson:** keeps `meet-the-signs` (Play), `type-in-the-button` (Predict), `meet-phishing`
  (Name it, now an explainer with the labelled email instead of a term reveal), `spot-the-signs` (Easy
  win), `prize-email` (Twist, now multiple choice with a picture instead of a scenario), `knows-your-name`
  (Real life, now multiple choice) and `recap` (Wrap). New: `sam-gets-an-email` (Hook). Dropped:
  `real-sender` (the address-reading rule is taught properly in Fake Websites) and the "Alex already typed
  the password" step of `knows-your-name` (recovery is taught in the free module 4, Signs of a Hack).
  Title becomes **Scam Emails**, because the course's shared word is "scam"; "phishing" appears once,
  in the Wrap, as the nickname they'll hear, and is never tested. "Too good to be true" moves from the
  Play into the Twist.
- **Needs building:** a **hook card** (a full-width picture, one line, tap to start). Until it exists,
  card 1 can be a `reveal` on the email scene's subject line. Everything else uses existing types; new
  pictures are the lock screen, the labelled email, the prize email (and its reveal) and the school email.

## 1 · Hook
- **Situation:** Sam's phone buzzes. Your Bank says the account closes tomorrow.
- **Picture:** Sam's phone lock screen: the time "9:12", and one notification card in the middle:
  a small envelope icon, "Your Bank" in bold, and below it "URGENT: Your account will be closed in 24
  hours". A soft pulse ring around the notification shows it can be tapped.
- **Action:** Tap the notification to open it.

## 2 · Play
- **Situation:** Sam opens the email. Tap each line to look closer.
- **Picture:** the existing `email` scene, full width (From, date, subject, "Dear Customer,", the message
  asking for a password and card number, the "Verify my account" button, the sign-off). Five lines
  carry a hollow node that pulses twice. Each tap shows a callout pinned inside the scene:
  - **From:** "The name says Your Bank, but look after the @: yourbank-help.example. Your Bank's is
    yourbank.example."
  - **Subject:** "URGENT, 24 hours! A hurry like this stops you thinking it through."
  - **"Dear Customer,":** "Your Bank knows your name. But names are easy to find, so a name never
    proves an email is real."
  - **Message:** "It wants your password and card number. Real companies never ask for those by email."
  - **Button:** "Press and hold a link to see where it goes. This one goes to yourbank-verify.example,
    not Your Bank."
- **Action:** Tap each glowing line (Continue unlocks after all five). Not graded.

## 3 · Predict
- **Situation:** Sam taps "Verify my account" and types the password. Who gets it?
- **Picture:** the email's button pressed, leading (arrow) to a plain sign-in page on Sam's phone with
  "••••••••" typed in the password box and a "Sign in" button. Below it, three tappable objects in a row:
  a bank building with "Your Bank" on it; a laptop with a sticker "yourbank-verify.example"; a phone
  with a shield on its screen labelled "Nobody: the phone blocks it".
  → **Reveal:** the password flies as a small key from Sam's phone into the yourbank-verify.example
  laptop. The laptop then tries the key on Your Bank's door. Your Bank's building stays untouched.
- **Action:** Tap who gets the password.
- **Answers:** Your Bank (bank building) · yourbank-verify.example (laptop) · Nobody (phone with shield)
- **Correct:** yourbank-verify.example (laptop)
- **Right:** The button goes to yourbank-verify.example, so the password goes straight to them.
- **1st wrong:** Remember what pressing and holding the button showed: where does it really go?
- **2nd wrong:** The laptop: yourbank-verify.example gets it, because that's where the button really goes.

## 4 · Name it
- **Says:** A **scam** email pretends to be someone you trust, and each clue that gives it away is a
  **warning sign**. Spot one? Skip its link and open the real app or website yourself.
- **Picture:** the same email, now with five amber tags pointing at their lines: "Fake sender" (From),
  "Rushing you" (subject), "Dear Customer" (greeting), "Asks for secrets" (message), "Fake link" (button).
  The date and sign-off have no tag.

## 5 · Easy win
- **Situation:** This "Your Bank" email is a scam. Find every warning sign in it.
- **Picture:** the `email` scene again, no tags, every line tappable (hollow rings on all seven, so the
  rings never hint which are right).
- **Action:** Tap every warning sign, then Check.
- **Answers:** the seven lines of the email
- **Correct:** From, subject, "Dear Customer,", the message asking for secrets, the button (not the
  date or the sign-off)
- **Right:** All five: fake sender, rushing you, "Dear Customer", asks for secrets and a fake link.
- **1st wrong:** There are five. Go line by line and ask: would the real Your Bank do this?
- **2nd wrong:** The five are the sender, the subject, "Dear Customer", the request for secrets and
  the button. The time and sign-off are normal.

## 6 · Twist (teaser card)
- **Situation:** Sam never entered a competition. Now an email says Sam won a console.
- **Picture:** a new email in the same mail-app style: "From: Prize Team <win@big-prizes.example>",
  "Subject: You WON a games console!", "Congratulations! Claim it within 1 hour.", a big green
  "Claim my prize" button, a small drawing of a games console. No threat, no password box.
  → **Reveal:** the claim page it leads to: "big-prizes.example" in the address bar, "Pay $4.99
  postage to get your prize" and three empty boxes "Card number", "Expiry", "CVC". A tag: "Too good to
  be true".
- **Action:** Tap your answer: is it safe to tap "Claim my prize"?
- **Answers:** "Yes: it's giving, not asking for anything" · "No: it still rushes you to a link" ·
  "Yes: there's no password box"
- **Correct:** "No: it still rushes you to a link"
- **Right:** A prize you never entered is too good to be true, and it still rushes you to a link.
- **1st wrong:** Forget how nice it sounds. Which warning signs from Sam's first email are here too?
- **2nd wrong:** No: it rushes you (1 hour) to a link, for a prize you never entered. Real prizes never
  cost money to claim.

## 7 · Real life
- **Situation:** An email uses Sam's real name and school. "Sign in today," it says.
- **Picture:** a phone showing an email: "From: Your School <it@yourschool-accounts.example>",
  "Subject: Account deleted TODAY", "Hi Sam, your school account will be deleted today. Sign in here to
  keep it.", a blue "Sign in" button. Below, three tappable objects: the email's "Sign in" button; a
  reply arrow with "Is this real?"; a school building icon with "Open the school site yourself, or ask
  a teacher".
- **Action:** Tap what Sam should do.
- **Answers:** the Sign in button · reply "Is this real?" · the school building (open it yourself, or
  ask a teacher)
- **Correct:** the school building
- **Right:** A name is easy to find, so it proves nothing: go to the school site yourself.
- **1st wrong:** Does knowing Sam's name prove anything? And where would a reply or a tap really go?
- **2nd wrong:** Open the school site yourself, or ask a teacher. The link and the reply both go to
  whoever sent it, and it's still rushing you.

## 8 · Wrap
- **Takeaway:** Scam emails (people call them **phishing**) pretend to be someone you trust; warning
  signs give them away.
- **Try this:** On the next email you get, check the address after the @.
- **Next:** A text says your parcel is stuck. It isn't.
