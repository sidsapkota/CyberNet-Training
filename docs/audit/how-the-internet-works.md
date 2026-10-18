# How the Internet Works: Lesson Blueprint v1.1 audit

Audited in the worktree a local copy (HEAD `2542014`), against CLAUDE.md's Lesson Blueprint v1.1, the Zero-confusion rule and the Content style guide. Stay Safe Online module 1 is the reference. (CLAUDE.md has no "lesson pattern (HARD RULE" or "Make it feel like a game" sections now: Blueprint v1.1 replaced them, including the 12-word prompt rule, which is now "situation under 15 words". I checked both limits.)

## Summary

None of the 17 lessons or 6 quizzes are built to the blueprint: no file has `"blueprint"`, a `hook` card or a `predict: true` card. No recap has a "Try this", and only 4 recaps have a "Next:" line. The course has **one picture** in total: `switches.svg` in 1.1. Every multiple-choice question is text only. The only other visuals are 7 `packet_path` cards, 9 terminals, the bit switches and one borrowed `fake-website` hotspot.

Five lessons open with a 42–53-word explainer. About 85% of lesson prompts are over 12 words (up to 36), and most explanations run 27–39 words. Five lessons have 9 cards (the limit is 8), and four lessons pack 2–3 ideas each.

What's good:
- Accuracy is strong.
- Every graded lesson card has a hint and nudges (the old rule). None has a `showAnswer`, which v1.1 requires.
- Every choice question has 3–4 options, with no 2-option questions and almost no joke options.
- Addresses all come from the documentation ranges.

The biggest business problem: the only free module is **Binary and Data**. A TikTok viewer who came for "how the internet works" gets binary arithmetic as the guest lesson (1.1 `make-5`), and everything about the internet itself (IP, packets, DNS, the web) is Pro.

"Hard" rules: concepts are mostly taught before they're tested. But the course leans on memorising acronyms and numbers: DNS record types, SYN/SYN-ACK/ACK, ports 80 and 443, SMTP/IMAP, and status-code digits. The style guide bans exactly that.

Average blueprint score: lessons 4.3/10, quizzes 6.8/10.

**Access:** M1 Binary and Data is **free**. M2 IP Addresses, M3 Packets and Routing, M4 DNS, M5 Ports and Protocols and M6 The Web are all **Pro**. Only `bits-and-binary` is a guest lesson: no module sets `openToGuests`.

**Key:** P = pass, ½ = partial, F = fail, R = scroll risk at 360×560.

**Criteria:** Idea = one idea · 6–8 = card count · Beats = the 8 beats in order · Pred = an unscored Predict card · 4-part = situation + picture + one action · 3+ = 3+ plausible options · Leak = no answer leaks · Fb = hint/nudge/showAnswer · Words = prompts ≤12 words, explanations ≤26 words / 2 sentences · Fit = 360×560 · Px = text ≥14px · Hard = Hard-level rules.

**Score** = (P = 1, ½ = 0.5, F = 0) × 10 / 12. Quizzes are scored on 8 criteria: Beats, Pred, Idea and Fb are n/a, since quizzes have no hints by design, and the count is 5–8.

**Applies to every lesson** (not repeated in the tables):
- **Beats F:** no hook, play, predict or Try this.
- **Pred F:** no `predict: true`.
- **Fb ½:** hint + nudges are present, but there's no `showAnswer`.
- **Px P:** the only SVG is `switches.svg`. Its 31–32px text in a 640-wide viewBox renders at about 16px at 360px. The `fake-website` scene is self-labelled at 15+ units.

---

## Module 1: Binary and Data (free)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bits-and-binary (guest lesson) | 8 (6 core) | ½ | P | F | F | ½ | P | P | ½ | F | ½ R | P | P | **6** |
| bytes-file-sizes-and-hex | 9 (7) | F | F | F | F | F | ½ | P | ½ | F | ½ R | P | ½ | **3** |
| binary-and-data-quiz | 7 | n/a | P | n/a | n/a | F | P | ½ | n/a | P | P | P | P | **8** |

**bits-and-binary**
- **Idea:** binary place values, plus the byte's 255 maximum (`largest-byte`).
- **Beats:** opens on `make-5` (25-word prompt), with no real-life hook. The `recap` has no Try this or Next.
- **4-part:** the toggles are visual, but `ten-bit-octet` is text only and nothing has a situation line.
- **Words:** 4 of 6 prompts are over 12 words (`largest-byte` 36, `make-5` 25).
- **Fit:** `largest-byte` is 36 words plus an input. `switches-and-bits` is 44 words plus a picture.

