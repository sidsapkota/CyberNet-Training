# Content review: How the Internet Works, Modules 1–3

This file is for anyone checking the course content for accuracy. For each lesson it lists:
- the learning goals
- the key factual claims to verify
- every deliberate simplification

"Later module" means Module 4 (DNS), Module 5 (Ports and Protocols) or Module 6 (The Web), which
aren't written yet.

**Addresses and names used.** Only these appear in the content:
- IPv4 documentation ranges `192.0.2.0/24`, `198.51.100.0/24` and `203.0.113.0/24`, which stand in
  for public addresses
- private ranges `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`
- loopback (`127.0.0.1`, `::1`)
- the subnet mask `255.255.255.0`
- the IPv6 documentation prefix `2001:db8::/32`
- link-local `fe80::1`
- the documentation MAC address `00:00:5e:00:53:01`
- `example.com` and `example.org`

A test in `src/lib/content/load.test.ts` fails if any other IPv4 address appears. Deliberately
invalid examples are allowed, because they can't be anyone's address: `192.168.1.256`,
`172.16.300.1`, the three-part `192.0.2`, and the wrong IPv6 short forms beginning `21:db8::`, which
fall in IETF-reserved space.

**Recurring examples, kept consistent across lessons:**
- home network `192.168.1.0/24`, with the router at `192.168.1.1` and the laptop at `192.168.1.20`
  or `.42`
- home public address `203.0.113.7`
- web server / example.com at `198.51.100.10`
- ISP routers in `203.0.113.x`

---

## Module 1: Binary and Data

### 1.1 Bits and Binary: How Computers Count (`bits-and-binary`)
**Goals:**
- A bit is one on/off value (0 or 1).
- Read and build 8-bit binary numbers using place values.
- 8 bits make a byte with 256 patterns, from 0 to 255.
- Each IPv4 octet is 8 bits, so it can't exceed 255.

**Key claims:**
- 8-bit place values are 128, 64, 32, 16, 8, 4, 2, 1.
- 5 = `00000101`, 42 = `00101010`, 200 = `11001000`.
- 2⁸ = 256 patterns; the largest value is 255.
- 10 bits give 1,024 patterns, with a largest value of 1,023.
- An IPv4 address is four octets.

**Simplifications:**
- "Billions of tiny switches": transistors are described as switches.
- "An IPv4 address looks like four numbers separated by dots" describes dotted-decimal notation,
  which is how it's written, not how it's stored.

**Changed in this update (progress-safe):**
- Removed the `one-bit-values` multiple-choice card. The hook explainer already teaches that a bit
  has two values, and removing it made room for the recap within 12 cards.
- `largest-byte` is now `numeric_input` (answer 255), with the same card id.
- The distractor `8.8.8` became `192.0.2`, with the same option id.
- Added a closing `recap` explainer.

Learners who had completed `one-bit-values` keep that XP. The lesson's other ids are unchanged.

### 1.2 Bytes, File Sizes and Hex (`bytes-file-sizes-and-hex`)
**Goals:**
- Bytes measure data.
- KB/MB/GB/TB steps of 1,000.
- Why drives show less (1,000 vs 1,024).
- Read and write two-digit hex.
- One hex digit = 4 bits.

**Key claims:**
- "A" is stored as 65 = `01000001`.
- 5 bytes = 40 bits; 3 MB = 3,000 KB (3,072 is also accepted).
- 2¹⁰ = 1,024. KiB/MiB/GiB are the 1,024-based units.
- A 1 TB (10¹² byte) drive shows about 931 "GB" in Windows (10¹² ÷ 2³⁰ ≈ 931.3).
- A 500 GB drive shows about 465 "GB" (5×10¹¹ ÷ 2³⁰ ≈ 465.7).
- Hex `2A` = 42, `C8` = 200, `FF` = 255, `1F` = 31.

**Simplifications:**
- "One letter of plain text ≈ 1 byte" holds for ASCII/basic English. Other scripts and emoji
  take 2–4 bytes in UTF-8.
- Typical sizes are rough: a phone photo is "a few MB", an HD film "a few GB", and phone storage
  "tens to hundreds of GB".
