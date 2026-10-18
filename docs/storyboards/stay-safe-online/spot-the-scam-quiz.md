# Spot the Scam: Module Quiz (`spot-the-scam-quiz`)

- **Module:** 2 · Spot the Scam · Pro
- **Questions:** 7 core, one try each, no hints; the explanation shows on the results screen. Pass at 70%.
- **Covers:** Scam Emails (1, 2), Scam Texts (3, 4), Scam Calls (5), Fake Websites (6, 7). Each tests
  only what those storyboards teach, in a new situation (no copies of lesson cards).
- **From today's quiz:** keeps `q-email-labels` (labels renamed to the module's sign names),
  `q-parcel-text`, `q-bank-call`, `q-padlock-pin` and `q-addresses`. New: `q-prize-fee` and
  `q-new-number`. Dropped: `q-phish-or-fine` (it used the word "phishing" and an item, "Send us your
  sign-in code", already covered by `q-bank-call`) and `q-gift-cards` (replaced by `q-prize-fee`, which
  tests the same "too good to be true" idea with a picture).
- **Needs building:** nothing new (the label question uses the existing `email` scene).

## 1 · `q-email-labels`
- **Situation:** Alex forwards a "Your Bank" email. Label three of its warning signs.
- **Picture:** the `email` scene with numbered spots on its lines; above it, a tray of three label chips:
  "Fake sender", "Rushing you", "Fake link".
- **Action:** Drag each label onto its line.
- **Answers:** the three labels, placed on the numbered spots
- **Correct:** "Fake sender" on From, "Rushing you" on the subject, "Fake link" on the button
- **Explanation:** The address after the @ isn't yourbank.example, the subject rushes you, and the button
  goes to yourbank-verify.example.

## 2 · `q-prize-fee`
- **Situation:** An email says you won headphones. Just pay $5 postage within 2 hours.
- **Picture:** an email in the mail-app style: "From: Prize Desk <win@headphone-prizes.example>",
  "Subject: You WON wireless headphones!", "Pay $5 postage within 2 hours to claim.", a green "Pay and
  claim" button, a drawing of headphones.
- **Action:** Tap what you do.
- **Answers:** "Pay it: $5 is cheap for headphones" · "Reply to check it's real" · "Delete it: it's too
  good to be true"
- **Correct:** "Delete it: it's too good to be true"
- **Explanation:** A prize you never entered that costs money to claim is too good to be true, and a reply
  goes straight to the scammer.

## 3 · `q-parcel-text`
- **Situation:** You're expecting a parcel. A text says pay $2.50 within 1 hour.
- **Picture:** a text thread headed "Parcels": "Missed delivery. Pay $2.50 within 1 hour:
  parcels-fee.example". Below, three tappable objects: a card "Pay it"; a reply bubble "Which parcel?";
  a Parcels app icon "Check in the Parcels app".
- **Action:** Tap what you do.
- **Answers:** pay it · reply "Which parcel?" · check in the Parcels app
- **Correct:** check in the Parcels app
- **Explanation:** A fee, a rush and a strange link are warning signs, even when you're expecting a parcel:
  check in the company's own app.

## 4 · `q-new-number`
- **Situation:** A new number texts: "It's Dad, phone broke. Send $60 now?"
- **Picture:** a thread headed "Unknown number · Not in your contacts" with that one bubble. Below,
  three tappable objects: a money icon "Send it"; a reply bubble "Is it really you?"; a contact card
  "Dad (saved)" with a phone icon "Call Dad's saved number".
- **Action:** Tap what you do.
- **Answers:** send it · reply "Is it really you?" · call Dad's saved number
- **Correct:** call Dad's saved number
- **Explanation:** It asks for money and rushes you; the saved number reaches the real Dad, while a reply
  goes to the new number.

## 5 · `q-bank-call`
- **Situation:** "Your Bank's fraud team" calls and asks for the code just texted to you.
- **Picture:** an incoming call screen, "Unknown number · 1:05", one caller bubble: "Read me the code we
  just sent, to stop the payment." Below, three tappable objects: a code bubble "Read out the code"; a
  name tag "Ask them to say your name first"; the red End call button with the back of a bank card
  "Hang up, call the number on your card".
- **Action:** Tap what you do.
- **Answers:** read out the code · ask them to say your name · hang up and call the number on your card
- **Correct:** hang up and call the number on your card
- **Explanation:** A code lets them sign in as you, and knowing your name proves nothing: hang up and call
  a number you already have.

## 6 · `q-padlock-pin`
- **Situation:** A page with a padlock asks for your card PIN.
- **Picture:** a browser page: padlock and address "https://cardcheck.example/verify", a "Your Bank" logo,
  and a single box "Card PIN" with a "Confirm" button. Below, three tappable answers.
- **Action:** Tap what you do.
- **Answers:** "Type it: there's a padlock" · "Check the logo, then type it" · "Close it: banks never ask
  for a PIN on a web page"
- **Correct:** "Close it: banks never ask for a PIN on a web page"
- **Explanation:** A padlock only means scrambled on the way, a logo can be copied, and a real bank never
  asks for your PIN on a web page.

## 7 · `q-addresses`
- **Situation:** Your Bank's real address is yourbank.example. Which of these are really Your Bank's?
- **Picture:** four browser address bars as draggable chips, above two bins, a Your Bank building "Your
  Bank" and a crossed-out building "Not Your Bank":
  `cards.yourbank.example`, `yourbank.example/help`, `yourbank.example.sign-in.example`,
  `yourbank-login.example`.
- **Action:** Drag (or tap) each address into a bin, then Check.
- **Answers:** the four addresses
- **Correct:** Your Bank: `cards.yourbank.example`, `yourbank.example/help`. Not Your Bank:
  `yourbank.example.sign-in.example`, `yourbank-login.example`.
- **Explanation:** Only the name just before the very last ending counts, and it must be exactly yourbank.