**bytes-file-sizes-and-hex**
- **Idea:** three ideas in one lesson: units, Windows' 1,024 (`shrinking-drive`) and hex (`meet-hex`, `hex-2a`).
- **Cards:** 9 is over the limit.
- **4-part:** no visual at all.
- **3+:** `why-ff-biggest` has a weak option ("Computers can't store any letter after F").
- **Words:** 5 of 7 prompts are long (`order-sizes` 30, `hex-2a` 28).
- **Fit:** `order-sizes` is 30 words plus 5 items. `meet-hex` is 49 words.
- **Hard:** the 1,024 rule and the hex letters are recall.

**binary-and-data-quiz**
- **4-part:** `read-17`, `why-255` and `why-hex` are text only, with no situation.
- **Leak:** in `why-hex`, the right option is the longest.
- Otherwise a clean quiz.

---

## Module 2: IP Addresses (Pro; teaser `ipv4-bits`)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| what-is-an-ip-address | 9 (7) | ½ | F | F | F | ½ | P | ½ | ½ | F | ½ | P | ½ | **4** |
| public-and-private-addresses | 9 (7) | ½ | F | F | F | ½ | P | ½ | ½ | F | ½ R | P | ½ | **4** |
| meet-ipv6 | 8 (7) | ½ | P | F | F | F | P | P | ½ | F | ½ | P | P | **5** |
| ip-addresses-quiz | 7 | n/a | P | n/a | n/a | ½ | P | ½ | n/a | F | ½ R | P | P | **7** |

**what-is-an-ip-address**
- **Idea:** five ideas: IP addresses, octets, binary (`make-192`, `octets-in-binary`), the terminal and the shortage.
- **Cards:** 9 is over the limit.
- **Beats:** `ip-purpose` (the post-office question) is a good real-life seed, but it's a text question, not a hook.
- **Pred:** `enough-for-everyone` would make a natural Predict card.
- **Leak:** the `enough-for-everyone` prompt hands over "4.3 billion vs 8 billion", which gives the answer away.
- **Words:** `ip-purpose` is 17 words and `enough-for-everyone` 19. The `read-ipconfig` explanation is 29 words.
- **Fit:** the 35-character binary string in `ipv4-bits` may wrap.
- **Hard:** "Internet Protocol" and "protocol" are both defined inside one explainer (`finding-one-device`).

**public-and-private-addresses**
- **Idea:** public/private addresses, plus NAT.
- **Cards:** 9 is over the limit.
- **Beats:** opens on `the-way-out` (a path card, close to a "play" beat).
- **Leak:** in `same-address-two-houses` and `why-unreachable` the right option is the longest.
- **Words:** 5 of 7 prompts are long, and 6 explanations are over 26 words (`why-unreachable` 34).
- **Fit:** `nat-steps` is 23 words plus 4 items. `what-server-sees` is 20 words plus 4 address options.
- **Hard:** `sort-private-public` tests the memorised private ranges (`10.`, `192.168.`, `172.16–31`).

**meet-ipv6**
- **Idea:** the shortage, the format and dual stack together.
- **Beats:** opens on the text question `why-ipv6` (23 words).
- **4-part:** no visual at all.
- **Fit:** `ipv6-format` is 41 words, with a 39-character address that wraps.

**ip-addresses-quiz**
- **4-part:** only `phone-to-server` (a path card) is visual.
- **Leak:** `sender-seen` has two options that both start "198.51.100.23, then…". That's fair, but long.
- **Words:** `sender-seen` is 22 words, and explanations run 27–29 words.
- **Fit:** `sender-seen` has a 22-word prompt plus 4 long options.

---

## Module 3: Packets and Routing (Pro; teaser `count-packets`)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| why-data-travels-in-packets | 8 (7) | ½ | P | F | F | F | P | F | ½ | F | ½ R | P | ½ | **4** |
| routers-and-hops | 8 (7) | ½ | P | ½ | F | ½ | P | P | ½ | F | F R | P | ½ | **5** |
| different-roads-same-destination | 8 (6) | P | P | F | F | ½ | ½ | F | ½ | F | F R | P | P | **5** |
| packets-and-routing-quiz | 7 | n/a | P | n/a | n/a | ½ | P | F | n/a | F | F R | P | P | **6** |