- "Windows counts in 1,024s but writes GB" is true of File Explorer. macOS has used 1,000s since
  2009, and the lesson doesn't mention it.
- File-system overhead is described as "a little space", which is true but depends on the format.

## Module 2: IP Addresses

### 2.1 What Is an IP Address? (`what-is-an-ip-address`)
**Goals:**
- Why devices need addresses.
- IP stands for Internet Protocol, and what a protocol is.
- IPv4 = 32 bits in 4 octets.
- Read your IPv4 address with `ipconfig`.
- IPv4 has about 4.3 billion addresses.

**Key claims:**
- `192.0.2.44` = `11000000.00000000.00000010.00101100`; 172 = `10101100`.
- 2³² = 4,294,967,296.
- About 8 billion people; the address supply isn't enough for all devices.
- In `ipconfig`, "Default Gateway" is the router, and "Subnet Mask" isn't a device address.

**Simplifications:**
- "Every device on a network gets an IP address" is true of devices that talk IP, which is almost
  all of them today.
- The subnet mask is described only as "how big your home network is". Subnetting isn't taught.
- The `ipconfig` output is trimmed to the IPv4 lines. Real output on most PCs also shows link-local
  IPv6 lines.
- Reserved blocks are mentioned without naming them (multicast, `0/8`, `127/8`, and so on).
- DNS is only hinted at: names are "looked up" to find addresses, which is covered in a later module.

### 2.2 Public and Private Addresses (`public-and-private-addresses`)
**Goals:**
- Know the three private ranges.
- The difference between public and private addresses.
- NAT, taught with a receptionist analogy.
- What the server sees.
- Why a stranger can't directly reach a private address.

**Key claims:**
- The private ranges are `10.0.0.0–10.255.255.255`, `172.16.0.0–172.31.255.255` and
  `192.168.0.0–192.168.255.255` (RFC 1918).
- The `172.16–31` second octet has 16 values.
- A server sees the router's public address.
- NAT isn't a security feature; firewalls are.

**Simplifications:**
- "Your ISP usually gives your home one public address." Some ISPs use carrier-grade NAT, where
  many homes share one public address, and this isn't mentioned.
- "Internet routers don't deliver to private addresses." In practice, private ranges aren't
  announced on the public internet and are usually filtered.
- NAT is described without ports. The explainer says ports are how the router tells replies
  apart, and that learners will meet them in a later module.
- The "Internet" node on the packet map stands for many networks.

### 2.3 Running Out: Meet IPv6 (`meet-ipv6`)
**Goals:**
- Why IPv6 exists.
- 128 bits written as 8 groups of 4 hex digits.
- The two shortening rules.
- Devices run IPv4 and IPv6 side by side.

**Key claims:**
- The last big IPv4 blocks were handed out in the 2010s: IANA in 2011, and the regional
  registries between 2011 and 2020.
- 2¹²⁸ ≈ 3.4 × 10³⁸ ("about 340 trillion trillion trillion").
- 16 bits per group.
- Only leading zeros in a group can be dropped, and `::` can appear only once
  (`2001:db8::1::1` is ambiguous).
- 2¹²⁸ ÷ 2³² = 2⁹⁶ ≈ 7.9 × 10²⁸.
- `2001:db8::/32` is the documentation prefix.

**Simplifications:**
- The shortening rules are the RFC 4291 rules. The RFC 5952 "canonical" preferences (lowercase,
  and `::` for the longest run) aren't taught.
- `/64` is described as "the size of the network" without explaining prefixes.
- `::1` and `127.0.0.1` are described as how a computer "talks to itself". `fe80::1` is described
  as "only works on the local network".
- `ip -brief addr` output is realistic but minimal (Wi-Fi only).

**Outline change (approved):** the planned 3-item drag was replaced by a multiple-choice card,
"pick the correct short form", whose distractors are real mistakes.

## Module 3: Packets and Routing

### 3.1 Why Data Travels in Packets (`why-data-travels-in-packets`)
**Goals:**
- Why data is split into packets: sharing links, and resending only lost pieces.
- What information travels with each packet.
- Simple packet counts.

**Key claims:**
- On Ethernet and most Wi-Fi, a packet is typically up to about 1,500 bytes, and added
  information uses part of that.
