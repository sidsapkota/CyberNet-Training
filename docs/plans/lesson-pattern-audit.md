# Lesson pattern audit

Scored against the lesson pattern and the picture-first rules in CLAUDE.md. Heuristic (a human decides the final call); re-run `node scripts/lesson-pattern-audit.mjs` after rebuilds. Last run: 2026-10-04.

**Legend:** 🔴 rebuild · 🟡 needs work · 🟢 pass (already pattern-shaped).

**Totals:** 🔴 40 rebuild · 🟡 11 needs work · 🟢 1 pass.

Debt points: opens-by-telling +3 · each explainer over 2 +2 · each text-only question card +1 · each long prompt (>14 words) +1 · each paragraph-length feedback +1. (≥7 rebuild, 3–6 needs work, <3 pass.)

## Stay Safe Online

| | Lesson | Module | Debt | Why |
|---|---|---|---|---|
| 🔴 | Getting Help (`getting-help`) | when-things-go-wrong | 19 | 5 explainers (max 2); 7 text-only question card(s) (3 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Two-Step Sign-In (`two-step-sign-in`) | lock-your-accounts | 13 | 7 text-only question card(s) (1 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Deepfake Scams and Fakes (`deepfake-scams`) | when-things-go-wrong | 12 | 4 explainers (max 2); 6 text-only question card(s) (2 MC without a picture); 2 long prompt(s) (>14 words) |
| 🔴 | Apps and Public Wi-Fi (`apps-and-wi-fi`) | guard-your-privacy | 10 | 7 text-only question card(s) (2 MC without a picture); 3 long prompt(s) (>14 words) |
| 🔴 | Signs of a Hack (`signs-of-a-hack`) | when-things-go-wrong | 9 | 7 text-only question card(s) (1 MC without a picture); 2 long prompt(s) (>14 words) |
| 🔴 | Strong Passwords (`strong-passwords`) | lock-your-accounts | 7 | 6 text-only question card(s) (1 MC without a picture); 1 long prompt(s) (>14 words) |
| 🔴 | Fake Websites (`fake-websites`) | spot-the-scam | 7 | 5 text-only question card(s) (2 MC without a picture); 2 long prompt(s) (>14 words) |
| 🟡 | Phishing Emails (`phishing-emails`) | spot-the-scam | 6 | 4 text-only question card(s) (1 MC without a picture); 2 paragraph-length feedback |
| 🟡 | Scam Texts and Calls (`scam-texts-and-calls`) | spot-the-scam | 6 | 5 text-only question card(s) (1 MC without a picture); 1 long prompt(s) (>14 words) |
| 🟡 | Your Digital Footprint (`your-digital-footprint`) | guard-your-privacy | 6 | 5 text-only question card(s) (1 MC without a picture); 1 paragraph-length feedback |

## Inside Your Devices

| | Lesson | Module | Debt | Why |
|---|---|---|---|---|
| 🔴 | Meet the CPU (`meet-the-cpu`) | pull-it-apart | 12 | 3 text-only question card(s) (1 MC without a picture); 4 long prompt(s) (>14 words); 5 paragraph-length feedback |
| 🔴 | Power Problems (`power-problems`) | fix-it-yourself | 11 | 3 text-only question card(s) (1 MC without a picture); 5 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | Memory vs Storage (`memory-vs-storage`) | pull-it-apart | 8 | 5 text-only question card(s) (1 MC without a picture); 1 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Slow and Full (`slow-and-full`) | fix-it-yourself | 7 | 4 text-only question card(s); 3 long prompt(s) (>14 words) |
| 🟡 | What's in the Box (`whats-in-the-box`) | pull-it-apart | 6 | 2 text-only question card(s); 4 paragraph-length feedback |
| 🟡 | Meet the OS (`meet-the-os`) | software-in-charge | 6 | 3 text-only question card(s); 3 long prompt(s) (>14 words) |
| 🟡 | Files and Folders (`files-and-folders`) | software-in-charge | 6 | 4 text-only question card(s); 2 long prompt(s) (>14 words) |

## How AI Really Works

| | Lesson | Module | Debt | Why |
|---|---|---|---|---|
| 🔴 | How AI Makes Pictures (`how-ai-makes-pictures`) | ai-images-video-and-voices | 14 | opens by telling (first card is an explainer); 5 text-only question card(s) (3 MC without a picture); 6 long prompt(s) (>14 words) |
| 🔴 | Next-Word Machines (`next-word-machines`) | how-chatbots-think | 12 | 4 text-only question card(s) (2 MC without a picture); 6 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Cloned Voices and Faces (`cloned-voices-and-faces`) | ai-images-video-and-voices | 12 | 4 text-only question card(s) (2 MC without a picture); 6 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Spotting AI Fakes (`spotting-ai-fakes`) | using-ai-safely-and-fairly | 12 | opens by telling (first card is an explainer); 3 text-only question card(s) (2 MC without a picture); 6 long prompt(s) (>14 words) |
| 🔴 | Fair and Honest Use (`fair-and-honest-use`) | using-ai-safely-and-fairly | 12 | opens by telling (first card is an explainer); 5 text-only question card(s) (2 MC without a picture); 4 long prompt(s) (>14 words) |
| 🔴 | What Not to Share with AI (`what-not-to-share`) | using-ai-safely-and-fairly | 11 | 4 text-only question card(s) (2 MC without a picture); 6 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | Testing a Model (`testing-a-model`) | how-machines-learn | 10 | 4 text-only question card(s) (3 MC without a picture); 5 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | AI Tools Today (`ai-tools-today`) | talking-to-ai | 10 | 3 text-only question card(s); 5 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Who Made This? (`who-made-this`) | ai-images-video-and-voices | 10 | 5 text-only question card(s) (2 MC without a picture); 5 long prompt(s) (>14 words) |
| 🔴 | Made-Up Answers (`made-up-answers`) | how-chatbots-think | 9 | 4 text-only question card(s) (1 MC without a picture); 4 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | Writing Good Prompts (`writing-good-prompts`) | talking-to-ai | 9 | 4 text-only question card(s) (2 MC without a picture); 4 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | Checking AI's Work (`checking-ais-work`) | talking-to-ai | 9 | 5 text-only question card(s) (1 MC without a picture); 4 long prompt(s) (>14 words) |
| 🔴 | What AI Can't Do (`what-ai-cant-do`) | what-ai-actually-is | 7 | 4 text-only question card(s) (1 MC without a picture); 3 long prompt(s) (>14 words) |
| 🟡 | Temperature (`temperature`) | how-chatbots-think | 6 | 3 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words) |
| 🟡 | Patterns Everywhere (`patterns-everywhere`) | what-ai-actually-is | 5 | 3 text-only question card(s) (2 MC without a picture); 1 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🟡 | Training Data (`training-data`) | how-machines-learn | 5 | 2 text-only question card(s) (2 MC without a picture); 3 long prompt(s) (>14 words) |
| 🟡 | Bias In, Bias Out (`bias-in-bias-out`) | how-machines-learn | 5 | 4 text-only question card(s) (1 MC without a picture); 1 long prompt(s) (>14 words) |
| 🟢 | Spot the AI (`spot-the-ai`) | what-ai-actually-is | 1 | 1 long prompt(s) (>14 words) |

## How the Internet Works

| | Lesson | Module | Debt | Why |
|---|---|---|---|---|
| 🔴 | HTTPS and the Padlock (`https-and-the-padlock`) | the-web | 18 | opens by telling (first card is an explainer); 6 text-only question card(s) (3 MC without a picture); 6 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | Why Data Travels in Packets (`why-data-travels-in-packets`) | packets-and-routing | 15 | opens by telling (first card is an explainer); 6 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | The Lookup Journey (`the-lookup-journey`) | dns | 14 | opens by telling (first card is an explainer); 5 text-only question card(s) (2 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Bytes, File Sizes and Hex (`bytes-file-sizes-and-hex`) | binary-and-data | 13 | 7 text-only question card(s) (2 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Different Roads, Same Destination (`different-roads-same-destination`) | packets-and-routing | 13 | opens by telling (first card is an explainer); 4 text-only question card(s) (1 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Routers and Hops (`routers-and-hops`) | packets-and-routing | 12 | 3 text-only question card(s) (1 MC without a picture); 6 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | DNS Records and Tools (`dns-records-and-tools`) | dns | 12 | opens by telling (first card is an explainer); 5 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | TCP and UDP (`tcp-and-udp`) | ports-and-protocols | 12 | 5 text-only question card(s) (3 MC without a picture); 4 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | Public and Private Addresses (`public-and-private-addresses`) | ip-addresses | 11 | 5 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words); 3 paragraph-length feedback |
| 🔴 | Ports: Many Doors, One Address (`ports`) | ports-and-protocols | 11 | 5 text-only question card(s) (3 MC without a picture); 5 long prompt(s) (>14 words); 1 paragraph-length feedback |
| 🔴 | Protocols: Shared Rules (`protocols-as-shared-rules`) | ports-and-protocols | 10 | 4 text-only question card(s) (2 MC without a picture); 4 long prompt(s) (>14 words); 2 paragraph-length feedback |
| 🔴 | Running Out: Meet IPv6 (`meet-ipv6`) | ip-addresses | 9 | 6 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words) |
| 🔴 | What Happens When You Type a URL (`what-happens-when-you-type-a-url`) | the-web | 9 | 3 text-only question card(s); 2 long prompt(s) (>14 words); 4 paragraph-length feedback |
| 🔴 | Names and Numbers (`names-and-numbers`) | dns | 8 | 5 text-only question card(s) (3 MC without a picture); 3 long prompt(s) (>14 words) |
| 🔴 | HTTP Requests and Responses (`http-requests-and-responses`) | the-web | 8 | 3 text-only question card(s) (1 MC without a picture); 5 long prompt(s) (>14 words) |
| 🔴 | What Is an IP Address? (`what-is-an-ip-address`) | ip-addresses | 7 | 5 text-only question card(s) (3 MC without a picture); 2 long prompt(s) (>14 words) |
| 🟡 | Bits and Binary: How Computers Count (`bits-and-binary`) | binary-and-data | 6 | 3 text-only question card(s) (1 MC without a picture); 3 long prompt(s) (>14 words) |