**why-data-travels-in-packets**
- **Idea:** packets, plus TCP resend, which is taught here as well as in module 5.
- **Beats (a bug):** the lesson opens on the explainer `whats-in-a-packet`, which starts "**So** the internet chops data…", as if it followed another card.
- **Pred:** `film-or-game` is shaped like a Predict card but is scored.
- **4-part:** no visual. `packet-parts` begs for a postcard picture.
- **Leak:** `whats-in-a-packet` says "packets that take turns" just before `film-or-game` asks exactly that. In `why-packets` the right option is the longest and the only one naming TCP.
- **Fit:** `film-or-game` is 26 words plus 4 options of about 50 characters.

**routers-and-hops**
- **Idea:** routers and hops, plus switches and servers (`device-jobs`), plus traceroute.
- **Beats:** opens on the path card `two-routes`, which works as a play beat.
- **Words:** 6 of 6 prompts are long (`stars` 32, `count-routers` 28). The `first-hop` explanation is 38 words.
- **Fit (fail):** `two-routes` is 4×3 with addresses, over the "2 rows with addresses" limit. `stars` is 32 words plus 4 long options. The traceroute lines are 71 characters wide.
- **Hard:** reading `* * *` in `stars` is tool trivia.

**different-roads-same-destination**
- **Beats:** opens on the 42-word explainer `no-promises`.
- **3+:** `video-call-glitch` has weak options: "Video packets are never lost" contradicts the prompt.
- **Leak:** the `rebuild-message` labels "#1 YOUR … #4 ARRIVING" *are* the answer. In `video-call-glitch` the right option is the longest.
- **Fit (fail):** `cut-cable` is 4×3 with addresses. `route-changed` has a 7-line intro plus 6 lines of output.

**packets-and-routing-quiz**
- **Leak (fail):** `reorder-packets` ("#1 THE … #4 SAFELY") is a near copy of `rebuild-message`, with the answer in its labels.
- **Words:** `resend-count` is 26 words, and explanations run 30–34 words.
- **Fit (fail):** `long-way-round` is 4×3 with addresses and 7 nodes.

---

## Module 4: DNS (Pro; teaser `first-lookup`)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| names-and-numbers | 8 (7) | F | P | F | F | ½ | P | F | ½ | F | ½ R | P | ½ | **4** |
| the-lookup-journey | 8 (7) | ½ | P | F | F | ½ | P | ½ | ½ | F | ½ R | P | ½ | **5** |
| dns-records-and-tools | 8 (7) | ½ | P | F | F | ½ | P | P | ½ | F | ½ R | P | F | **5** |
| dns-quiz | 7 | n/a | P | n/a | n/a | ½ | P | P | n/a | F | P | P | F | **7** |

**names-and-numbers**
- **Idea:** two lessons in one: DNS, and the anatomy and ownership of a domain name (`order-name-parts`, `who-controls`).
- **Beats:** opens on the text question `why-dns`.
- **4-part:** only `first-lookup` (a terminal) is visual.
- **Leak (fail):**
  - The `why-dns` prompt says "Routers deliver by IP, not by name", which is the answer.
  - The `order-name-parts` prompt names all 3 parts and says "most general first".
  - In `who-controls-co-uk` the right option is 32 characters; the others are 17–19.
- **Words:** `order-name-parts` is 35 words.
- **Fit:** `phone-book` is 47 words.
- **Hard:** `first-lookup` is just "type this".

**the-lookup-journey**
- **Idea:** the resolver chain, the cache and TTL together.
- **Beats:** opens on the 51-word numbered explainer `resolver-trip`.
- **Pred:** `when-new-address` (a bonus) is shaped like a Predict card.
- **Leak:** `lookup-steps` is a straight recall of the list in the card before it.
- **Words:** `ttl-minutes` is 31 words and `when-new-address` 28.
- **Fit:** the 51-word explainer, and `lookup-steps` with 6 items.
- **Hard:** the root/TLD/authoritative names, and TTL arithmetic.

**dns-records-and-tools**
- **Idea:** records, plus lookalike domains (the bonus `lookalikes`).
- **Beats:** opens on the 53-word list explainer `many-answers`.
- **4-part:** only `dig-cname` (a terminal) is visual.
- **Fit:** the 53-word `many-answers` list.
- **Hard (fail):** the whole lesson is memorising record types A, AAAA, CNAME and MX (`match-records`, `record-for-email`). The style guide bans "record types" by name.

