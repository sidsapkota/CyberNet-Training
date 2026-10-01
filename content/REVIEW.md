# Content review: How the Internet Works

This file is for anyone checking the course content for accuracy. For each lesson it lists:
- the learning goals
- the key factual claims to verify
- every deliberate simplification

**Inside Your Devices** is reviewed [at the end of this file](#content-review-inside-your-devices),
including its [Safety](#safety) list. [Teach before test](#teach-before-test-review-both-courses)
lists every change made to both courses when that rule was checked. [Beginner audit](#beginner-audit-both-courses)
lists what two fresh-beginner play-throughs found, and how each issue was fixed.

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
Explore cards (`hotspot` in `explore` mode, ungraded) introduce the laptop's and phone's parts
before any card tests them. Tests check that every lesson uses at least 2 hands-on types, that every
simulator card starts unsolved and has a solution, and that every drawn part is explored before a
card tests it.

**Devices and names used.** The scenes and lesson text use only generic devices: "a laptop", "a phone", "a tablet", with no
brands, models or operating-system names. The exception is the credited [real photos](#real-photos), whose captions name the device shown
plainly, without implying any link to its maker. App names are generic ("Music player", "Chat app"). The
one product-like name, **"CleanerPro"**, is made up for the fake pop-up scenario.

**Scenes are simplified diagrams, not photos** (each shows a "Simplified diagram" label). Part
positions follow real devices: a laptop's battery across the bottom, with a heat pipe carrying the
CPU's heat to the fan; a phone's battery filling most of its body, with the processor, RAM and
storage chips soldered to one small board. Real layouts still vary a lot.
- The **laptop** is an example with a removable RAM stick and SSD; every card that shows it says
  many thin laptops have them soldered.
- The **phone's RAM and storage** are soldered chips and are never shown as removable. The text
  says RAM is often stacked on the processor (drawn beside it here so both can be tapped).
- **Phones are glued shut.** The phone teardowns soften the glue (`heat`), lift the back, remove
  two small screws and a bracket, then unplug the battery. Real repairs use more steps (more
  screws, new glue, testing); the explanations say so.
- Each kind of part carries a drawn clue so beginners can tell them apart. The **lightning bolt**
  on batteries (real ones carry printed labels) and the **stacked lines** on storage chips (real
  flash chips look plain; inside, they really are built from stacked layers) are teaching marks.
  The CPU is a **small shiny die on a square base**, which is how laptop and phone processors
  really look (no metal lid; a laptop's is normally hidden under the heat pipe's plate). **Gold
  contacts** along the RAM stick and SSD are real.

**Simulator numbers are illustrative** (see [Simulator models](#simulator-models)). They show the
right relationships, not measured figures.

**[Safety](#safety)** lists every physical-action or safety statement, for review.

## Accuracy corrections (devices-accuracy)

What changed after the accuracy review of Inside Your Devices, and why.

| Was | Now |
|---|---|
| The phone scene showed RAM and storage like the laptop's, as if they could be taken out | Soldered chips on the phone's board; the explore card says they can't be swapped, and that RAM is often stacked on the processor |
| The laptop's RAM stick and SSD were shown as how every laptop works | "An example with removable RAM and an SSD; many thin laptops have them soldered" (explore card, photo caption, recap, RAM photo) |
| The phone opened by unscrewing the back | Phones are glued: soften the glue, lift the back, two screws, the bracket, then unplug the battery. Every phone teardown adds the fire-risk line to its safety note |
| The CPU was drawn with a shiny metal lid | A small shiny die on a square base (laptop and phone chips have no lid) |
| The laptop had no heat pipe; cooling was "the fan" | A copper heat pipe from the CPU to the fan's fins; `find-the-cooling` taps the CPU, heat pipe and fan |
| `too-hot` had a "Fan on" switch, as if laptop fans were switched on by hand | "Clean the dusty fan"; the explanation says laptop fans switch on by themselves and dust stops them cooling |
| "The OS is the first program to start" (the firmware starts first) | "The main program that starts" (`meet-the-os/the-operating-system`) |
| "Cloud files are kept safe and backed up" | "usually kept safe and backed up" (`files-and-folders/the-cloud`) |
| Opening the laptop made four screws look like the whole job | The prompt says real laptops often have more screws and clips |
| Scenes looked like photos of real layouts | Each carries a "Simplified diagram" label, backed by a real, credited photo |

## Real photos

Six real photos back up the simplified diagrams. All come from Wikimedia Commons under CC0 or
CC BY / CC BY-SA, are saved **unmodified** in `public/photos/`, and are credited on the card
(author, licence link, "via Wikimedia Commons", "Unmodified"). Captions describe the device
plainly and never suggest a link to its maker; `/terms` says product names belong to their owners.
Each caption and alt text was checked against the photo itself. The phone photo is a 2019 phone with a **glued** back, so it matches what the lesson teaches (an earlier choice, an iPhone 4 from 2010, had a screwed-on back and was replaced). Photos showing heating temperatures or tools as a how-to are never used.

| File | Card | Device | Author | Licence | Source |
|---|---|---|---|---|---|
| `/photos/framework-laptop-13-inside.jpg` | `whats-in-the-box/real-laptop` | Framework Laptop 13 (2023, AMD Ryzen) | Ogidya | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Framework_Laptop_13_-_2023_AMD_Ryzen_-_Internal_motherboard_and_component_view.jpg) |
| `/photos/phone-glued-back-opened.jpg` | `whats-in-the-box/real-phone` | Huawei P Smart Z (2019), glued back | Raimond Spekking | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:Huawei_Honor_P_Smart_Z_-_case_opened-8858.jpg) |
| `/photos/laptop-heat-pipe.jpg` | `meet-the-cpu/real-heat-pipe` | A laptop (model not recorded) | Kristoferb | CC BY-SA 3.0 | [Commons](https://commons.wikimedia.org/wiki/File:Laptop_Heat_Pipe.JPG) |
| `/photos/laptop-dusty-heatsink.jpg` | `meet-the-cpu/real-dust` | A laptop (model not recorded) | Audrius Meskauskas (Audriusa) | CC BY-SA 3.0 | [Commons](https://commons.wikimedia.org/wiki/File:Laptop_dust.jpg) |
| `/photos/laptop-ram-stick.jpg` | `memory-vs-storage/real-ram` | Samsung 8 GB DDR4 SO-DIMM | D-Kuru | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File:DDR_4_RAM_SO-DIMM_8GB_by_Samsung-top_front_PNr%C2%B00838.jpg) |
| `/photos/swollen-phone-battery.jpg` | `power-problems/real-swollen-battery` | Samsung EB-BA136ABY (from a Galaxy A13) | Saimmx | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:20250807_200837_Swollen_Samsung_battery,_back.jpg) |

## Module 1: Pull It Apart

### 1.1 What's in the Box (`whats-in-the-box`)
**Goals:**
- Phones and laptops contain the same core parts: CPU, RAM, storage, battery and motherboard.
- Say what each part does.
- Technicians unplug the battery first and reconnect it last.
- This is a simulation. Real devices should only be opened by an adult or a repair shop.
- See every part (explore cards) before being asked to find, label or remove it.

**Key claims:**
- Explore jobs, laptop: motherboard ("signals travel its thin lines, like roads"), CPU, fan ("blows
  hot air out through the vents"), RAM, storage, battery ("the biggest part inside"), battery
  connector ("technicians unplug it first"). Phone: logic board, camera, CPU, RAM, storage,
  battery ("fills most of the phone"), battery connector, charging port ("on the outside edge, so
  pocket fluff can get in"). Most phones have no fan.
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
- "Most phones have no fan": a few gaming phones do have one.

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
- The OS is the main program that starts when the device switches on, and it runs until shutdown. (Firmware runs briefly first to start it; not taught.)
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
- Phones and laptops use lithium-ion batteries. Power is measured in watts (W).
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
- The battery simulator uses a 15 Wh phone battery (typical of recent phones, roughly 12–20 Wh);
  the lesson itself no longer names watt-hours.
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
3. **Phone teardowns (heat and pry):** `open-the-phone`, `swap-the-camera` and
   `inside-your-devices-final/q-open-phone` soften the glue and lift the glued back, in the
   simulation only. Each adds, inside its built-in safety note right above the scene: "**Heating
   or prying a phone can damage its battery and start a fire.** That's why repair shops use special
   tools and training. It's never something to try at home." The prompts describe what
   *repairers* do; there are no temperatures, tools or methods. The `real-phone` photo shows the
   battery's own printed warning (don't disassemble, puncture, crush, heat or burn).
4. **Photos:** the dusty heatsink and swollen battery captions end with a repair shop, not a
   fix to try.
5. "Unplug the battery first" is framed as **how technicians work safely** (`open-the-laptop`,
   `open-the-phone`, `swap-the-camera`, `pull-it-apart-quiz/q-open-safely`,
   `inside-your-devices-final/q-open-phone`), and repeated in the 1.1 recap with "Real devices
   should only be opened by an adult or a repair shop."
6. `open-the-phone` mentions that repair shops soften phone glue with gentle heat. It describes
   what shops do; it isn't an instruction.
7. `inside-your-devices-final/q-no-charge`: "Open the tablet" is a wrong choice: "Opening a device
   is for adults and repair shops, and it should never be the first step."

**Charging ports:**
8. `power-problems/wont-charge`: first try another cable and socket. The right fix for fluff is
   "Phone off, ask an adult to help brush it out with a soft, dry brush", with a repair shop as the
   fallback. Wrong choices teach **never metal** (pin, paper clip: damage or short circuit) and
   **never water**.
9. `inside-your-devices-final/q-no-charge`: "Never put metal in a charging port."
10. The 3.2 recap repeats: an adult can gently brush the port with something soft and dry; never
   metal or water.
8a. `power-problems/charging-trouble` (explainer, before the scenario): try another cable and
    socket first; "With the phone switched off, an adult can help brush it out gently with a soft,
    dry brush. **Never use metal** (like a pin or paper clip) **or water**. If that doesn't work, a
    repair shop can clean it safely."
8b. `whats-in-the-box/explore-the-phone`: the charging port's job line says fluff can get in. It
    describes, and gives no instruction.

**Heat and batteries:**
11. `meet-the-cpu/too-hot`: the fix is "Move it off the blanket" (clear the vents) and the fan. There
   is no cleaning of vents or opening the case.
12. `power-problems/helps-or-harms`: hot cars and charging under a pillow harm the battery.
13. `power-problems/swollen-battery` (core): a bulging case → stop using it, unplug it, keep it away
    from anything that can burn, and **tell an adult**; a repair shop can replace the battery.
    Wrong choices ("press the case flat", "keep using it") are explained as dangerous: a swollen
    lithium battery can catch fire if pressed, bent or punctured.
14. `power-problems/too-hot-to-handle` (challenge): stop, unplug and let it cool on a table out of
    the sun; **never the freezer** (condensation). If it later looks puffed up: stop using it, don't
    press it, tell an adult so it can go to a repair shop.
15. The 3.2 recap: "A bulging device may have a swollen battery. Stop using it, don't press it, and
    tell an adult."
13a. `power-problems/how-batteries-work` (explainer): keep devices out of hot cars and don't charge
     them under a pillow; if one gets too hot, "stop, unplug it and let it cool on a table out of
     the sun (never in the fridge or freezer)"; a swelling battery (bulging case, lifting screen):
     "Stop using it, don't press it, and tell an adult."
13b. `whats-in-the-box/explore-the-laptop`: "Technicians unplug it first, so nothing gets power"
     (the battery connector), framed as how technicians work, like item 3.

**Software safety (no physical action, listed for completeness):**
16. `meet-the-os/fake-virus-popup`: don't click anything in the pop-up, don't call the number,
    close the browser (with the task manager if needed), and tell an adult.
17. `files-and-folders/suspicious-download` and `slow-and-full/delete-or-keep`: delete disguised
    programs without opening them and tell an adult; never delete system files you don't recognise.
18. Ending processes: the task manager cards teach that ending a system process crashes the device.
    Ending an app loses only its unsaved work.

## Teach before test: review (both courses)

The rule (CLAUDE.md → Content style guide): never grade something that hasn't been shown or
explained earlier in the course, in an earlier card or the card's own prompt. Every lesson and quiz
in both courses was read in order against it. These are all the changes. No card or lesson id
changed, and every lesson still has 8 to 12 cards.

### Inside Your Devices
- **New card type mode: explore.** `hotspot` cards can now be `mode: "explore"`: tap each part to
  see its name and job, not graded, +5 XP once.
- **1.1 What's in the Box:**
  - Added `explore-the-laptop` (before the first teardown) and `explore-the-phone` (before the phone
    teardown). Before this, the first teardown and the labelling cards tested parts learners had
    never been shown.
  - Removed the `what-each-part-does` explainer. Its content (every part's job, and the motherboard
    "roads" analogy) now lives in the explore cards, which keeps the lesson at 12 cards.
  - The laptop and phone scenes were redrawn so parts are easy to tell apart (see "Scenes are
    drawings" above).
- **1.2 Memory vs Storage:** moved the `desk-and-cupboard` explainer before the first simulator,
  which asked learners to free RAM before RAM vs storage was explained.
- **1.3 Meet the CPU:** moved the `cores` explainer before the `add-cores` simulator.
- **2.1 Meet the OS:**
  - `the-operating-system` now covers updates (they fix bugs and security holes; save first, let
    them finish). The `update-time` scenario and `why-update` question tested this before it was
    taught.
  - `behind-the-scenes` (retitled "The task manager") now comes **before** the task-manager
    simulator. It introduces the task manager, adds "leave security apps running", and adds "a web
    page can't see what's running, so a page that says it found viruses is lying" (for the
    `fake-virus-popup` challenge).
- **2.2 Files and Folders:** the extensions explainer now lists `.jpg`, `.mp3`, `.mp4`, `.docx`,
  `.txt` and `.exe` before the matching and labelling cards test them.
- **3.1 Slow and Full:**
  - `fix-it-loop` now lists the common causes of slowness, including **startup apps** (for the
    `slow-start` challenge).
  - Added a `safe-to-delete` explainer before the storage simulator and the delete-or-keep sort,
    which tested backups, duplicates, setup files and "never delete system files" untaught.
  - `room-for-update`: "Offline maps" is now "Maps (can re-download)", because the card relied on
    knowing that maps can be downloaded again.
- **3.2 Power Problems:**
  - `how-batteries-work` now covers hot cars and pillows, cooling down safely (never the fridge or
    freezer) and **swollen batteries** (stop, don't press it, tell an adult). These were tested by
    `helps-or-harms`, `swollen-battery` and `too-hot-to-handle` without being taught.
  - Added a `charging-trouble` explainer before the `wont-charge` scenario: another cable and socket
    first; with the phone off, an adult can help brush fluff out with a soft, dry brush; never metal
    or water; a repair shop as the fallback. (These statements are in the [Safety](#safety) list.)
- Quizzes: no changes needed. Everything they test is now taught in core cards first.

### How the Internet Works
1. **3.1 `why-data-travels-in-packets`:** moved `taking-turns` before the `why-packets` question,
   which needed "packets take turns" and "only the lost piece is resent".
2. **3.2 `routers-and-hops`:** `meet-traceroute` now explains `* * *` (a router that doesn't answer
   traceroute but still passes packets on), which the `stars` question tested.
3. **4.3 `dns-records-and-tools`:** `record-types` now says the **lowest** MX priority number is
   tried first (for the `mx-priority` challenge).
4. **5.3 `protocols-as-shared-rules`:** moved `email-protocols` before `protocol-jobs`, which tested
   IMAP before it was introduced.
5. **6.2 `https-and-the-padlock`:** `plain-vs-https` now mentions the padlock, which `https-terms`
   tested before `padlock-meaning` explained it.
6. **1.2 `bytes-file-sizes-and-hex`:** `size-ladder` now gives typical film and phone-storage sizes,
   which `typical-sizes` tested.
7. **6.1 `http-requests-and-responses`:** `get-and-post` now says each file is fetched with its own
   GET request (for the `requests-per-page` challenge).
8. **4.1 `names-and-numbers`:** the `country-tlds` challenge prompt now explains that two-letter TLDs
   are country codes, often from the country's own name (Germany is *Deutschland*).

Lessons with no changes: `bits-and-binary`, `what-is-an-ip-address`, `public-and-private-addresses`,
`meet-ipv6`, `different-roads-same-destination`, `the-lookup-journey`, `ports`, `tcp-and-udp`,
`what-happens-when-you-type-a-url`, and all six module quizzes.

---
---

# Beginner audit (both courses)

**Goal:** a 12-year-old with no prior knowledge can complete every graded card using only what the
course has shown so far, or what the card itself teaches while they do it.

**Method:** a fresh agent that had never seen the content played each course in order as a
12-year-old with no tech knowledge. It saw only an on-screen transcript and a screenshot of every
card, committed to an answer before reading the feedback, and recorded every card where it couldn't
answer, was confused by wording, or didn't know how to interact. One agent per course, so neither
course could lean on the other. After the fixes, two *new* agents repeated the play-through with the
glossary, hints and how-to-play panels visible ([second audit](#second-audit-after-the-fixes)).

**What was added for beginners (both courses):**
- **Glossary:** 97 plain-language terms in `content/glossary.json`, tappable at their first use per
  card in lessons (not in quizzes, and not in a card whose answers use the term).
- **Hints and nudges:** every graded lesson card (162) has a hint (points the way, never the answer)
  and a nudge after a wrong attempt (addresses the misconception, never names the correct option);
  multiple choice has one nudge per wrong option. Drafted per module, then every one reviewed for
  accuracy and for giving answers away. Nine drafts were changed in review (for example
  `lost-packet`'s hint gave the answer; `port-8080`'s hex nudge needed a skill only a challenge card
  practises; `where-photos-live`'s nudge described the answer's position).
- **How to play:** a one-time panel with an animated demo for each interaction style.
- **Display fixes:** drag-to-order labels showed literal backticks; five internet cards scrolled
  sideways at 390px (long IPv6 addresses and URLs now wrap); the "DEC" badge on number cards made
  beginners think they needed a decimal point, so decimal cards no longer show a badge.

## First audit: Inside Your Devices (23 issues)

| Where | Issue | Fix |
|---|---|---|
| M2 quiz `q-end-frozen` | **Blocker:** the goal secretly required keeping Notes open (one try) | Prompt: "End **only** the process that's hogging the CPU: keep **Notes** open, and don't crash the laptop." |
| 1.1 `where-photos-live`, `label-the-laptop`, `label-the-phone` | Explore cards gave jobs but not looks; phone RAM and storage looked alike | Explore job lines now say what each part looks like (shiny lid, row of chips, stripes, bolt); phone explore adds the speaker, so the grille isn't mistaken for the port |
| 1.1 `explore-the-phone`, 3.2 `find-the-port` | Charging port hard to spot | Port drawn larger; job says "middle of the bottom edge" |
| 1.1 `swap-the-camera` | "Swap" suggested a new camera | "Take the camera out, fit it back in, then close the phone up again"; hint mentions refitting in reverse |
| 1.2 `fill-the-ram` | "Smooth" shown next to a red "Full" bar; RAM total never stated | Prompt says 4 GB; a "RAM in use (of 4 GB)" readout; starting apps no longer exactly fill RAM |
| 1.2 `two-kinds-of-space` | GB named, never described | "a way of counting how much data something can hold" (and glossary) |
| 1.2 `storage-full` | "Backed up" used long before it was defined | Choice says "(copied somewhere else)"; glossary |
| All number cards | "DEC" badge suggested a decimal point | Badge removed for decimal |
| 1.3 `add-cores` | "Exporting" unknown | "Saving your finished video (called **exporting** it)"; task renamed |
| 1.3 `split-or-not` | Awkward savings item; "frames" felt sequential | "Savings: each month adds to the last"; "Draw 1,000 separate cartoon frames" |
| 1.3 `too-hot` | "Load" and "flat out" unexplained | "(how hard it's working)" in prompt and slider label |
| 2.1 `os-or-app` | Spell-check felt like a system job (keyboard autocorrect) | Replaced with "Add a sticker to a video" |
| 2.1 `behind-the-scenes` | Eight ideas on one screen; "sync" unexplained | Split: "The task manager" (processes, system processes, frozen apps) and a new "Helpers in the background" (background processes, syncing, security apps, fake virus pages) |
| 2.1 `end-the-frozen-app` | "Open the task manager" when it's already open | "Here's its task manager." |
| 2.1 `the-operating-system` | "bugs", "security holes", "hardware" unexplained | Short glosses inline (and glossary) |
| 2.2 `order-the-path` | Backticks shown; "outermost" hard | Rendering fixed; "from the biggest folder (the one holding everything else)" |
| 3.1 `safe-to-delete` | "Setup files" unexplained | "(the installers you downloaded)" |
| 3.1 `slow-start` | "Antivirus" not tied to "security app" | "Stop the antivirus (the security app) from starting" |
| 3.2 `how-batteries-work` | Longest card; watt-hours unused; "W" unexplained | Shortened; says power is measured in watts; swelling moved to its own card |
| 3.2 new `swollen-batteries` | (part of the split) | "When a battery swells": what it looks like and what to do, before the `swollen-battery` question |
| 3.2 `last-the-journey` | "Low power mode" and "W" unexplained | Prompt defines low power mode; readout says "(watts)" |
| 3.2 `label-power-parts` | Hard-to-parse prompt | "Label five parts: the three that bring power in, store it and pass it on, plus the CPU and the camera." |
| 3.2 `swollen-battery` | "Trackpad" unknown | "(the touch pad)" |
| Final `q-disguised-file` | `.png` never taught | Extensions explainer now says "`.jpg` and `.png` are pictures" |

## First audit: How the Internet Works (30 issues, no blockers)

| Where | Issue | Fix |
|---|---|---|
| 2.1 `finding-one-device` | "Network" never defined | Defined inline at first use (and glossary) |
| 2.1 `read-ipconfig`, 2.2 | "Router" used from 2.1, defined only in 3.2 | Defined in 2.1's feedback and in 2.2's opening explainer before `private-ranges` relies on it |
| 2.1 `running-out` | "Server" undefined, then everywhere | Defined inline (and glossary) |
| 3.2 `routers` | Dense card: router, routing table, hop, switch, access point | Split into "Routers and routing tables" and a new "Switches, and the box at home" |
| 3.2 `meet-traceroute`; 3.2 `first-hop`; **M3 quiz `traceroute-first-hop`** | **Quiz trap:** the header line's address looks like hop 1 (one try) | Explainer: "The first line just repeats where you're going… one numbered line per hop"; quiz prompt: "(the line numbered 1)" |
| 3.2 `router-down`; **M3 quiz `avoid-the-outage`**; 6.3 `route-the-reply` | **Quiz trap:** a "(down)" router looked like a working one, even highlighted as tappable | New `down` node style: dashed red outline, cross, "down" tag, dashed links, never highlighted; the schema rejects valid routes through it |
| 3.3 `route-changed` | Long wrapped output hard to compare | "Compare the two, hop by hop (the numbered lines). One hop has changed." |
| 4.2 `dns-ttl` | "You've seen TTL before" assumed an optional challenge | Reworded to introduce the packet TTL without relying on it |
| 4.2 `resolver-trip` | "Authoritative" hard | "(the one in charge of that name)" |
| 4.1 `parts-of-a-name` | Root as most general only inferable | "the most general of all: the **root**" |
| 4.3 `dig-cname` | "the root from lesson 1" (lesson 1 was binary) | "from the first DNS lesson" |
| 5.1 `meet-ports` | "Flats" is regional; "listens on" unexplained | "apartment building / apartment number"; "waits for packets on its own port (it **listens on** that port)" |
| 5.1 `which-program` | "Remote login" unexplained | "(for controlling the computer from far away)" |
| 5.3 `email-protocols` | "Encrypted" used before it's defined | Inline gloss (and glossary) |
| 6.1 `request-and-response` | HTML never defined | "usually written in **HTML** (the code that describes a web page)" |
| 6.1 `curl-headers` | `-I` looked like l or 1; three long commands to type | "(that's a capital **I**…)"; only `/old-news` needed |
| 6.2 `read-certificate` | "O=" could be zero | "(the letter O, for *organisation*)" |
| 6.3 `step-route` | Home router shown with a new address | Labelled "Home router (public IP)" and explained in the prompt |
| 6.3 `step-curl`, 4.x dig cards | Scary output (failed first try, long dig output) | Hints say which line to read |
| 1.2 `thousand-or-1024`, `meet-hex` | 2¹⁰ notation, "base 16" | "(2 multiplied by itself 10 times)"; "16 digits instead of our usual 10" |
| 2.3 `shortening`, `read-ip-addr` | "A run of groups"; Linux, wlan0, lo | "one row of all-zero groups that sit side by side"; prompt explains the connection names |
| 3.1 `whats-in-a-packet` (for the M3 quiz `packet-info`) | "Source = where replies go" only by elimination | "who sent it, and so where any reply goes back to" |
| Elsewhere | "Browser", "ISP", "TLS", "protocol" acronyms, ports | Glossary |

## Second audit (after the fixes)

Two new agents that had never seen the content played both courses again, this time with the
glossary, hints, how-to-play panels and nudges visible. **No blockers in either course.** Both
praised the analogies, the nudges (which "target real misconceptions") and the down-router drawing.

**Not real issues (audit-packet artefacts):** both agents saw a "hint shown under the box" on
number cards. That was the transcript generator printing the old under-the-box hint; the app now
shows hints only behind the Hint button. The same goes for the "Type a decimal number" wording, and
for the sticky Check bar "covering" parts in full-page screenshots (on a phone, the page scrolls).

### Inside Your Devices (18 findings)

| Where | Issue | Fix |
|---|---|---|
| 2.1 `fake-virus-popup` | "popping back up" linked to the *backed up* definition | Mark removed; the glossary marker no longer matches "back up" |
| 2.1 `why-update` | "a bit more storage" linked to *bit* (0 or 1) | Reworded "a little more"; the other "a bit" idioms in both courses too ("rather like", "just over") |
| 1.1 `where-photos-live` | Nudge didn't help a learner who tapped the camera | "The camera takes photos, but it doesn't keep them…" |
| 1.1 `swap-the-camera` | Refitting from the Parts out tray never explained | Teardown how-to-play panel and the hint both explain the tray |
| 1.1 `label-the-laptop`, `label-the-phone` | Numbered spots covered the very clues the hints mention | Label spots moved to each part's corner (`labelAt`) |
| 1.3 `split-or-not` | "Savings" still felt splittable | "Knitting a scarf, row by row" |
| 1.2 `fill-the-ram`, final | "System" in RAM before the OS is taught | "(The phone's own system always needs some RAM too.)" |
| 1.2 `storage-full` | First choice's wording gave the answer | Choices are now just "Storage space" / "RAM space" |
| M1 quiz `q-throttling` | Wrong options too silly | "The battery is running out" / "It needs more RAM" |
| 2.1 `memory-leak` | RAM total never shown | "8 GB of RAM" in prompt and readout |
| 2.2 `label-the-files` | Document vs plain text unclear | Extensions explainer: document = "with styles like bold and headings", `.txt` = "just letters" |
| 2.2 `order-the-path` | "saved here" pointed at nothing | "saved inside these folders" |
| 3.1 `free-up-space`, `room-for-update` | Unlabelled "Downloads" | "Old setup files" (matches the safe-to-delete explainer) |
| 2.2 `photos-per-gb` | MB never taught | Glossary: megabyte |
| Several | "tab", "code", "short circuit", "formatting", "sluggish", "installers" | Glossary (tab, short circuit) or reworded ("a program's instructions", "slow", "the files you downloaded to install an app") |

### How the Internet Works (27 findings)

| Where | Issue | Fix |
|---|---|---|
| All packet_path cards | Instructions said "hop" before lesson 3.2 | "Tap the next stop along a line…" (screen reader too) |
| Terminal cards (netstat, curl, dig) | Output wrapped, so table columns didn't line up | Terminal output keeps its columns and scrolls sideways inside the box; the box is taller on phones |
| 3.3 `route-changed` | Hard to compare wrapped outputs; "Which router" asked for an address | Yesterday's output keeps its columns; question asks for "the address of the router…" |
| 1.1 binary coach | "The total underneath" (it's above) | "The number above them…" |
| 1.2 `thousand-or-1024` | "Powers of 2" unexplained; "2 multiplied by itself 10 times" misreadable | "the numbers you get by doubling"; "ten 2s multiplied together" |
| 1.2 `meet-hex` | 4-bit place values assumed | "the places are worth 8, 4, 2 and 1, so `1111` is 15" |
| 2.1 `read-ipconfig` | First terminal: "terminal"/"command" unexplained; where to type the answer | Prompt explains both and points to the answer box; the terminal panel says so too |
| 2.2 `why-unreachable` | Correct option longest; nudges repeated the answer | Options balanced; each nudge addresses its own misconception |
| 2 quiz `phone-to-server` | "ISP router" node | "Your ISP's router" |
| 3.1 `packet-parts` | "bit of story" linked to *bit* | "piece of the story" |
| 3.3 recap | UDP introduced only in a challenge | Recap describes the idea without the name |
| 3.2 `routers` | "Hop" definition didn't cover device → first router | "from your device to the first router, then from router to router" (glossary too) |
| 4.1 `who-translates` | "Module 2" (it was Module 3) | "you learned earlier" |
| 4.2 `dns-ttl` | "TTL again" when the packet TTL was only in a challenge | Retitled; the card introduces both TTLs itself |
| 4.2 `resolver-trip` | Root-server sentence hard; "records" early | Reworded; "records (its DNS entries, like its address)" |
| 4.3 `mx-priority` | "backup" server linked to *backed up* | Mark removed |
| 5.3 `email-journey` | "Four protocols" (there are three) | "Four steps and three protocols" |
| 6.1 `request-and-response` | Densest card (ten terms); "HyperText" unexplained | Split into "Requests" and a new "Responses"; "*hypertext* just means text with links" |
| 6.2 `tls-handshake` | "Vouching" | "before issuing its certificate" |
| 6.3 `step-dns` | "canonical name" in the output | Prompt explains it's the CNAME |
| 5.3 `port-8080` | "convention" | "agreement" |

**Left as they are, with reasons:** the agent's note that five ports are listed once and matched
two cards later (`match-ports`) describes a recall exercise, which is the point of the card; its
hint and nudge support it without giving pairs away. `email-protocols` and the "random-looking"
starting sequence number are dense but accurate and short. Several multiple-choice cards have a
longer correct option; `why-unreachable` was rebalanced, and the rest are listed for a future
wording pass. Drag lists can sit partly below the Check bar with a how-to-play panel open; the page
scrolls, and the panel goes after one "Got it".


# Content review: Stay Safe Online

The third course. It has 4 modules, 8 lessons and 4 quizzes (the last is the course final). Modules
1 and 4 are free, and modules 2 and 3 are Pro (`"access"` in each `module.json`; the Pro branch reads
it, and main ignores it). "When Things Go Wrong" is free because help, reporting and recovery must
never be behind a paywall (a CLAUDE.md rule, checked by a test). It teaches **defence only**: how to recognise and respond to scams and account
take-overs, never how to make or run one.

**Fictional examples only.** "Your Bank" and "Parcels" are made-up names. Every web and email
address in an example uses the reserved `.example` domain (RFC 2606), so none can point at a real
organisation. A test fails if any other address appears, apart from the real help services below.
No real people, brands or logos appear. The three new scenes (`email`, `text-message`,
`fake-website`) are generic, and the scene test also checks their addresses.

**Real help services (verified 30 September 2026):**
- eSafety Commissioner (esafety.gov.au/report): investigates cyberbullying of under-18s, adult cyber
  abuse, image-based abuse, and illegal or restricted content. For cyberbullying and adult cyber
  abuse, report to the platform first. Image-based abuse can be reported to eSafety straight away.
- Scamwatch (ACCC, National Anti-Scam Centre), scamwatch.gov.au: report a scam at /report-a-scam.
  After a scam: act quickly, contact your bank, get free support from IDCARE, report to Scamwatch.
- IDCARE (idcare.org, 1800 595 160): free identity and cyber support to make a recovery plan.
- ReportCyber at cyber.gov.au: report cybercrime to police. ASD's 24/7 hotline (1300 CYBER1) isn't
  mentioned, to keep the list short.
- Kids Helpline, 1800 55 1800: free, private, 24/7, ages 5 to 25.
- ACCCE, the Australian Centre to Counter Child Exploitation (accce.gov.au, AFP-led): under-18s
  report sexual extortion ("sextortion") and other online child exploitation at
  **accce.gov.au/report** (the "Report abuse" button). Its advice for young people
  (accce.gov.au/sextortionhelp): stop the chat; don't pay, respond or send more; screenshot the
  messages and the offender's profile; block and report to the platform; report to the ACCCE; get
  support (Kids Helpline 1800 55 1800, Lifeline 13 11 14); eSafety can help remove images; "you
  will not be in trouble with law enforcement". Immediate danger: 000. Anonymous reports: Crime
  Stoppers 1800 333 000 (not mentioned in the course, to keep it short). Verified 30 September 2026.
- cyber.gov.au passphrase advice: **four or more random words, at least 15 characters**. Some older
  pages say 14; the current page says 15.
- cyber.gov.au MFA advice: passkeys first (phishing-resistant), then an authenticator app. SMS and
  email codes are the weakest second factors.

Re-check all of these before each review: services and numbers change.

**Tone:** calm and practical. Every "what went wrong" card says it's not the learner's fault and
points to a trusted adult. The one sensitive topic is 4.2 `photo-threat`: a threat to share a
private photo. It is a challenge card, gives no detail beyond "a private photo", and follows
eSafety's and the ACCCE's advice: don't pay, stop replying, screenshot the messages and profile
(never the image), block, tell a trusted adult, and report to the app, eSafety, and, for under-18s,
the ACCCE. The card says plainly that it is **never the young person's fault** and that they won't be
in trouble, and gives **Kids Helpline (1800 55 1800)** and **000** directly.

## Module 1: Lock Your Accounts (free)

### 1.1 Strong Passwords (`strong-passwords`)
**Goals:**
- Know how passwords get guessed.
- Length matters most.
- Passphrases.
- One password per account.

**Key claims:**
- Stolen password lists are usually scrambled, so attackers guess with computers. They try common
  passwords, words, names, birthdays and substitutions (`@` for `a`) first.
- Each extra lowercase letter multiplies the combinations by 26: 26 × 26 = 676.
- A passphrase is 4+ random words and at least 15 characters (cyber.gov.au). Lyrics, quotes and
  personal details are guessable however long they are.
- Passwords reused from a data breach get tried on other sites. Change it everywhere, starting
  with email, which can reset other accounts.

**Simplifications:**
- The simulator (`password` model) counts every combination of a **random** password at an
  illustrative **one billion guesses a second**. Real speeds range from a few guesses a second (a
  website's sign-in page) to far more (fast hardware against weakly stored passwords). The model
  only applies to random passwords; the lesson says real guessers try predictable ones first.
- The simulator doesn't model passphrases (guessing whole words from a word list). At a billion
  guesses a second, four random words from a typical list would fall faster than their character
  count suggests. That would seem to contradict the official advice, which assumes passwords are
  well protected when stored. So the lesson teaches passphrases as "length you can remember", in
  an explainer.
- At that speed: 14 lowercase letters ≈ 2,000 years; 13 ≈ 78 years; 10 characters from all 95
  printable characters ≈ 1,900 years.

### 1.2 Two-Step Sign-In (`two-step-sign-in`)
**Goals:**
- Know, have or are.
- Rank second factors from strongest to weakest.
- Never share a code.
- Password managers.
- Backup codes.

**Key claims:**
- Strongest to weakest: passkeys, then authenticator apps, then SMS codes (cyber.gov.au).
- No real company asks for a sign-in code. An unexpected code means someone has your password.
- A password manager fills in only on the real site.
- Save your backup codes.

**Simplifications:**
- "Two-step", "two-factor" and "multi-factor" are treated as the same thing.
- Security questions are described as weak (they can be guessed or found), not as a factor.

## Module 2: Spot the Scam (Pro)

### 2.1 Phishing Emails (`phishing-emails`)
**Key claims:**
- Warning signs: fake sender, rushing you, "Dear Customer", asks for secrets, hidden link, too good
  to be true.
- The address after the @ counts, not the display name. The owner is the name just before the
  ending.
- Hover, or press and hold, to preview a link.
- Report it; don't reply.

**Simplifications:** a generic greeting is a common sign, not proof. The lesson says scammers can
also use your real name.

### 2.2 Scam Texts and Calls (`scam-texts-and-calls`)
**Key claims:**
- Common scam texts: parcel fees, tolls and "Hi Mum".
- Sender names can be spoofed, so scam texts can appear in a real thread.
- Scam callers pretend to be banks, government, tech support or police. They ask for codes,
  passwords, remote access or gift cards.
- AI can clone a voice from a short clip. Hang up and call back on a number you know, and use a
  family safe word.
- Being asked to keep it secret is a red flag.

### 2.3 Fake Websites (`fake-websites`)
**Key claims:**
- Read the name just before the ending (`.example`, `.com`, `.com.au`).
- Subdomains like `login.yourbank.example` belong to the owner.
- The padlock means an encrypted (HTTPS) connection, not an honest site.
- Banks never ask for a card PIN on a website.
- Sign in through the app, a bookmark or a typed address. A password manager that won't fill in is
  a clue.

**Simplifications:** "the name just before the ending" simplifies the real rules. Some endings,
like `.com.au`, have two parts, and the examples only use `.example`.

## Module 3: Guard Your Privacy (Pro)

### 3.1 Your Digital Footprint (`your-digital-footprint`)
**Key claims:**
- Posts can be copied, and they last.
- Keep private: your address, phone, school, where you are right now, passwords, and the answers
  to security questions. That includes usernames.
- "Fun" quizzes can harvest security-question answers.
- Privacy settings: private account, message limits, location off, tag review.
- Block, report, and tell a trusted adult.

### 3.2 Apps and Public Wi-Fi (`apps-and-wi-fi`)
**Key claims:**
- Grant only the permissions an app needs; choose "Only while using the app"; change them in
  Settings.
- Many phones show an indicator when the camera or microphone is in use.
- Download from official app stores.
- On public Wi-Fi, HTTPS protects what you send to most sites. The bigger risk is a fake hotspot,
  so check the network's name with staff and use mobile data for banking.

**Simplifications:**
- VPNs aren't covered.
- Indicator dots exist on current iOS and Android versions; older devices may not show them.

## Module 4: When Things Go Wrong (free: help, reporting and recovery are always free)

### 4.1 Signs of a Hack (`signs-of-a-hack`)
**Key claims:**
- The signs of an account take-over.
- The steps, in order: tell a trusted adult, change the password, check the recovery details, sign
  out other devices, turn on two-step sign-in. Then change reused passwords and warn friends.
- Use the official recovery. Paid "recovery" offers are scams.

**Simplifications:** real apps word these settings differently. The order is a sensible default,
not a rule every service states.

### 4.2 Deepfake Scams and Fakes (`deepfake-scams`)
Added 1 October 2026 (moved here from the AI course plan, because help is always free and this
module is open to guests). Self-contained: Spot the Scam is Pro, so the red flags it needs are
re-taught here.

**Goals:** know that AI can copy voices and faces; spot the red flags anyway (hurry, secrecy,
money or codes, a new number) and know why scammers use each; check by hanging up and contacting
the person on the number you already have, a question only they'd know, or a trusted adult; know
what to do if someone fakes a picture of you.

**Key claims (sources checked 1 October 2026):**
- AI can make convincing fake video and audio of a real person from real recordings, sometimes a
  few seconds long. You can't always tell by looking or listening.
- Scamwatch (Text or SMS scams): if someone says they have a new number, call them on the
  **existing number** you have for them, or ask a question only they would know.
- A family code word: common advice, not a Scamwatch quote, so it's offered as something "some
  families" do, beside the question only they'd know.
- eSafety (Image-based abuse, esafety.gov.au/key-topics/image-based-abuse): covers intimate images
  "digitally altered or faked to look like you (such as a deepfake created with an AI tool or
  app)", which can be reported to eSafety, which can help get them removed. Its deepfakes guide
  page (esafety-guide/deepfakes) returned 404 on this date, so it isn't cited.
- Evidence, ACCCE and "never save the image itself" match 4.3 Getting Help (verified 30 September
  2026).

**Simplifications:** "a few seconds" of audio is the low end; quality varies. The step order
(don't share, save evidence, tell an adult, report) is a sensible default that matches Getting
Help.

### 4.3 Getting Help (`getting-help`)
**Key claims:**
- The help services verified above.
- Save evidence before blocking: screenshots of messages, usernames, addresses and dates. Never
  copy, save or share a private or nude image itself.
- Paying a scammer usually leads to more demands.
- Call 000 for danger right now.

## Teach before test: self-check fixes (before the audit)
- 1.1 `the-leak` rewarded changing the **email** password first, but "email can reset other
  accounts" was only in the feedback. It's now taught in `one-password-each`.
- 2.1 `real-sender` (challenge) needed "the owner is the name just before the ending", which was
  only taught in 2.3. It's now also in `check-the-sender`.
- 3.1 `band-name-quiz`, `friendly-stranger` and `username-check` relied on security questions,
  block-and-report, and safe usernames. All three are now taught in `keep-private` and
  `privacy-settings`.

## Beginner audit: Stay Safe Online (30 September 2026)

**Method:** as for the other courses. A fresh agent that hadn't seen the content played the whole
course in order as a 12-year-old with no online-safety knowledge. It saw only the on-screen text
(with glossary definitions and optional hints) and screenshots of the three scenes, and committed
to each answer before reading the key.

**Result:**
- No blockers and no teach-before-test failures.
- 87 graded cards (60 lesson cards including challenges, and 27 quiz cards): all right first try,
  with no hints needed.
- Tone was judged calm and empowering throughout, and the sensitive cards gentle and correct.
- Help details and simulator numbers were checked and found accurate.
- Nothing teaches attacking, and no real brands or addresses appear.

| Where | Issue | Fix |
|---|---|---|
| 2.1 `spot-the-signs`, `name-the-signs`; 2.2 `spot-the-text`, `label-the-text`; 2.3 `spot-the-site`, `label-the-site` | Hints and nudges named the targets or placed labels | Rewritten to point at the warning-sign list ("take one sign at a time") without naming parts |
| 1.2 `know-have-are`, 4.1 `order-the-steps`, 4.2 `where-to-go` | Nudges answered part of the card | Now point to the method ("in your head, pocket or part of you"; "the reason for each step"; "start with the one you're surest of") |
| 4.1 `order-the-steps`, final `q-steps` | **Accuracy:** recovery details were checked last, but an attacker who controls the recovery email can reset the new password. The last three steps were rote in a one-try quiz | Recovery details are now step 3, straight after the password change, with the reason taught. The final orders only the first three steps, each with a taught reason |
| 2.1 `check-the-sender` | A correct address was implied to prove an email is real | "A right address is a good sign, but not proof: addresses can be faked too" |
| 2.3 `padlock` | Some browsers no longer show a padlock | Notes that some browsers show a different icon, or none |
| 2.2 `hang-up-or-ok` | "A friend calls from their saved number" as OK contradicted caller-ID and voice spoofing | "You call a friend on their saved number" |
| 1.2 `strongest-proof` | "Text codes are the weakest of the three" was wrong for its options; security questions weren't taught | New explainer `strongest-proofs` (passkey, app, SMS; security questions are weak; backup codes); explanation fixed; `security-question` glossary term |
| 1.2 `what-two-step-is` | Too dense | Split: kinds of proof here, strongest options in `strongest-proofs` |
| 2.3 `read-the-address` | `/signin` and `/help` not explained; referred to the other course | "Anything after a `/` is just a page on that site"; cross-course reference removed |
| Glossary `domain-name` | Relied on "IP address", which this course doesn't teach | Now says what an IP address is in the same sentence |
| 3.2 `wi-fi-ok` | "The café's real Wi-Fi" contradicted the reason for using mobile data | "A café's public Wi-Fi"; explanation says you can't always be sure a network is real |
| 4.1 `hacked-or-normal`, final `q-hacked` | "Changed it" was unclear; "a code just after you signed in" was odd | "An email after you changed your password"; "A code while you were signing in" |
| 1.1 `best-passphrase` | The right answer reused the explainer's example words | Fresh words |
| 1.1 `how-guessing-works` | "Scrambled" unexplained | "Scrambled so they can't just be read" |
| 1.1 `easy-or-hard` | "A random one from an app" came before password managers | "A long random one made by a password app" |
| 2.2 `spot-the-text` | Fee and deadline are two targets inside one bubble | Kept: each line gets its own tap highlight, and the prompt names the new message |
| M2 quiz, final | Quiz hotspots reuse the lesson scenes | Kept for now (noted): variants need new scene artwork |

---

# Content review: How AI Really Works

Built on the branch `ai-course`. Every AI output in the course is written in advance: there are no
live AI calls. The two AI card types use tiny, pure models (`src/cards/train-model/model.ts`,
`src/cards/next-word/model.ts`), so every "guess" a learner sees is worked out from the card's data.
No real people appear anywhere.

## Module 1: What AI Actually Is (free; guests get 1.1)

### 1.1 Spot the AI (`spot-the-ai`)
**Goals:** tell programs that follow written rules from AI that learns from examples; name
machine learning; know AI matches patterns and doesn't understand like a person.

**Key claims:** face unlock, keyboard suggestions, spam filters and song suggestions use machine
learning; timers, calculators and unit converters follow fixed rules.

**Simplifications:** "AI" is used for systems that learn from examples (machine learning), which
is how the word is mostly used today; older rule-based "expert systems" were also called AI. Face
unlock is described as learning from "scans of your face"; in reality a general face model is
trained on many people, and your phone stores a description of your face to compare against.

### 1.2 Patterns Everywhere (`patterns-everywhere`)
**Goals:** training data, labels, patterns and models; see a model trained on correct labels still
get something wrong; fix it with better examples; the steps collect, label, train, test, use;
accuracy as a percentage.

**Key claims:** a nearest-neighbour model guesses a new item's label from the nearest training
examples (k = 1, or the majority of the 3 nearest). Leaving a kind of example out of the training
data causes mistakes on it.

**Simplifications:** fruit is described by just two features (roundness and yellowness) on a 0 to
10 chart. Real models use many more features and far more examples. Nearest neighbour is one real,
simple method; most modern AI uses other kinds of model.

### 1.3 What AI Can't Do (`what-ai-cant-do`)
**Goals:** a model's output is a prediction, not a fact; confident is not the same as correct;
check important facts with a trusted source; big decisions about people need a person.

**Key claims:** AI can't reliably check its own answers, so asking it "are you sure?" doesn't
verify anything. The bridge dates (1952, 1958) are fictional.

**Simplifications:** "it can't always tell when it's guessing" stands in for the fact that a
model's confidence isn't a reliable sign of being right.

### Module 1 quiz (`what-ai-actually-is-quiz`)
Six core questions: rules or learning, a labelling card (a mini basketball the model gets wrong),
missing training examples, the steps, checking a fact, and the four words.

## Module 2: How Machines Learn (Pro; teaser: 2.1 `label-messages`)
Harder than module 1 on purpose: vote counting, comparing percentages, and "choose the data"
cards where only one change fixes every test (checked by trying every subset).

### 2.1 Training Data (`training-data`)
**Goals:** how a word-vote model decides; one word or one example can tip it; wrong labels,
copies and missing kinds of examples; better data beats more data.

**Key claims:** in the spam example, "free" appears only in spam, so "Free pizza at footy
training" gets 3 spam votes to 2 (pizza, training) and is called spam; adding "Free footy training
on Saturday" (not spam) makes it 5 to 3. "Pizza, pizza, pizza!" adds only one vote (words count once
per message), making a 3 to 3 tie. One mislabelled example next to a test item flips its guess.

**Simplifications:** the word-vote model is a cut-down version of a naive Bayes spam filter (real
ones weigh words by how often they appear, and use far more messages). Words of 1 or 2 letters are
skipped, standing in for real "stop word" lists.

### 2.2 Testing a Model (`testing-a-model`)
**Goals:** training vs test examples; accuracy as right ÷ tested × 100; overfitting; fair and
unfair tests; comparing accuracies as percentages.

**Key claims:** 34 of 40 = 85%; 45 of 60 = 75% and 38 of 50 = 76%. The weather model gets 3 of
4 test days right (it calls the cloudy but dry day rain, because every cloudy training day was
rainy). The "grass means dog" story is the classic shortcut-learning example, told generically.

**Simplifications:** weather is reduced to two features (cloud and damp air); real forecasts use
physics models and far more data. Overfitting is explained as memorising; the technical idea (fitting
noise in the training data) is left out. Test examples are described as "kept aside"; validation
sets aren't mentioned.

### 2.3 Bias In, Bias Out (`bias-in-bias-out`)
**Goals:** bias as a model working better for some people than others, usually from gaps in the
data; nobody has to mean it, and it's never the fault of the people it gets wrong; finding it
(test with many groups, accuracy per group) and fixing it (missing examples, a person checking).

**Key claims:** a checker that only saw "sick" meaning bad misreads slang praise; adding one
example of the other use fixes it while the mean tests still pass. Voice assistants have been
found to be less accurate for some accents (described generally; no companies or studies named).

**Simplifications:** bias is shown as missing training examples; other sources (labels that
reflect people's opinions, how a problem is framed) are left for later or out. The club, school
and game stories are fictional.

### Module 2 quiz (`how-machines-learn-quiz`)
Eight core questions: which one example fixes a word-vote mistake (a tie for "Fun games online"),
accuracy (28 of 35 = 80%), comparing 18 of 24 with 15 of 20 (both 75%), overfitting, fair tests, fixing a face-matching gap for children,
a biased chat filter, and the four words.

## Beginner audits: Module 2 (1 October 2026)

Module 2 is meant to be harder than module 1. Two fresh agents played it as a 12-year-old who had
finished module 1, committing to answers before reading the key; every vote count and distance
was checked against the model code.

**First audit:** 24 of 25 right first try, so too easy. Its causes, and the fixes:

| Where | Issue | Fix |
|---|---|---|
| Module | No card made the learner predict the model; live guesses carried the include cards | New core card `count-the-votes`: count the not-spam votes before the model shows its guess (2; counting "at" gives 3) |
| 2.1 `more-or-better` | A near copy of module 1's yellow apples | Spanish spam vs English data, with a tempting "Spanish spam only" option |
| 2.3 `club-filter`, `where-bias-comes-from`, `fixes-that-help`; quiz `q-bias-scenario`, `q-better-data` | Joke wrong options; the right answer was the longest | Tempting wrong options ("not enough data overall", "accept everyone more easily", "block fewer messages", "more data from the same group"), similar lengths |
| Quiz `q-homework` | A one-try include card could be solved by ticking boxes and watching | Now a multiple choice: which one example fixes it ("Fun games online" makes a tie) |
| 2.2 `weather-model` | Labels were guesses ("muggy") rather than what happened; the hint pushed "a bit humid" towards rain | Each day says what really happened ("…: it rained"); hint points at that |
| 2.2 `overfitting` | "Grass means dog" is shortcut learning, not memorising | A memorising example: the exact photos, so a dog from a new angle fools it |
| 2.1 `helpful-or-problem` | "Lots more of the same spam" was debatable | Replaced with unchecked, rushed labels |
| 2.1 `words-that-vote` | "Very short words" was vague | "Words shorter than 3 letters (a, at, is, go)"; and only the exact same word counts ("game" isn't "games") |
| 2.2 `forty-photos` | `accuracy` glossary mark on a card whose answer is the accuracy | Removed |
| 2.1 `which-example-fixes-it`, `fix-the-data` | Hints nearly gave the answer | Point at the method |
| 2.2 `cloudy-dry` | Watching the test while changing data contradicts the fair-test rule | Explanation and recap: real teams then check on fresh test days |

**Second audit (after those fixes):** 26 of 26 for an expert-ish player, but it named the likely
slips for a 12-year-old: `count-the-votes` (counting "at"), `which-is-better` (75% vs 76%),
`more-or-better` (Spanish spam only) and the quiz's `q-homework`, each with a nudge or hint that
recovers (the quiz has none, by design). Further fixes:

| Where | Issue | Fix |
|---|---|---|
| Quiz `q-homework` | Relied on "game" ≠ "games", which wasn't taught | Now taught in `words-that-vote` |
| 2.3 `slang-checker` | A second solution (drop r3, add x2) contradicted the nudge | x2 is now "Go away, you are rude", which can't rescue the third test |
| 2.2 `cloudy-dry` | Only one real choice; the nudge named the answer | A tempting third day ("Cloudy, damp night: no rain") that breaks another test; nudge points at the method |
| 2.3 `accents` | "Check each group's score" came only after this card | Taught in `finding-and-fixing` |
| 2.2 `fair-or-unfair` | "Changing it until it scores 100%" was ambiguous | "Changing the test…" |
| 2.3 `problem-and-fix` | Checking a score finds a problem, it doesn't fix it | "best next step" |
| 2.1 `noisy-label` | The nudge said where to look | Points at the method |
| Quiz | Mostly recall | New `q-compare`: 18 of 24 vs 15 of 20 (both 75%) |

## Module 3: How Chatbots Think (Pro; teaser: 3.1 `hungry-horse`)
All chances are written for a small imaginary model (said on the second card of 3.1); they show
how next-token prediction works, not any real model's numbers.

### 3.1 Next-Word Machines (`next-word-machines`)
**Goals:** a language model predicts the next token from patterns in huge amounts of text; it
gives every possible token a chance, picks one, adds it, repeats; chances mean "how often"; tokens
are words or parts of words; it picks what usually comes next, not what's true.

**Key claims:** "I could eat a horse" is a common saying, so it outranks sensible foods. 70% of
200 = 140; 30% of 50 = 15. Common short words are usually one token; a long, rarer word like
"unbelievably" is usually split (the exact pieces depend on the tokenizer). "The Eiffel Tower is
in Paris" comes from the words appearing together; some chatbot apps can also search the web.

**Simplifications:** the model is described as choosing one token at a time from chances; how
those chances are computed (and that models can carry information ahead across tokens) is left
out. Chatbots are also trained further, after the text, to answer helpfully; that isn't covered.

### 3.2 Temperature (`temperature`)
**Goals:** temperature reshapes the chances (low: predictable; high: surprising, more nonsense);
the order never changes; which jobs suit which; it never makes answers more correct.

**Key claims (formula p^(1/T), rescaled):** "mat" 60% at 1, 84.7% at 0.5, 99.5% at 0.2, 42.3%
at 2.0; "sofa" reaches 24% from 1.8 (it can never get much past 25%). Most chatbot apps set the
temperature for you; some tools let you change it.

**Simplifications:** real apps combine temperature with other sampling settings; only temperature
is taught.

### 3.3 Made-Up Answers (`made-up-answers`)
**Goals:** hallucinations (fluent, confident, false) come from picking likely-sounding tokens;
they hide in names, dates, numbers, quotes and sources; check in a trusted source; asking the
chatbot again doesn't check anything; the context window limits how much of a chat it can see.

**Key claims:** nobody has walked on Mars (as of October 2026). The book "Fire Below" and
"Dr Helen Marsh" are fictional, made up for the example. Chatbots can invent sources. A new chat
usually starts with an empty context window unless the app has a memory feature. Medicine
questions go to a doctor, pharmacist or trusted adult.

**Simplifications:** the Mars model is a small imaginary one trained on space stories; the card
says bigger chatbots usually get this right, and the risk is highest for things they've seen less.

### Module 3 quiz (`how-chatbots-think-quiz`)
Eight core questions: which temperature makes "go" likeliest (0.2), 30% of 300 = 90,
"raining cats and dogs", low or high temperature jobs, why hallucinations happen, the token loop,
checking a source, and the five words.

## Beginner audit: Module 3 (1 October 2026)

A fresh agent played module 3 as a 12-year-old who had finished modules 1 and 2, committing
before reading the key and checking every number against p^(1/T). Result: 24 of 26 right first
try, no hints; both misses (`even-it-out`, `get-sofa`) were recovered by their nudges, but were
caused by an app bug, now fixed.

| Where | Issue | Fix |
|---|---|---|
| `next_word` card (code) | **Bug:** bars rounded to whole percents but goals are checked to 0.1%, so "45%" showed for 45.5% and Check failed | Bars show one decimal ("45.5%"), the exact precision of the check (`percent`, tested) |
| 3.2 `get-sofa` | 25% was a knife-edge (sofa never gets much past 25%) | Goal is now 24% (passes from about 1.9) |
| 3.2 slider cards, quiz `q-ready-set` | Live bars make sliders "wiggle until it looks right" | New prediction card before the second slider (`which-go-up`: every word but "mat" rises); the quiz slider is now a prediction (`q-coldest`) |
| 3.2 `make-it-predictable` | `temperature` glossary mark gave the direction away | Removed |
| 3.3 `mars-walk` | Three believable story words with chances hidden | The prompt says the heroes are usually "Captain" something; the contrast is now true ("nobody") vs story |
| 3.1 `guess-the-next-word`, `one-token-at-a-time`, recap | Overstated: real chatbots get extra training to answer helpfully | Says so; still one likely token at a time, and likely isn't checked |
| 3.1 `guess-the-next-word` | Modules 1-2 taught labels; language models learn from unlabelled text | "The real next word in the text is the answer it learns from" |
| 3.2 `same-question-twice` | The 4 comes from the model being certain, not temperature | Reworded |
| 3.3 `context-window`, `long-chat` | Stated as definite; modern windows are large and apps vary | "Can fall out of the window, or get less attention"; the right choice says "may have lost track" |
| 3.3 `problem-and-check` | "Doctor or pharmacist" only appeared in an explanation | Now taught in `check-it` |
| Quiz `q-why-hallucinate` | Weak wrong options | "Temperature too low" and "context window too small" |

**Second audit (after the rounding fix):** 26 of 27 right first try, so the content was still too
easy. The one miss (`which-go-up`, "only moon") was recovered by its nudge. Changes:

| Where | Issue | Fix |
|---|---|---|
| 3.1 (new) `rocket-cat` | Nothing tested "read all the text so far" | Hidden-chance pick: "Inside the rocket, the cat sat on the" (seat, not mat) |
| 3.2 (new) `fifty-fifty`, replacing `hotter-smarter` | Temperature cards could be done by dragging until the bar looks right | Predict: two words at 50% stay 50% at any temperature (no gap to stretch); "never more correct" moves to its explanation and the recap |
| 3.3 (new) `link-works` | "Check it says what the chatbot claims" was only in an explainer | Scenario: the link is real, but the page says 1912, not 1915 |
| 3.3 `mars-walk` | The answer was in the prompt; odd distractors | The story-model fact is in the `hallucination` explainer; distractors "Neil" (the Moon, not Mars), "nobody" (true), "an" |
| 3.2 `get-sofa` | Explanation said "about 2" (it's 1.8); the prompt hinted the direction | Fixed; default slider; no direction clue |
| Quiz `q-coldest` | Its numbers couldn't be worked out from one chance | Lists all four chances |
| Quiz `q-loop` | A word-for-word copy of the lesson card | Adds a fifth step, "Start again with the longer text" |
| 3.1 `hungry-horse`, `split-tokens` | Hints nearly named the answer | Point at the method |
| Glossary `training-data` | Said every example has a label (language models learn without) | "usually each with a label" |

## Module 4: Talking to AI (Pro; teaser: 4.1 `vague-or-clear`)

### 4.1 Writing Good Prompts (`writing-good-prompts`)
**Goals:** a prompt works best when it says the goal, the context and the format; specific beats
long or polite; say what was wrong when an answer misses; paste in what you have, never private
details; a better prompt gets a better-aimed answer, not a checked one.

**Key claims:** an octopus has one central brain plus a cluster of nerve cells in each of its 8
arms (the popular "nine brains"). Chats may be stored.

**Simplifications:** prompting advice is general good practice, not tied to any product.

### 4.2 Checking AI's Work (`checking-ais-work`)
**Goals:** check facts and dates in a trusted source, open and read sources, do the maths, and be
careful with news (a model learned up to a certain date unless it can search the web); asking the
chatbot "is that right?" doesn't check anything; use AI to learn, not to do your work, and follow
school rules.

**Key claims:** the Moon is about 384,000 km from Earth on average (the chatbot's 38,000 is
wrong); about 3 days by spacecraft. 3 × 24 = 72; 15% of 80 = 12. Schools' AI rules vary.

### 4.3 AI Tools Today (`ai-tools-today`), `lastChecked: 2026-10-01`
The only lesson that names real products. Named neutrally, in A to Z order, with no ranking:
ChatGPT (OpenAI), Claude (Anthropic), Copilot (Microsoft) and Gemini (Google). No card tests a
brand name. Anthropic, which makes Claude, also made the model that drafted this course; the
lesson treats all four the same, and the age-rules card names none of them (one app may say 18+,
another 13+ with a parent's OK, and so on).

**Age rules (checked 1 October 2026):**
- Claude: Anthropic's Consumer Terms say "You must be at least 18 years old or the minimum age
  required to consent to use the Services in your location, whichever is higher." (Quoted.)
- Gemini: Google's Gemini Apps help says a parent who manages a child's account with Family Link
  can turn off Gemini Apps for under-13s (so younger children can have access, controlled by a
  parent). The lesson says "some let a parent switch on access for younger children (or turn it
  off)".
- ChatGPT and Copilot: their terms pages couldn't be read automatically (blocked), so the lesson
  makes **no** age claim about them; it says "some other apps allow teenagers". **Check these two
  by hand before publishing.**

**Recheck by 1 January 2027, then every 3 months:**
- The four names, their makers, and that each is still widely used (add or remove neutrally).
- "Many can also read files, search the web, or make pictures."
- Claude's age rule, Gemini's Family Link rule, and the general "some allow teenagers" line.
- The "AI you already use" examples, and that much of it can be switched off.

### Module 4 quiz (`talking-to-ai-quiz`)
Seven core questions: vague or clear prompts, the missing parts of a prompt, 15% of 80, a linked
page that says 18 (and the chatbot's "sorry, it's 17"), learning vs doing your work, knowledge up to
a date, and sorting bits of prompts into goal, context and format.

### Beginner audit: Module 4 (1 October 2026)
First audit: 24 of 24 right first try, so too easy; facts all checked correct. Changes:

| Where | Issue | Fix |
|---|---|---|
| 4.2 `moon-distance`, `confident-paragraph` | The bolded 38,000 km and "a factor of ten" pointed at the error | No bold; the hook says "badly wrong" |
| 4.3 `kind-of-tool`, `school-or-ask` | Nudges listed the answers | Point at the method |
| 4.3 `rules-and-ages` | Only Claude was named, as the restrictive one: uneven | No product named; one app 18+, another 13+ with a parent's OK, some parent-controlled for younger children |
| 4.3 `why-dated` | A free point labelled challenge | Now core; new challenge `always-true` (true of every chat assistant, or only some: search, pictures, today's news, never wrong) |
| 4.2 (new) `hours-in-a-year` | Checking maths was too easy (62 vs 72) | The chatbot says 8,670; really 24 × 365 = 8,760 (swapped digits look right) |
| 4.1 (new) `goal-context-format`, quiz `q-parts` | Prompt parts were only word-matched | Sort bits of prompts into goal, context and format; context and format blur |
| Quiz `q-link` | One step | Second step: the chatbot "corrects" itself to 17; the page says 18 |
| 4.1 `whats-missing`, 4.2 `latest-phone`, `friends-essay`, 4.3 `best-ai`, quiz `q-missing`, `q-latest` | Silly wrong options | Tempting ones ("lots of detail", "mixing up two models", "its context window forgot", "just change some words", "use the newest version") |
| 4.1 `vague-or-clear` | "Explain photosynthesis in 3 sentences" has no context | Prompt asks "what it wants and what shape" |
| 4.2 `claim-and-check` | A news site is also a trusted source | Date row: "a textbook or museum site" |
| 4.2 `honesty` | "Most schools" unverified | "Many schools" |

**Second and third audits** (the third read every card with the answers stripped out first):
24 of 24, then 31 of 31. The second found the real tell: **the right multiple-choice answer was
the longest option, and (since options aren't shuffled) usually the first**, across the whole
course. Fixes, course-wide:
- Every multiple-choice card in How AI Really Works now has its right answer at a position spread
  by card id (first/second/third/fourth: 7/7/8/6 of 28), and `load.test.ts` fails if more than 40%
  of the course's multiple-choice answers come first.
- Wrong options made as long, specific and tempting as the right one on the worst cards: 2.1
  `which-example-fixes-it` ("Pizza night at my place tonight" makes a tie), 2.2 `too-good`, 3.1
  `how-it-knows`, 3.3 `best-check` ("ask a different chatbot"), 3 quiz `q-why-hallucinate`, and in
  module 4 `whats-missing` ("ask it to check its facts first"), `boring-list` ("You are a shark
  expert…"), `latest-phone`, `why-dated`, `q-missing`, `q-latest`.
- Smaller fixes: `boring-list` explanation no longer says "the first"; voice assistants, image
  generators and translation apps are introduced before `kind-of-tool`; `learn-or-do` nudge
  general; quiz `q-link` says what you told the chatbot.

Note: the auditor is itself a strong AI model told to play a 12-year-old, so its first-try score
overstates a real beginner's. Its near-misses (`hours-in-a-year` mental maths, `kind-of-tool`,
`school-or-ask`, `boring-list`) are the likely real slips.

## Beginner audit: How AI Really Works module 1 and Deepfake Scams (1 October 2026)

**Method:** as for the other courses. A fresh agent played the four module 1 cards sets and the
deepfake lesson in order as a 12-year-old with no AI or online-safety knowledge, seeing only the
on-screen text, and committed to each answer before reading the key.

**Result:** 28 graded cards, 27 right first try, no hints. No teach-before-test failures; tone
calm and never blaming; nothing teaches making a scam or a deepfake; the nearest-neighbour results
match the explanations.

| Where | Issue | Fix |
|---|---|---|
| Deepfake `fake-steps` | The order (don't share, evidence, tell, report) was debatable: telling an adult first is also right | Replaced with a do / don't sort (`do-or-dont`), which also covers not paying and not saving the image |
| Deepfake `if-its-you` | "Threatening you" was broader than what the ACCCE handles | "Threatening to share it, or asking you for sexual images or money" |
| Deepfake `if-its-you` | "You won't be in trouble" was an absolute promise | "You won't be in trouble for asking for help"; adds "Don't pay or send anything they ask for" |
| Quiz `q-rules-or-learning` | "A voice assistant understanding speech" contradicted "AI doesn't understand"; the shop item was vague | "Turning your speech into text" (now also in the 1.1 hook) and "An online shop's 'you might like' list" |
| Quiz `q-sports-balls` | A one-try labelling card where the names give the labels: a reading test | Now a "choose the data" card: add the small basketball so every test ball is right |
| 1.2 `three-fruits` | "Green apple" on a red-to-yellow axis | "Red-and-yellow apple" |
| 1.2 `label-the-fruit` | How the model guesses wasn't said before its guesses appeared | `examples-labels-models` now says it finds the example closest to each new fruit |
| 1.2 `model-accuracy` | The hint (9 of 12 is 3 of 4) nearly gave the answer | Points at the method instead |
| 1.3 `a-guess-not-a-fact`, `homework-helper`, quiz `q-check-it` | "It doesn't check its answers" was too absolute: some chatbots search the web | "Even when it searches the web, it can't be sure its answer is right" |
| 1.1 `what-it-learned-from` | Face unlock's model is trained on many faces | Kept, recorded as a simplification above |

**Also found while testing (app bug, not content):** a newcomer who followed a link straight to a
lesson that isn't first got the Path gate after their first card, because their own progress in
that lesson counted. `deepLinkGate` now ignores progress in the lesson being played
(`hasProgressOutside`).