- 6,000 ÷ 1,500 = 4, and 3,000,000 ÷ 1,500 = 2,000, when each packet carries exactly 1,500 bytes
  of data.
- Splitting data doesn't compress or hide it; encryption is a later topic.

**Simplifications (flagged for Module 5 to correct):**
- **Sequence numbers belong to TCP, not IP.** The lesson avoids saying "one header". Instead it
  lists "information added to each packet" (source address, destination address and sequence
  number). It says the addresses come from IP and the sequence number from "a partner set of
  rules" (named as TCP in 3.3). Module 5 should explain the IP header and the TCP header as
  separate layers, and that TCP numbers bytes rather than packets.
- **The 1,500 figure is the typical MTU (maximum packet size).** Packet-count questions state
  "if each packet carries exactly 1,500 bytes of data". Explanations say real packets carry a
  little less data, because headers use part of the space. With TCP over IPv4, about 1,460 bytes
  per packet, so 6,000 bytes needs 5 packets.
- **The lost-packet challenge says "packet 7 is sent again".** Real TCP retransmission depends on
  acknowledgements and selective acknowledgement (SACK). "Only the missing piece is resent" is the
  usual modern behaviour.

### 3.2 Routers and Hops (`routers-and-hops`)
**Goals:**
- A router's job, a routing table and the next hop.
- A hop.
- Router vs switch.
- Read traceroute, including `* * *`.
- How traceroute uses TTL (challenge).

**Key claims:**
- A router only decides the next hop.
- A home router combines a router, a switch and a Wi-Fi access point.
- Traceroute probes each hop three times by default and shows times in ms.
- `tracert` is the Windows name.
- The first hop is usually the home router, the same as `ipconfig`'s default gateway.
- `* * *` means no reply in time; later hops replying shows traffic still passed.
- Each router decrements TTL. At 0 it drops the packet and sends back an error (ICMP Time
  Exceeded).

**Simplifications:**
- The routing table is described as "for each group of addresses, which neighbour to send to next".
  Metrics and routing protocols aren't taught.
- Routers "pick the shortest or least busy" route. Real route choice depends on routing protocols
  and policy.
- ICMP is called "a message saying so" and isn't named.
- The traceroute output uses numeric names, except for the final hop.

### 3.3 Different Roads, Same Destination (`different-roads-same-destination`)
**Goals:**
- Routes can change.
- Packets can arrive out of order or go missing.
- TCP reorders packets and gets missing ones resent.
- Live apps often use UDP and skip lost data.
- Compare two traceroutes.

**Key claims:**
- IP is "best effort": no ordering or delivery guarantee.
- TCP adds sequence numbers, and the receiver acknowledges what arrived.
- A packet 4 gap means packet 4 is resent.
- Video calls favour fresh data over late data, and often use UDP.

**Simplifications:**
- "Most of the time a conversation's packets all follow the same road": route changes mid-flow
  are uncommon, but they happen. Reordering also has other causes (parallel links, load
  balancing), which aren't mentioned.
- "Interference on Wi-Fi might scramble it": damaged frames fail checks and are discarded or
  retried at the Wi-Fi layer first.
- Video calls are described as "usually skip lost packets". Real-time media (for example WebRTC)
  runs over UDP with some selective resending and error correction.
- **Challenge terminal redesign:** the card shows yesterday's traceroute in the terminal intro and
  runs today's once. The terminal card gives fixed output per command, so no card relies on
  running the same command twice.

## Quizzes

| Quiz | Questions | Covers |
|---|---|---|
| `binary-and-data-quiz` | 7 (was 5) | bits, building/reading binary, conversion steps, why 255, **new:** MB→KB, bits per hex digit |
| `ip-addresses-quiz` | 7 | what an IP address does, octet 168, private/public/IPv6/NAT, IPv6 length, route through the home router, what the server sees, IPv6 short form |
| `packets-and-routing-quiz` | 7 | packet information, packet count, route around an outage, what a hop is, which packet to resend, first hop in traceroute (with a `* * *` hop), reorder by sequence number |

Every quiz uses a pass mark of 70% (`passThreshold: 0.7`), so 5 of 7 questions must be right. The
quizzes cover only what the core cards teach.