**dns-quiz**
- **4-part:** 1 terminal and 5 text questions.
- **Words:** 5 of 7 prompts are long (`ttl-move-in-time` 25 words).
- **Hard (fail):** `web-and-email` and `after-cname` test recall of record types.

---

## Module 5: Ports and Protocols (Pro; teaser `pick-the-program`)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ports | 8 (7) | ½ | P | F | F | ½ | P | ½ | ½ | F | F R | P | F | **4** |
| tcp-and-udp | 8 (7) | ½ | P | F | F | F | P | ½ | ½ | F | ½ R | P | F | **4** |
| protocols-as-shared-rules | 7 (6) | F | P | F | F | F | P | ½ | ½ | F | F R | P | F | **3** |
| ports-and-protocols-quiz | 7 | n/a | P | n/a | n/a | F | P | ½ | n/a | F | F R | P | F | **4** |

**ports**
- **Idea:** ports, plus NAT tables (`nat-port-steps`, `nat-table-lookup`).
- **Beats:** the recap has "Next:" but no Try this.
- **4-part:** only `netstat` (a terminal) is visual.
- **Leak:** `colon-443` is answered word for word by `meet-ports` just before it, and its right option is the longest.
- **Words:** 5 of 6 prompts are long (`nat-table-lookup` 30 words).
- **Fit (fail):** `nat-table-lookup` is 30 words plus a 2-line table plus an input. `nat-port-steps` is 27 words plus 4 items. The `netstat` output is 66 characters wide.
- **Hard (fail):** port numbers 80 and 443 are taught and tested (`meet-ports`, `colon-443`, recap).

**tcp-and-udp**
- **Idea:** TCP vs UDP, plus the handshake.
- **Beats:** opens on `parcel-or-postcard`, whose 28-word prompt *is* the lesson.
- **Pred:** `frozen-call` is shaped like a Predict card but is scored.
- **4-part:** no visual at all.
- **Leak:** `udp-true` comes straight after an explainer that lists the same facts. In `frozen-call` the right option is the longest.
- **Words:** explanations run 36–39 words (`which-and-why`, `lost-syn-ack`).
- **Fit:** `tcp-vs-udp` is 50 words. `parcel-or-postcard` is 28 words plus 5 items.
- **Hard (fail):** SYN/SYN-ACK/ACK, plus the full names "Transmission Control Protocol" and "User Datagram Protocol".

**protocols-as-shared-rules**
- **Idea (fail):** three ideas: protocols, layering and email protocols.
- **Beats:** opens on `order-layers` (33 words) before the "what is a protocol" explainer. The recap ends on "Take the quiz to unlock…".
- **4-part:** no visual. Layering begs for a nested-envelope picture.
- **Leak:** in `between-servers` the right option is the longest.
- **Words:** 5 of 5 prompts are long.
- **Fit (fail):** `order-layers` is 33 words plus 4 items. `email-journey` is 21 words plus 5 items.
- **Hard (fail):** `order-layers` uses HTTP (not taught until 6.1) and Ethernet (never taught). SMTP and IMAP are acronym recall.

**ports-and-protocols-quiz**
- **4-part:** all text.
- **Leak:** in `nat-table` the right option is the longest. `handshake-order` is close to the lesson's `order-handshake`.
- **Words:** 6 of 7 prompts are long.
- **Fit (fail):** `reply-port` has a code block plus 4 options.
- **Hard (fail):** SYN order, IMAP/SMTP.

---

## Module 6: The Web (Pro; teaser `curl-headers`)

| Lesson | Cards | Idea | 6–8 | Beats | Pred | 4-part | 3+ | Leak | Fb | Words | Fit | Px | Hard | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| http-requests-and-responses | 8 (7) | F | P | F | F | ½ | P | ½ | ½ | F | ½ R | P | ½ | **5** |
| https-and-the-padlock | 9 (7) | ½ | F | F | F | ½ | P | F | ½ | F | F R | P | ½ | **3** |
| what-happens-when-you-type-a-url | 9 (7) | ½ | F | F | F | ½ | P | ½ | ½ | F | F R | P | ½ | **4** |
| the-web-quiz (course final) | 8 | n/a | P | n/a | n/a | ½ | ½ | ½ | n/a | ½ | P | P | ½ | **7** |

