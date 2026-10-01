# Course plan: What Really Happens When…

Status: **plan only** (owner, 2 Oct 2026). Nothing built.

- **id** `what-really-happens` · **level** Medium · **track** How Tech Works
- **Promise:** a moment you know (press play, hit send, tap your card), slowed down so you can see
  the tech underneath. Every lesson starts with the moment, then opens it up.
- **Style:** "learn before you do" (`docs/plans/learn-before-you-do.md`): quick learning cards
  (`reveal`, `true_false`, `fill_gap`) set up each hands-on card; 3–5 minutes of core cards per
  lesson; at least 60% hands-on by time; at least 3 interaction styles per lesson.
- **Rules that shape every card** (CLAUDE.md): one idea and one action per screen; prompts of one
  short sentence (5–15 seconds of thought); depth, not exam prep (no memorising numbers, protocol
  names or acronyms); teach before test; every card fits **360×560** before Check; hints and
  nudges on every graded lesson card; quizzes 5–8 core questions, nothing untaught.
- **Medium core, Hard bonus:** the core path is cause and effect ("bigger buffer → starts slower
  but survives the tunnel"). Deeper detail (UDP vs TCP, tick rate, adaptive bitrate, CDNs, tokens)
  lives in optional **bonus** cards, always explained through a hands-on card, never as terms to
  learn. Nothing later depends on a bonus card.
- **No brands in graded cards:** "a music app", "a video app", "a chat app", "a game", "your
  bank". Real products may appear only in hooks and videos, never in lessons.

## Module order (changed)

| # | Module | Access | Big idea | Why here |
|---|---|---|---|---|
| 1 | …you press play on a song | Free | Data arrives in pieces, and a **buffer** keeps you ahead | Gentlest: everyone streams; no maths |
| 2 | …you send a message | Pro | **Packets**, servers in the middle, and who can read it | Builds on "pieces": now pieces with addresses |
| 3 | …you scroll short videos | Pro | **Copies near you** and the app **guessing** what's next | Builds on servers: why some are close, and prediction |
| 4 | …you press shoot in an online game | Pro | **Speed limits**: delay, and how games hide it | Needs packets and servers first; the hardest ideas |
| 5 | …you tap to pay | Pro | **Trust in two seconds**: tokens and an approval chain | A satisfying finale that pulls the course together |
| — | Course final | Pro | All five moments | |

**Changes from the brief:**
- **Message moves to 2 and the game to 4.** The game module needs packets, servers and delay,
  which "send a message" teaches naturally. Played in the original order, module 2 would have to
  teach packets *and* lag at once.
- **"Scroll TikTok" becomes "…you scroll short videos"** (no brand in a module title, which shows
  in lessons). Hooks and videos can still say the real app name.

**Overlap with How the Internet Works (Hard):** both touch packets and servers. Here the moment
leads and stops at cause and effect. Each module's recap links to the Internet course for the
"how it really works" version.

## New card types and models

Kept small. Most of this course is existing cards plus new **simulator models** (pure functions,
no new player code).

1. **`packet_race` (new card type, the one big addition).** Two routes side by side, with packets
   as dots. The learner predicts ("Which video call keeps going?", "Which one arrives complete?"),
   presses Check, then watches the race (reduced motion shows the final frame). The data has two
   lanes with rules (`resend lost`, `skip lost`, `delay ms`, `loss %`), so the outcome is
   deterministic and seeded. It is graded on the prediction only. It teaches UDP vs TCP, packet
   loss and why late is worse than lost for games and calls, without naming either protocol in a
   graded prompt. Schema: `lanes[2] {label, rule, delayMs, lossPct}`, `question`, `options`,
   `correctOptionId`. It fits 360×560 as two thin horizontal lanes.
2. **Simulator models** (`src/cards/simulator/models/`, each with params, a unit test and the
   existing starts-unsolved and has-a-solution checks):
   - `stream-buffer`: inputs `networkSpeed` (slider), `bufferSeconds` (slider), `tunnel` (toggle).
     Outputs: seconds buffered (bar), "Playing" or "Stopped to load" (device), time to start
     (timer). Goal example: survive the tunnel without stopping.
   - `data-use`: input `quality` (slider: low, normal, high). Outputs: MB per hour, hours of music
     in 1 GB (meter).
   - `game-lag`: inputs `delay` (slider, ms), `updatesPerSecond` (slider). Outputs: how far behind
     the enemy you see (meter, in game units), hit or miss (device "your shot"), with a plain-words
     line. Bonus cards turn on `lagCompensation` (toggle: the server "rewinds" to check the hit).
   - `feed-preload`: inputs `videosAhead` (slider), `networkSpeed`. Outputs: wait when you swipe
     (timer), data used (meter).
3. **No new type for paying.** `drag_to_order` (the approval chain), `sort_bins` (what the shop
   sees vs what stays hidden) and `reveal` cover it.

## Module 1: …you press play on a song (free): card by card

Times use the pilot's per-type seconds (`SECONDS_BY_TYPE`).

### Lesson 1.1 "It's not on your phone" (icon `server`) · about 3.5 min
Goal: streaming means playing while the rest arrives, from a server far away.

| # | Type | Card | Why |
|---|---|---|---|
| 1 | true_false | "When you press play, the whole song downloads first." (False) | Do first: commit to a guess |
| 2 | reveal (term) | **Streaming**: the app plays the start while the rest is still arriving | Name it right after the guess |
| 3 | reveal (term) | **Server**: a computer that stores songs and sends them to millions of phones | Where it comes from |
| 4 | drag_to_order | Press play → app asks the server → first pieces arrive → music starts while more arrive | The whole moment, slowed down |
| 5 | sort_bins | "On your phone" vs "On the server": the app, a streamed song, a song you saved offline, the play button | Downloaded vs streamed |
| 6 | fill_gap | "A song saved for offline is stored on your ___." (phone / server / headphones) | Check the key distinction |
| 7 | multiple_choice | "No signal at all. Which song still plays?" (saved offline / most played / the one at the top) | Apply it to a real moment |
| 8 | explainer (recap) | 3 bullets | |
| B | true_false (bonus) | "The server sends the song in one big piece." (False: many small pieces, in order) | Sets up module 2 |

### Lesson 1.2 "The tunnel trick" (icon `gauge`) · about 4 min
Goal: a **buffer** stores the next few seconds, so short drops don't stop the music.

| # | Type | Card |
|---|---|---|
| 1 | multiple_choice | "Your train enters a tunnel and the signal's gone, but the music keeps going. Why?" (it saved the next bit / the song moved to your phone / music needs no signal) |
| 2 | reveal (term) | **Buffer**: the next few seconds the app keeps ready before you need them |
| 3 | simulator `stream-buffer` | "Get through the 10-second tunnel without the music stopping." (raise the buffer) |
| 4 | true_false | "A bigger buffer makes the song start faster." (False: it waits to fill first) |
| 5 | simulator `stream-buffer` | "Make the song start in under 2 seconds." (lower the buffer: the trade-off, felt) |
| 6 | fill_gap | "Slow network, long trip: choose a ___ buffer." (bigger / smaller / zero) |
| 7 | explainer (recap) | 3 bullets |
| B | simulator (bonus, **Hard**) | **Adaptive quality**: "Auto quality is on. Slow the network: what does the app change?" Explained: apps switch to a smaller version of the song so the buffer keeps up (the real name, adaptive bitrate, is given in the explanation, never tested) |

### Lesson 1.3 "Squeezing sound" (icon `audio-lines`) · about 3.5 min
Goal: songs are **compressed**: sounds you'd barely hear are left out, so less data travels.

| # | Type | Card |
|---|---|---|
| 1 | reveal (term) | **Sound as numbers**: a microphone measures the sound thousands of times a second |
| 2 | true_false | "Every one of those numbers is sent when you stream." (False) |
| 3 | reveal (term) | **Compression**: leave out what ears barely notice, so the file gets much smaller |
| 4 | sort_bins | "Kept" vs "Can go": the singer's voice, the drum beat, a very quiet sound under a loud one, sound too high for most people to hear |
| 5 | simulator `data-use` | "Pick the best quality that still fits 10 hours of music in 1 GB." |
| 6 | multiple_choice | "Why does the 'Low' setting save your data plan?" (smaller files / slower songs / fewer songs) |
| 7 | explainer (recap) | 3 bullets |
| B | multiple_choice (bonus, **Hard**) | "Why are 'lossless' files much bigger?" (nothing is left out / better speakers / longer songs) |

### Module 1 quiz · 6 questions
drag_to_order (a new order: offline vs streamed steps), simulator `stream-buffer` (a new goal),
true_false (buffer trade-off, reworded), sort_bins (phone vs server, new items), fill_gap
(compression), multiple_choice (a real moment: lift with no signal). No word-for-word copies.

## Modules 2–5: outlines

### Module 2: …you send a message (Pro)
- **2.1 "Chopped into packets."** A message travels as small **packets**, each with an address;
  they can take different routes and get put back in order. Cards: true_false (one piece?) →
  reveal (packet) → drag_to_order (type → packets → server → friend's phone) → `packet_race`
  core: "Which arrives complete?" (one lane resends lost packets) → fill_gap.
- **2.2 "The server in the middle."** Why your friend gets it when their phone was off (the server
  holds it), and what the ticks mean (sent, delivered, read). Cards: scenario (friend's phone off),
  sort_bins (what each tick means), match_pairs (tick → what it tells you).
- **2.3 "Who can read it?"** **End-to-end encryption**: only the two phones have the key; the
  server passes along scrambled text. Cards: reveal (lock and key), true_false ("The chat app's
  server can read an end-to-end message." False), sort_bins (can read / can't read: you, your
  friend, the server, someone on the café Wi-Fi). It links to Stay Safe Online for the "never share
  codes" side.
- **Bonus (Hard):** `packet_race` "resend or skip" explained; why group chats send a copy for each
  member.
- **Teaser card:** 2.1's drag_to_order (type → packets → server → phone), which sets itself up.

### Module 3: …you scroll short videos (Pro)
- **3.1 "The next video is already here."** **Preloading**: the app quietly downloads the next few
  videos while you watch. Cards: true_false ("The next video starts downloading when you swipe."
  False) → simulator `feed-preload` (no wait when you swipe, without wasting data) → fill_gap.
- **3.2 "A copy near you."** Popular videos are copied to servers close to you, so they travel a
  short way (the real name, **CDN**, appears in a bonus card only). Cards: reveal, map-style
  multiple choice ("Which copy reaches you fastest?"), sort_bins (copied everywhere / stays in one
  place: a viral video, a video with 12 views).
- **3.3 "How the app guesses."** **Recommendations** learn from what you do: watch time, rewatches,
  skips, likes. It isn't mind-reading, and you can steer it. Cards: sort_bins (signals the app
  notices / doesn't), scenario (your feed fills with one topic: what changes it?), true_false.
  There's a gentle "you're in control" line (autoplay, screen-time settings), never scary, and it
  links to AI course module 2 (models learn from examples).
- **Bonus (Hard):** CDN explained with the simulator; why the first swipe after opening the app can
  be slower.
- **Teaser card:** 3.1's true_false.

### Module 4: …you press shoot in an online game (Pro)
- **4.1 "Delay you can feel."** **Latency**: messages take time to travel; distance and busy
  networks add more. Cards: reveal (ping as a round trip) → simulator `game-lag` (raise the delay:
  where do you see the enemy?) → true_false ("Faster internet speed always means less delay."
  False: speed and delay are different) → multiple_choice (why a nearby server feels better).
- **4.2 "The server decides."** The game's server keeps the real state, and every phone shows a
  slightly old picture. Cards: drag_to_order (press shoot → message to server → server checks →
  everyone updates), scenario (you hit on your screen but the server says miss: why?), fill_gap.
- **4.3 "Late is worse than lost."** Games skip lost updates instead of waiting for them. Cards:
  `packet_race` core ("Which game feels smoother?" One lane waits for every lost update, the other
  skips them), sort_bins (resend it / skip it: a chat message, a player's position, a file
  download, a video call frame).
- **Bonus (Hard):** **tick rate** with `game-lag`'s updates slider; **UDP vs TCP** named and
  explained via the race; **lag compensation** (the server rewinds time to check your shot).
- **Teaser card:** 4.1's simulator ("Raise the delay until you miss.").

### Module 5: …you tap to pay (Pro)
- **5.1 "A short-range whisper."** The phone or card talks to the reader by radio over a few
  centimetres (NFC, named in a bonus card only). Cards: true_false ("Your card works from across
  the room." False) → reveal → multiple_choice (why the range is so short).
- **5.2 "Not your real number."** The phone sends a **token** (a stand-in number) plus a one-time
  code, so the shop never gets your real card number. Cards: reveal (token), sort_bins (what the
  shop gets / what stays hidden), true_false (a stolen one-time code can't be reused).
- **5.3 "Approved in two seconds."** The chain: reader → payment network → your bank checks money
  and fraud → yes or no back. Cards: drag_to_order (the chain), scenario (the bank spots something
  odd: what happens?), fill_gap.
- **Bonus (Hard):** why a one-time code beats a reused one; what the bank's fraud check looks for
  (explained, not listed).
- **Safety:** defence only, and "never share card numbers or codes" links to Stay Safe Online.
  No real card numbers (made-up, obviously fake examples only).
- **Teaser card:** 5.2's sort_bins.

### Course final · 8 questions
Two from module 1, then one or two from each later module, mixing types (one packet_race, one
simulator, one drag, one sort, the rest quick cards). Nothing from bonus cards. The certificate is
available (Pro).

## Video hooks (3–5 per module)

**1. Press play**
- "Your song isn't on your phone. So where is it?"
- "Why your music keeps playing in a tunnel (for a while)."
- "The 'Low quality' setting is secretly brilliant."
- "What 'buffering' actually means."

**2. Send a message**
- "Your message gets chopped up and rebuilt. Every time."
- "How a message reaches a phone that was switched off."
- "What the second tick really means."
- "Even the chat app can't read this. Here's how."

**3. Scroll short videos**
- "The next video is already on your phone before you swipe."
- "Why a viral video loads faster than one with 12 views."
- "Your feed isn't reading your mind. It's counting."
- "Three ways to steer your feed."

**4. Press shoot**
- "You hit them on your screen. The server said no. Here's why."
- "Fast internet doesn't fix lag. This does."
- "Why games would rather lose a message than wait for it."
- "The server rewinds time to check your shot."

**5. Tap to pay**
- "Your phone never gives the shop your card number."
- "Everything that happens in the two seconds after you tap."
- "Why tap-to-pay only works a few centimetres away."
- "A code that's useless the moment it's used."

## Open questions for the owner

1. Order: message before game (my recommendation, so packets and delay are taught first)?
2. `packet_race` as one new card type, and the four simulator models: OK to build?
3. Module 3 title: "…you scroll short videos" (no brand in lessons)?
4. Free module: only module 1, or also 5 (paying safely sits close to Stay Safe Online)?
