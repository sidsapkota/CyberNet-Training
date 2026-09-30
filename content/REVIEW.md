# Content review: How the Internet Works

This file is for anyone checking the course content for accuracy. For each lesson it lists:
- the learning goals
- the key factual claims to verify
- every deliberate simplification

**Inside Your Devices** is reviewed [at the end of this file](#content-review-inside-your-devices),
including its [Safety](#safety) list.

The course has 6 modules. [Later corrections](#later-corrections-of-earlier-simplifications), at
the end, lists every place a later module corrects or deepens an earlier simplification.

**Addresses and names used.** Only these appear in the content:
- IPv4 documentation ranges `192.0.2.0/24`, `198.51.100.0/24` and `203.0.113.0/24`, which stand in
  for public addresses
- private ranges `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16`
- loopback (`127.0.0.1`, `::1`)
- the subnet mask `255.255.255.0`
- the IPv6 documentation prefix `2001:db8::/32`
- link-local `fe80::1`
- the documentation MAC address `00:00:5e:00:53:01`
- `example.com` and `example.org`, including the subdomains `www`, `mail`, `backup`, `blog`, `shop`
  and `login`
- the fictional certificate authority "Example Certificate Authority" (`C=XX`, a user-assigned
  country code)
- the lookalike `examp1e.com` (digit 1). It isn't a reserved name, so it appears **only as display
  text** in the 4.3 and 6.2 lookalike cards. It's never shown with an address and never appears in
  terminal output.

A test in `src/lib/content/load.test.ts` fails if any other IPv4 address appears. Deliberately
invalid examples are allowed, because they can't be anyone's address: `192.168.1.256`,
`172.16.300.1`, the three-part `192.0.2`, and the wrong IPv6 short forms beginning `21:db8::`, which
fall in IETF-reserved space.

**Recurring examples, kept consistent across lessons:**
- home network `192.168.1.0/24`, with the router at `192.168.1.1` and the laptop at `192.168.1.20`
  or `.42`
- home public address `203.0.113.7`
- web server / example.com at `198.51.100.10` and `2001:db8::10`
- example.org at `203.0.113.80` and `2001:db8::80`
- ISP routers in `203.0.113.x`
- DNS answers come from the local stub resolver `127.0.0.53`, as on Ubuntu with systemd-resolved
- NAT public port `40001`, and the laptop's temporary port `51000`

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
- DNS is only hinted at: names are "looked up" to find addresses, which Module 4 covers.

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
  apart, and that learners will meet them in Module 5 (lesson 5.1 adds them).
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

## Module 4: DNS

### 4.1 Names and Numbers (`names-and-numbers`)
**Goals:**
- Routers deliver by IP address, and names exist for people.
- DNS as the internet's contacts app.
- The parts of a domain name, read right to left: root, TLD, domain, subdomain.
- The owner of a domain controls every name to its left (challenge).

**Key claims:**
- DNS stands for Domain Name System.
- In `www.example.com`: TLD `com`, registered domain `example.com`, subdomain `www`. The fully
  qualified form ends in a root dot, `www.example.com.`.
- `login.example.com.example.org` is controlled by example.org's owner.
- Two-letter TLDs are country codes: `.uk` United Kingdom, `.jp` Japan, `.de` Germany. `.com`,
  `.org` and `.net` are generic.
- "Non-authoritative answer" means a resolver passed the answer on.

**Simplifications:**
- "A lookup happens before almost every connection." Caching often makes it instant, and a few
  connections use raw IP addresses.
- `example` is called "the domain someone registered". Strictly, the registered domain is
  `example.com` (`example` is the second-level label). The card says "together it's example.com".
- `.com` is described as open to anyone. Some generic TLDs are restricted (for example `.gov`),
  which isn't mentioned.
- The `nslookup` output is from a Linux machine using the local stub resolver `127.0.0.53`.

### 4.2 The Lookup Journey (`the-lookup-journey`)
**Goals:**
- The lookup order: device cache → resolver → root → TLD → authoritative server.
- What each server does.
- Caching and DNS TTL in seconds.
- DNS TTL is not the IP TTL from 3.2.

**Key claims:**
- There are hundreds of millions of registered domain names.
- There are 13 named root server identities (a to m), run as well over a thousand copies around
  the world (anycast).
- Only the authoritative server holds the official records.
- TTL 3,600 s = 60 min; the dig answer's TTL is 1,800 s.
- A lookup at 11:50 with TTL 3,600 means the cached answer expires by 12:50.

**Simplifications:**
- The resolver is "usually run by your internet provider or a public DNS service". Home routers
  often forward to one of these, which isn't mentioned.
- The resolver's trip shows full recursion from the root. Real resolvers cache the root and TLD
  answers, so most lookups skip those steps. The explainer's "often answered straight away" hints
  at this.
- **TTL challenge (flagged):** TTL is the rule, but in practice some apps and resolvers cache a
  little differently. Browsers keep their own short-lived cache, some resolvers set minimum or
  maximum TTLs, and some serve stale answers during outages. The explanation says so and mentions
  lowering the TTL before a move.
- The dig output shows TTL 1,800 as if freshly fetched. A cached answer would show a lower,
  counting-down number.

### 4.3 DNS Records and Tools (`dns-records-and-tools`)
**Goals:**
- A, AAAA, CNAME and MX records at a beginner level.
- Read `nslookup -type=AAAA` and `dig` output, including following a CNAME.
- Spot lookalike domains (security teaser).
- MX priority (challenge).

**Key claims:**
- A holds IPv4. AAAA holds IPv6 ("quad-A", because 128 = 4 × 32).
- A CNAME is an alias to another name; the resolver follows it to the A record.
- MX names the mail server, and a lower preference number is tried first.
- `examp1e.com` is a different domain.
- `example.com.account-check.example.org` and `example-com.example.org` belong to example.org.

**Simplifications:**
- "A is for address": the record type name.
- The CNAME explainer doesn't mention that a CNAME can't sit at the zone apex alongside other
  records. The example only puts a CNAME on `www`, which is correct.
- MX "priority" is called *preference* in the RFCs. Only the lowest-first rule is taught.
- The lookalike list covers digit swaps and misleading subdomains. It doesn't cover Unicode
  homographs (punycode).

## Module 5: Ports and Protocols

### 5.1 Ports: Many Doors, One Address (`ports`)
**Goals:**
- One IP address runs many services, and ports pick the program.
- Ports are 16-bit numbers.
- The common ports: 80, 443, 53, 22, 25.
- Temporary client ports.
- **NAT with ports**, correcting Module 2.

**Key claims:**
- 2¹⁶ = 65,536 ports, numbered 0 to 65,535.
- HTTP 80, HTTPS 443, DNS 53, SSH 22, SMTP 25.
- `198.51.100.10:443` means port 443 at that address.
- A conversation is identified by four numbers: two addresses and two ports. (The protocol, TCP
  or UDP, is also part of it; see simplifications.)
- The router rewrites `192.168.1.20:51000` → `203.0.113.7:40001` and records it in its NAT table.
- Two devices with the same source port get different public ports.

**Simplifications:**
- The connection "4-tuple" leaves out the protocol, which really makes it a 5-tuple.
- Port 0 is reserved and never used for connections. The lesson just says "0 to 65,535".
- Temporary ports are "usually a high number like 51000". The real ranges vary: 49152–65535 on
  Windows, 32768–60999 on Linux.
- NAT always picks a new public port in the examples. Real routers often keep the original port
  when it's free. Strictly this is NAPT (port address translation).
- The `netstat -n` output shows only three TCP connections.

### 5.2 TCP and UDP (`tcp-and-udp`)
**Goals:**
- TCP is reliable and ordered; UDP is fast, with no guarantees.
- **Sequence numbers belong to TCP and count bytes**, correcting Module 3.
- The three-way handshake: SYN, SYN-ACK, ACK.
- Which apps use which protocol, and why.
- What happens when a SYN-ACK is lost (challenge).

**Key claims:**
- IP carries the addresses; TCP carries the ports and sequence numbers; UDP has no sequence
  numbers.
- Sequence numbers count bytes: after 1,000 bytes starting at 1, the next is 1,001.
- The initial sequence numbers are random-looking and are exchanged in the SYN and SYN-ACK.
- Handshake: SYN, SYN-ACK, ACK.
- A lost SYN-ACK: the client resends its SYN, the server resends its SYN-ACK, until the handshake
  completes or it gives up.
- DNS usually uses UDP, and TCP for large answers.
- The lost middle packet's data starts at sequence number 1,001.

**Simplifications:**
- Sequence numbers start at 1 in the examples. This matches the "relative" numbering tools like
  Wireshark show. Strictly, the SYN uses up one number, so the first data byte is the initial
  sequence number + 1. The card says real numbers start from a random-looking value.
- UDP "doesn't guarantee order": true. Some apps build their own ordering on top of UDP.
- **HTTP/3 isn't mentioned here.** It runs over QUIC, which is built on UDP but adds its own
  reliability and encryption. It's also noted in 6.3.
- "A video call usually uses UDP": typical for WebRTC media. Some calls fall back to TCP when UDP
  is blocked.
- The SYN-ACK challenge leaves out SYN cookies and exact retry timers.

### 5.3 Protocols: Shared Rules (`protocols-as-shared-rules`)
**Goals:**
- A protocol is a set of shared rules: format, order and error handling.
- Layering: HTTP inside TCP inside IP inside Wi-Fi or Ethernet.
- HTTP, HTTPS, DNS, SSH, SMTP and IMAP matched to their jobs.
- The email flow (SMTP, MX lookup, SMTP, IMAP).
- Ports are conventions (challenge).

**Key claims:**
- Internet protocols are openly published (RFCs; not named in the lesson).
- SMTP submission is on port 587, and server-to-server SMTP is on port 25.
- IMAP uses port 143, or 993 when encrypted.
- `nc -zv` output format (OpenBSD netcat), including "Connection refused" on port 25.
- 80 in hex is `50`.
- A server can listen on any free port; `:8080` tells the browser which one.

**Simplifications:**
- Four layers are shown (application, transport, internet, link). The OSI model and TLS's place
  between HTTP and TCP aren't shown here; TLS is added in 6.2.
- Email reading is described as "usually IMAP". POP3 and webmail over HTTPS also exist.
- The port-check explanation includes an ethics note: only test computers you own or have
  permission to test.
- "Some ports are standard" leaves out the IANA registry and the range split (well-known,
  registered, dynamic).

## Module 6: The Web

### 6.1 HTTP Requests and Responses (`http-requests-and-responses`)
**Goals:**
- Request and response.
- Method, path, the `Host` header and the body.
- GET vs POST.
- Status code classes, plus 200, 301, 404 and 500.
- Read `curl -I` output and follow a `Location` header.

**Key claims:**
- HTTP stands for HyperText Transfer Protocol.
- The request line is `GET /news HTTP/1.1`, and the `Host` header picks the site.
- Status classes: 2xx success, 3xx redirect, 4xx client error, 5xx server error.
- 200 OK, 301 Moved Permanently, 404 Not Found, 500 Internal Server Error.
- `curl -I` sends a HEAD request.
- A page with 1 HTML file, 3 images and 1 stylesheet needs at least 5 requests (with nothing
  cached).
- A 500 error proves the connection works.

**Simplifications:**
- 4xx is described as "a problem with the request". The formal name is "client error".
- Only GET and POST are taught; PUT, DELETE and others are mentioned only as "a few other methods".
- The HTTP examples use HTTP/1.1 over plain `http://`, for readable status lines. HTTP/2 and 3
  carry the same meaning in a binary format.
- The minimum-requests count ignores fonts, scripts and caching.

### 6.2 HTTPS and the Padlock (`https-and-the-padlock`)
**Goals:**
- What encryption protects in transit.
- HTTPS = HTTP inside TLS, on port 443.
- The TLS handshake at a simple level: keys agreed, and the server proves its identity with a
  certificate.
- What the padlock does and doesn't mean.
- What stays visible to the network.
- Certificate warnings (challenge).

**Key claims:**
- Plain HTTP is readable by any device on the path.
- TLS stands for Transport Layer Security.
- Certificates are issued by certificate authorities the browser trusts, and are valid only for
  their names and dates.
- The padlock means an encrypted connection to that name, not a trustworthy site. Scam sites can
  have certificates for their own names.
- Onlookers can usually see which site you visit (IP address, and the name from DNS and the
  ClientHello), but not the path or content.

**Simplifications:**
- **TLS 1.3 ordering (flagged):** the lesson follows TLS 1.3. The browser and server agree keys
  in the hello messages, then the server's certificate is sent *encrypted*, and the browser
  checks it. The explainer and drag card present this as one step: "TLS handshake: keys agreed
  and the certificate checked". **Older TLS versions (1.2 and earlier) ordered this differently:**
  the certificate was sent unencrypted before key exchange completed.
- "Encrypted" also covers integrity (tampering is detected). That isn't separated out.
- "Newer technology can hide the name in some cases" refers to encrypted DNS and Encrypted Client
  Hello (ECH), without naming them.
- Certificate checks are simplified to three (dates, name, trusted issuer). Revocation and chains
  of intermediate certificates aren't mentioned.
- The `curl -v` output is realistic for curl 8 with TLS 1.3 and HTTP/2. The issuer is fictional
  (`O=Example Certificate Authority`).
- Browsers have been moving away from the padlock icon (some now show a neutral "tune" icon). The
  lesson describes the padlock, which learners will still commonly see.

### 6.3 What Happens When You Type a URL (`what-happens-when-you-type-a-url`)
**Goals:**
- Follow one page load through every module: URL parts, DNS (with CNAME), NAT and routing, the
  TCP handshake, the TLS handshake, HTTP, reassembly, and drawing the page.
- Map browser errors to the step that failed (challenge).
- Route the reply back through NAT (challenge).

**Key claims:**
- A URL has a scheme, a host and a path. HTTPS defaults to port 443.
- `www.example.com` is a CNAME for `example.com`, which resolves to `198.51.100.10` and
  `2001:db8::10`.
- The order is TCP handshake → TLS handshake → encrypted GET → encrypted response.
- In the curl trace, IPv6 is tried first and fails ("Network is unreachable"), then IPv4 connects
  on port 443.
- "Server not found" is a DNS failure; "Connection timed out" means no reply to the handshake;
  "Your connection is not private" is a certificate failure; 404 is an HTTP-level error.
- Return routes may differ from outbound routes.

**Simplifications:**
- **HTTP/3:** the journey assumes TCP + TLS (HTTP/1.1 or HTTP/2). Some sites use HTTP/3 over
  QUIC (UDP), which merges the connection and TLS handshakes. It isn't taught.
- The TLS step is one combined step (see 6.2).
- Browser error wording varies by browser. The four messages are representative, not exact.
- "Connection timed out" can also be caused by firewalls silently dropping packets. That's grouped
  under "nothing answered the handshake".
- "Many browsers would try IPv6 first" simplifies Happy Eyeballs, which races IPv6 and IPv4.
- The packet_path cards label the home router with its public address `203.0.113.7`, because
  that's the address the server sees and replies to.

## Quizzes

| Quiz | Questions | Covers |
|---|---|---|
| `binary-and-data-quiz` | 7 (was 5) | bits, building/reading binary, conversion steps, why 255, **new:** MB→KB, bits per hex digit |
| `ip-addresses-quiz` | 7 | what an IP address does, octet 168, private/public/IPv6/NAT, IPv6 length, route through the home router, what the server sees, IPv6 short form |
| `packets-and-routing-quiz` | 7 | packet information, packet count, route around an outage, what a hop is, which packet to resend, first hop in traceroute (with a `* * *` hop), reorder by sequence number |
| `dns-quiz` | 7 | DNS's job, parts of `blog.example.org`, server roles, TTL 300 s = 5 min, record types, `nslookup example.org`, DNS TTL vs packet TTL |
| `ports-and-protocols-quiz` | 7 | 65,536 ports, standard ports, handshake order, UDP for a game, what the NAT table records, protocol jobs, TCP owns sequence numbers |
| `the-web-quiz` (course final) | 8 | M1 build 203 in binary · M2 what the server sees · M3 packet count · M4 lookup order · M5 ports · 6.1 status codes · 6.2 padlock · 6.3 journey order |

Every quiz uses a pass mark of 70% (`passThreshold: 0.7`), so 5 of 7 questions (or 6 of 8) must be
right. The quizzes cover only what the core cards teach. Packet-count questions always say "if each
packet carries exactly 1,500 bytes of data".

## Later corrections of earlier simplifications

Each item names where a simplification is introduced (**Early**) and where a later lesson corrects
or deepens it (**Later**).

1. **Sequence numbers.**
   - *Early (3.1, 3.3):* "information added to each packet" includes a sequence number, "from a
     partner set of rules" that 3.3 names as TCP. Packets are numbered 1, 2, 3.
   - *Later (5.2):* IP adds the addresses, and TCP adds the ports and sequence number. Sequence
     numbers count **bytes, not packets**, starting from a random-looking value. The challenge
     revisits the "resend the missing piece" idea, using byte numbers.
2. **NAT without ports.**
   - *Early (2.2):* the router "notes who asked", with ports mentioned as a later topic.
   - *Later (5.1):* the full version. The router rewrites address *and* port, keeps a NAT table,
     and uses different public ports to tell two devices apart. It's applied again in 6.3's reply
     route.
3. **Packets usually take one route.**
   - *Early (3.3):* "Most of the time a conversation's packets all follow the same road."
   - *Later (6.3):* whatever the route, TCP reorders and recovers, and the reply can take a
     different route from the request.
4. **Lost packets are resent.**
   - *Early (3.1, 3.3):* "packet 7 is sent again".
   - *Later (5.2):* TCP acknowledgements, and resending by sequence (byte) number.
5. **"Names get looked up."**
   - *Early (2.1):* names are "looked up" to find IP addresses, as a hint.
   - *Later (4.1–4.3):* DNS in full, including 4.1's first `nslookup`.
6. **Two meanings of TTL.**
   - *Early (3.2):* TTL is a hop limit.
   - *Later (4.2):* DNS TTL is seconds of caching. An explainer and a challenge separate the two.
7. **Real-time apps and UDP.**
   - *Early (3.3):* video calls "often use UDP", named but not explained.
   - *Later (5.2):* UDP explained properly (no handshake, no resending, no ordering), with
     activity-to-reason matching.
8. **Protocol.**
   - *Early (2.1):* defined briefly as "a set of rules".
   - *Later (5.3):* format, order and error handling, and layering.
9. **The default gateway.**
   - *Early (2.1):* the `ipconfig` explanation calls it the home router.
   - *Later (3.2):* traceroute's first hop is the same router.
10. **`#53` in the nslookup output.**
    - *Early (4.1):* flagged as a hint.
    - *Later (5.1):* explained as the DNS port.
11. **Lookalike domains and the padlock.**
    - *Early (4.3):* lookalike domains are introduced.
    - *Later (6.2):* a lookalike site can still show a padlock.

---
---

# Content review: Inside Your Devices

The second course (listed first in the catalog). It has 3 modules, 7 lessons and 3 quizzes, and
leans on the hands-on card types: `teardown`, `hotspot`, `simulator`, `scenario` and `sort_bins`.
A test checks that every lesson uses at least 2 of them, and that every simulator card starts
unsolved and has a solution.

**Devices and names used.** Only generic devices appear: "a laptop", "a phone", "a tablet". There are no
brands, models or operating-system names. App names are generic ("Music player", "Chat app"). The
one product-like name, **"CleanerPro"**, is made up for the fake pop-up scenario.

**Scenes are drawings, not photos.** Part positions in the `laptop` and `phone` scenes are
simplified and roughly where the parts sit in many devices, but real layouts vary a lot. The
laptop's RAM is drawn as a removable stick. Many thin laptops solder RAM to the board.

**Simulator numbers are illustrative** (see [Simulator models](#simulator-models)). They show the
right relationships, not measured figures.

**[Safety](#safety)** lists every physical-action or safety statement, for review.

## Module 1: Pull It Apart

### 1.1 What's in the Box (`whats-in-the-box`)
**Goals:**
- Phones and laptops contain the same core parts: CPU, RAM, storage, battery and motherboard.
- Say what each part does.
- Technicians unplug the battery first and reconnect it last.
- This is a simulation. Real devices should only be opened by an adult or a repair shop.

**Key claims:**
- The CPU follows instructions; RAM is fast working space; storage keeps data with the power off;
  the battery stores energy; the motherboard connects the parts through traces.
- Photos are kept in storage, not RAM.
- Technicians disconnect the battery before touching other parts, so nothing gets power while
  they work.
- Phones are often sealed with adhesive that repair shops soften with gentle heat.
- In phones, the CPU, RAM and storage sit on one small board, and the battery takes up most of the
  space.

**Simplifications:**
- Teardown order is simplified: a few screws and one panel. Real devices have clips, ribbon
  cables, shields and many more screws.
- "The CPU is the brain" is an analogy. In phones, the CPU is part of a larger chip (a
  system-on-a-chip) that also contains the graphics processor and more.
- The phone's RAM and storage are drawn as separate chips. In many phones, RAM is stacked on the
  processor.
- The camera swap reconnects the battery before refitting the cover. That's true of real repairs,
  but real ones also test the device before closing it.

### 1.2 Memory vs Storage (`memory-vs-storage`)
**Goals:**
- Tell RAM (the "desk") from storage (the "cupboard").
- Know the symptoms: full RAM means lag or reloading apps; full storage means you can't save or
  download.
- Choose the right fix for each.

**Key claims:**
- Both are measured in GB. RAM is much smaller and faster, and is cleared when the power goes off.
- Opening an app copies it from storage into RAM.
- When RAM fills, laptops move data to storage (swap), which slows them down, and phones usually
  close background apps, which then reload.
- Restarting clears RAM; files in storage are untouched. Restarting doesn't change how much RAM
  there is.
- Unsaved work is only in RAM, so it's lost if the power cuts out.
- 256 GB ÷ 8 GB = 32 films; 7 GB needed → 8 GB is the smallest option (in steps of 2 GB).
- "RAM booster" apps take up RAM themselves, and are often junk or worse.

**Simplifications:**
- The desk and cupboard analogy hides caches, virtual memory details and compressed memory.
- "Closing apps and restarting only clear RAM" ignores temporary files that a restart can remove.
- Phones don't swap at all in this lesson. Some do use compressed memory or a small swap area.
- Film and app sizes are round, illustrative numbers.

### 1.3 Meet the CPU (`meet-the-cpu`)
**Goals:**
- The CPU follows billions of simple instructions per second.
- GHz means billions of clock ticks per second.
- Cores are separate workers that only help with jobs that split.
- Heat causes throttling. Fans and clear vents prevent it.

**Key claims:**
- 1 GHz = 10⁹ ticks per second. At 2 GHz, 10 billion steps take 5 seconds (at one step per tick).
- A splittable 24-billion-step job at 2 GHz: 1 core 12 s, 2 cores 6 s, 4 cores 3 s.
- A job that can't be split runs on one core, so 4 or 8 cores at the same clock finish it in the
  same time.
- A CPU that gets too hot lowers its clock speed to protect itself (**throttling**). Phones have
  no fan and throttle too.
- Blocked vents (like a laptop on a blanket) trap heat.

**Simplifications:**
- **One step per tick** is stated as a simplification in the card itself. Real CPUs can do several
  instructions per tick, or need several ticks for one.
- Perfect splitting across cores ignores coordination overhead (Amdahl's law is not mentioned).
- All cores are identical. Many phone CPUs mix fast and efficient cores.
- Sort items ("check 1,000 files for viruses" splits; "a savings total month after month" doesn't)
  are idealised.

### Module 1 quiz (`pull-it-apart-quiz`)
7 questions: open a laptop safely (teardown) · tap the RAM · match parts to jobs · sort RAM vs
storage · 64 ÷ 4 = 16 videos · which job gains from more cores · throttling.

## Module 2: Software in Charge

### 2.1 Meet the OS (`meet-the-os`)
**Goals:**
- The operating system manages CPU time, RAM, hardware, files and separation between apps.
- Use a task manager to find and end a frozen app, and never end system processes.
- Save your work before updating, and don't interrupt an update.
- Spot a fake virus pop-up (challenge).

**Key claims:**
- The OS is the first program to start and runs until shutdown.
- The OS switches between apps so quickly they seem to run at once (time-slicing).
- Every running program is a process. Background processes (updaters, sync, antivirus) have no
  window.
- Ending a system process crashes or restarts the device. Most task managers warn you first.
- Ending a frozen app loses only its unsaved work.
- Updates fix bugs and security holes. They can't add hardware, and they often use more storage,
  not less.
- Switching off during an update can leave the OS unable to start.
- A web page can't scan your device, so "your device has N viruses" pop-ups are fake. Scam numbers
  ask for money or remote access.
- A memory leak is an app that keeps taking RAM and never gives it back. Restarting the app is the
  everyday fix.

**Simplifications:**
- "The OS talks to the hardware" hides drivers and the kernel/user-space split.
- "Stops apps reading each other's data" is memory protection and sandboxing, simplified.
- Ending a "System" process always crashes it here. Real OSes protect or restart many of them.
- The leak grows at a steady 0.15 GB per minute. Real leaks vary.

### 2.2 Files and Folders (`files-and-folders`)
**Goals:**
- Files, folders and paths.
- The extension after the **last** dot gives the file type. `.exe` is a program.
- Tell local files from cloud files.
- Handle a disguised program safely.

**Key claims:**
- `.jpg` photo, `.mp3` song, `.mp4` video, `.docx` document, `.txt` plain text, `.exe` program.
- `photo.jpg.exe` is a program. Some computers hide the last extension, so it may show as
  `photo.jpg`.
- The cloud is a company's servers in data centres, reached over the internet. Cloud files need
  the internet unless a copy is kept on the device.
- 1,000 MB ÷ 4 MB = 250 photos per GB; about 16,000 in 64 GB.

**Simplifications:**
- `.exe` is the Windows program extension. Other systems use other forms, but the course
  deliberately names no operating systems.
- 1 GB = 1,000 MB (decimal units, matching the internet course's 1.2 lesson).
- "A photo is about 4 MB" is typical, not fixed.
- The path is written `Documents > School > essay.docx` rather than with slashes, which differ
  between systems.
- Files synced between a device and the cloud are both at once. The sort items avoid that case.

### Module 2 quiz (`software-in-charge-quiz`)
7 questions: sort OS vs app jobs · how apps share the CPU · end a frozen game (task-manager
simulator) · save before updating · match extensions · tap the disguised program · where cloud
files live.

## Module 3: Fix It Yourself

### 3.1 Slow and Full (`slow-and-full`)
**Goals:**
- The fix-it loop: describe, guess, try, check.
- Diagnose slowness with the task manager (full RAM, startup apps).
- Free storage safely: delete what's backed up, duplicated or unused; keep only copies and system
  files.

**Key claims:**
- Every browser tab uses RAM.
- "Speed booster" apps rarely help.
- Startup apps compete for the CPU and RAM while the device starts. Disabling unneeded ones speeds
  up startup, and they still work when opened.
- Keep security software running at startup.
- Deleting unrecognised system files can stop a device working.
- Storage simulator sums: 64 GB phone, 63.5 GB used; game + downloads frees 15 GB, videos free
  20 GB. The update challenge needs music + videos + maps (11 GB) to reach 12.3 GB free.

**Simplifications:**
- Full storage also slows devices (little room for temporary files). This lesson ties slowness to
  RAM and startup apps only.
- "Offline maps can be downloaded again" and "music is in the cloud" assume the learner has
  those accounts.

### 3.2 Power Problems (`power-problems`)
**Goals:**
- What drains a battery, and how to stretch it.
- Why heat harms batteries.
- Troubleshoot a phone that won't charge, safely.
- Recognise a swollen battery and respond safely.

**Key claims:**
- Phones and laptops use lithium-ion batteries, rated in watt-hours. A phone holds about 15 Wh,
  and a laptop a few times more.
- The biggest drains are usually the screen's brightness, location (GPS) and background apps.
- Batteries hold noticeably less after a few hundred full charges; heat speeds this up.
- Cables and chargers fail more often than phones.
- Fluff commonly collects in charging ports.
- A bulging case or lifting screen often means a swollen battery, which can catch fire if pressed,
  bent or punctured.
- Sudden cold can cause condensation inside a device.
- The CPU and the camera are among the most power-hungry parts, along with the screen.

**Simplifications:**
- The drains are simplified. Weak mobile signal is also a major drain and isn't mentioned.
- "About 15 Wh" is typical of recent phones (roughly 12–20 Wh).
- "Heat wears batteries out faster" leaves out the chemistry.
- Low power mode is modelled as stopping background apps and cutting everything else by 15%.

### Course final (`inside-your-devices-final`)
8 questions: label the laptop · open a phone safely · make room in RAM for Maps · sort symptoms
by cause (RAM, storage, heat) · won't charge: what first · stretch the battery to 10 hours ·
fix-it loop order · `game-skins.png.exe`.

Every quiz uses a pass mark of 70%, and covers only what core cards teach. Throttling is taught in
the core `find-the-cooling` card as well as the challenge simulator.

## Simulator models

Pure functions in `src/cards/simulator/models/index.ts`, unit-tested. The numbers are chosen to
show relationships clearly.

| Model | Behaviour | Illustrative numbers |
|---|---|---|
| `memory` | System + open apps fill RAM. Over capacity, lag = 0.35 + overflow ÷ RAM | App sizes 0.3–3 GB, system 1.5–2 GB |
| `cpu-cores` | Split tasks share cores evenly; others run whole on one core. Time = busiest core ÷ GHz | One step per tick |
| `thermal` | Temp = 25 °C + load × 90 × cooling (fan ×0.55, blocked vents ×1.5). Over 90 °C the clock drops, down to 40% at the lowest | Base 3 GHz |
| `task-manager` | CPU % adds up; lag above 85% CPU or when RAM is over capacity. Ending a system process crashes the device | Leak 0.15 GB/min |
| `storage` | Free = capacity − system − kept files | Round sizes |
| `battery` | Watts = 0.3 base + music 0.2 + brightness × 1.2 + GPS 0.5 + background apps 0.6 (off in low power), low power × 0.85. Hours = Wh ÷ watts | 15 Wh; about 5.4 h at worst |

## Safety

Every statement that suggests or discusses a physical action on a real device. Each keeps to gentle
actions, names an adult or repair shop where it matters, and never gives instructions for opening
a real device.

**Opening devices (simulation only):**
1. `whats-in-the-box/safety-first` (mascot safety note, shown before the first teardown): it's a
   simulation; don't open a real phone or laptop without an adult or a repair shop; it can break
   parts and void the warranty; the lithium battery can catch fire if bent or punctured.
2. **Every teardown card** shows the built-in note: "This is a simulation. Real phones and laptops
   should only be opened by an adult or a repair shop."
3. "Unplug the battery first" is framed as **how technicians work safely** (`open-the-laptop`,
   `open-the-phone`, `swap-the-camera`, `pull-it-apart-quiz/q-open-safely`,
   `inside-your-devices-final/q-open-phone`), and repeated in the 1.1 recap with "Real devices
   should only be opened by an adult or a repair shop."
4. `open-the-phone` mentions that repair shops soften phone glue with gentle heat. It describes
   what shops do; it isn't an instruction.
5. `inside-your-devices-final/q-no-charge`: "Open the tablet" is a wrong choice: "Opening a device
   is for adults and repair shops, and it should never be the first step."

**Charging ports:**
6. `power-problems/wont-charge`: first try another cable and socket. The right fix for fluff is
   "Phone off, ask an adult to help brush it out with a soft, dry brush", with a repair shop as the
   fallback. Wrong choices teach **never metal** (pin, paper clip: damage or short circuit) and
   **never water**.
7. `inside-your-devices-final/q-no-charge`: "Never put metal in a charging port."
8. The 3.2 recap repeats: an adult can gently brush the port with something soft and dry; never
   metal or water.

**Heat and batteries:**
9. `meet-the-cpu/too-hot`: the fix is "Move it off the blanket" (clear the vents) and the fan. There
   is no cleaning of vents or opening the case.
10. `power-problems/helps-or-harms`: hot cars and charging under a pillow harm the battery.
11. `power-problems/swollen-battery` (core): a bulging case → stop using it, unplug it, keep it away
    from anything that can burn, and **tell an adult**; a repair shop can replace the battery.
    Wrong choices ("press the case flat", "keep using it") are explained as dangerous: a swollen
    lithium battery can catch fire if pressed, bent or punctured.
12. `power-problems/too-hot-to-handle` (challenge): stop, unplug and let it cool on a table out of
    the sun; **never the freezer** (condensation). If it later looks puffed up: stop using it, don't
    press it, tell an adult so it can go to a repair shop.
13. The 3.2 recap: "A bulging device may have a swollen battery. Stop using it, don't press it, and
    tell an adult."

**Software safety (no physical action, listed for completeness):**
14. `meet-the-os/fake-virus-popup`: don't click anything in the pop-up, don't call the number,
    close the browser (with the task manager if needed), and tell an adult.
15. `files-and-folders/suspicious-download` and `slow-and-full/delete-or-keep`: delete disguised
    programs without opening them and tell an adult; never delete system files you don't recognise.
16. Ending processes: the task manager cards teach that ending a system process crashes the device.
    Ending an app loses only its unsaved work.