**http-requests-and-responses**
- **Idea (fail):** four ideas: request/response, GET/POST, status codes, and headers/redirects.
- **Beats:** opens on `requests-per-page`, whose prompt gives the rule.
- **4-part:** only `curl-headers` (a terminal) is visual.
- **Leak:** `whose-problem` states the first-digit rule, then sorts 4 codes.
- **Words:** `curl-headers` is 26 words plus a command flag.
- **Fit:** `curl-headers` has a 26-word prompt plus the terminal.
- **Hard:** status-code digits are number recall.

**https-and-the-padlock**
- **Idea:** TLS, the meaning of the padlock and certificate warnings together.
- **Cards:** 9 is over the limit.
- **Beats:** opens on the 46-word explainer `plain-vs-https`.
- **Pred:** `who-can-read` is shaped like a Predict card but is scored.
- **4-part:** the `padlock-promise` hotspot (`fake-website` scene) is the course's only real-life picture. The rest is text.
- **Leak (fail):** the `padlock-promise` prompt says "the server owns the **name in the address**" and then asks you to tap what the padlock vouches for. In `who-can-read`, `lookalike-padlock` and `cafe-can-see` the right option is the longest.
- **Words:** 7 of 7 prompts are long.
- **Fit (fail):** `who-can-read` (30 words) and `cafe-can-see` (29 words) each have 4 options. `padlock-promise` is 26 words plus the scene.
- **Hard:** TLS, CA, and port 443.
- **Strength:** "encrypted, not honest" is the best real-life message in the course.

**what-happens-when-you-type-a-url**
- **Idea:** a capstone, so several ideas by design.
- **Cards:** 9 is over the limit.
- **Beats:** opens on the match card `url-parts-jobs`. The recap has no Try this.
- **4-part:** 2 terminals and 2 path cards are visual.
- **Leak:** `page-rebuilt` lays out the order just before `whole-journey` asks for it.
- **Words:** 6 explanations are over 30 words.
- **Fit (fail):** `step-route` is 4×3 with addresses. `step-curl` prints 23 lines. `route-the-reply` has 7 nodes.
- **Hard:** `url-parts-jobs` needs "port 443" from memory.

**the-web-quiz (course final)**
- **3+:** `which-door` has weak options ("games need the server's fastest door", "email must always be encrypted").
- **Leak:** in `lost-packet` and `padlock-final` the right option is the longest. `lost-packet` is close to 3.1's `lost-packet`.
- **Words:** 6 of 8 prompts are long.
- **Hard:** `first-digit-final` tests status-code classes.

---

## Facts and bugs

1. **Inconsistent `netstat`.** In 5.1 `netstat`, the second connection is `203.0.113.80:80`. In the module quiz, `reply-port` shows the same `51547` connection as `203.0.113.80:443` and says "Both servers use 443". Pick one.
2. **Confusing aside in 3.1 `count-packets`.** The prompt says each packet carries 1,500 bytes *of data*. The explanation then adds "the label uses a little of each packet's space, so it would need one more", which contradicts the prompt. Drop the aside, or say "if 1,500 included the label".
3. **Orphaned "So".** 3.1 `whats-in-a-packet` is the first card but begins "So the internet chops…". The concept-tag order probably moved it ahead of `film-or-game`.
4. **Explanation doesn't match the items.** 5.2 `parcel-or-postcard` mentions "photos", "saved files" and "voice chat", which aren't among the items.
5. **Documentation addresses labelled public (low).** 2.2 `sort-private-public` and the quiz's `kinds-of-address` label `192.0.2.x` and `203.0.113.x` as public. They're reserved documentation ranges, not public. Repo convention allows them as stand-ins, and the bin is hedged ("could it be public"), so this is acceptable.
6. **"Habit" (minor).** In 5.3 `port-8080`, "Port 80 is a habit" would read better as "a convention" or "an agreement" (which is the explanation's own word).
7. **Shortened terminal output (acceptable).** The 6.3 `step-curl` TLS 1.3 transcript skips Encrypted Extensions and CertificateVerify. The card says it's shortened. The 2.1 `ipconfig` output omits the IPv6 lines. Both are acceptable simplifications.
8. **Checked and accurate:** 4.3 billion IPv4 addresses, 500 GB showing as about 465 GiB, DNS over UDP falling back to TCP, asymmetric return routes, SYN-ACK loss handling, HTTPS still showing the site (IP/SNI), and GET vs POST.

---

## The 10 biggest weaknesses (worst first, by drop-off risk for a new 13+ learner arriving from a TikTok video)

1. **The guest lesson is binary maths, not the internet** (`bits-and-binary` → `make-5`). The first screen is a 25-word prompt about switches. There's no hook and nothing about messages crossing the world.
   *Fix:* rebuild 1.1 to the blueprint, around a real message: a hook ("Your 'hi' to a friend becomes switches"), a switch toy to play with, then a predict card.
2. **Nothing about the internet is free.** M1 Binary and Data is the only free module. IP, packets, DNS and the web are all Pro, so a learner never sees what the course promises before the paywall.
   *Fix:* make one "journey of a message" lesson free and open to guests (e.g. move or rebuild `why-data-travels-in-packets` into M1), or put the course's first module on packets.
3. **No pictures.** There's 1 image in 17 lessons (`switches.svg`), and 0 of about 50 multiple-choice questions have a picture. That fails the 4-part card and "Show, don't describe".
   *Fix:* one recurring scene per lesson (Mia's message as a numbered postcard, the home router as a doorway, the padlock bar), with answers placed on the picture.
4. **No Hook, Predict or Try this anywhere** (0/17 lessons).
   *Fix:* make `film-or-game`, `frozen-call`, `who-can-read`, `when-new-address` and `video-call-glitch` into `predict: true` cards with "Not sure", add hook cards, and end each lesson with a Try this ("Run `ipconfig`", "Check the padlock's name").
5. **Five lessons open with a wall of text:** `whats-in-a-packet` (44 words, which also leaks `film-or-game`'s answer), `no-promises` (42), `resolver-trip` (51), `many-answers` (53) and `plain-vs-https` (46).
   *Fix:* put a hands-on card first, and cut each explainer to 1–2 sentences on a labelled picture.
6. **Acronym and number memorisation in a "beginner-friendly Hard" course:**
   - DNS record types: `many-answers`, `match-records`, quiz `web-and-email` and `after-cname`
   - SYN/SYN-ACK/ACK: `order-handshake`, quiz `handshake-order`
   - ports 80 and 443: `meet-ports`, `colon-443`, `url-parts-jobs`
   - SMTP/IMAP: quiz `protocol-jobs`
   - status-code digits: `first-digit-final`

   *Fix:* test the job ("the record that says where email goes", "Can we talk?") and keep the acronyms as glossary words, never as the answer.
7. **Prompts and feedback are paragraphs.** About 85% of lesson prompts are over 12 words: `largest-byte` 36, `order-name-parts` 35, `order-layers` 33, `stars` 32, `ttl-minutes` and `which-is-missing` 31. Explanations run 27–39 words.
   *Fix:* a situation line under 15 words; move the rule into the picture or the card before; one-line feedback plus a `showAnswer`.
8. **Fit risks at 360×560:**
   - 3-row packet paths with addresses: `two-routes`, `cut-cable`, `step-route` and quiz `long-way-round`
   - `route-changed` (7-line intro plus output)
   - `reply-port` (code block plus 4 options)
   - `nat-table-lookup` (30 words plus a table)
   - `step-curl` (23 lines)

   *Fix:* hide the addresses or drop a row, split the long cards, and cut terminal output to the lines that matter.
9. **Answer leaks and trivial cards:**
   - `rebuild-message` and quiz `reorder-packets` carry the answer in their "#1…#4" labels.
   - The `padlock-promise` and `why-dns` prompts state the answer.
   - `order-name-parts` gives the order away.
   - In about 15 multiple-choice questions the right option is the longest (e.g. `who-can-read`, `cafe-can-see`, `video-call-glitch`, and `who-controls-co-uk` at 32 characters against 17–19).

   *Fix:* reorder by something other than a visible number (e.g. by reading the sentence), move the rule out of the prompt, and make the options equal in length.
10. **Lessons pack 2–3 ideas and run long:** `bytes-file-sizes-and-hex`, `names-and-numbers`, `protocols-as-shared-rules` and `http-requests-and-responses` (multiple ideas); 9 cards in `bytes-file-sizes-and-hex`, `what-is-an-ip-address`, `public-and-private-addresses`, `https-and-the-padlock` and `what-happens-when-you-type-a-url`.
    *Fix:* split along the storyboard (e.g. "Hex" and "Domain names: who owns what" as their own lessons), 6–8 cards each.
