/**
 * One sample of every card type (plus variants), for the dev-only /dev/cards playground.
 * Not course content: nothing here appears on the home page. Uses only documentation-safe
 * addresses (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, private ranges) and example.com.
 */
import { type Card, CardSchema } from "@/cards/schema";

const raw: unknown[] = [
  {
    id: "sample-explainer",
    type: "explainer",
    difficulty: "core",
    title: "Explainer card",
    body: "Explainers teach one idea with **markdown**, `inline code` and an optional illustration.",
    image: {
      src: "/illustrations/ipv4-octets.svg",
      alt: "The address 192.168.1.10 split into four boxes, each labelled 8 bits.",
      width: 640,
      height: 200,
    },
  },
  {
    id: "sample-multiple-choice",
    type: "multiple_choice",
    difficulty: "core",
    prompt: "Which of these is a **private** IPv4 address?",
    options: [
      { id: "private", text: "192.168.0.20" },
      { id: "doc-a", text: "203.0.113.20" },
      { id: "doc-b", text: "198.51.100.20" },
    ],
    correctOptionId: "private",
    explanation: "Addresses starting `192.168.` are in a private range reserved for home and office networks.",
  },
  {
    id: "sample-drag-to-order",
    type: "drag_to_order",
    difficulty: "core",
    prompt: "Put the steps of loading a web page in order.",
    items: [
      { id: "dns", label: "Look up the name with DNS" },
      { id: "connect", label: "Connect to the server" },
      { id: "request", label: "Send the request" },
      { id: "render", label: "Show the page" },
    ],
    explanation: "The browser needs the server's address (DNS) before it can connect and ask for the page.",
  },
  {
    id: "sample-binary-toggle",
    type: "binary_toggle",
    difficulty: "core",
    prompt: "Make **170**.",
    target: 170,
    explanation: "170 = 128 + 32 + 8 + 2, which is `10101010`.",
  },
  {
    id: "sample-numeric-binary",
    type: "numeric_input",
    difficulty: "core",
    prompt: "Write **13** in binary.",
    hint: "13 = 8 + 4 + 1.",
    base: "binary",
    answer: 13,
    explanation: "8 + 4 + 1 = 13, so the 8, 4 and 1 bits are on: `1101`.",
  },
  {
    id: "sample-numeric-hex",
    type: "numeric_input",
    difficulty: "challenge",
    prompt: "What is **255** in hexadecimal?",
    base: "hex",
    answer: 255,
    explanation: "255 = 15 × 16 + 15, and 15 is F in hex, so 255 is `FF`.",
  },
  {
    id: "sample-numeric-decimal",
    type: "numeric_input",
    difficulty: "core",
    prompt: "How many different values can one byte hold?",
    base: "decimal",
    answer: 256,
    unit: "values",
    explanation: "8 bits give 2⁸ = 256 patterns (0 to 255).",
  },
  {
    id: "sample-match-pairs",
    type: "match_pairs",
    difficulty: "challenge",
    prompt: "Match each service to the port it usually listens on.",
    pairs: [
      { id: "http", left: "Web (HTTP)", right: "`80`" },
      { id: "https", left: "Secure web (HTTPS)", right: "`443`" },
      { id: "dns", left: "DNS", right: "`53`" },
      { id: "ssh", left: "Remote login (SSH)", right: "`22`" },
    ],
    explanation: "These are the well-known default ports. Services can be configured to use others.",
  },
  {
    id: "sample-packet-path",
    type: "packet_path",
    difficulty: "core",
    prompt: "Get the packet from the **laptop** to the **web server**. ISP router B is down for maintenance, so avoid it.",
    nodes: [
      { id: "laptop", kind: "device", label: "Laptop", address: "192.168.1.20", col: 0, row: 0 },
      { id: "printer", kind: "device", label: "Printer", address: "192.168.1.30", col: 1, row: 1 },
      { id: "home", kind: "router", label: "Home router", address: "192.168.1.1", col: 1, row: 0 },
      { id: "isp-a", kind: "router", label: "ISP router A", address: "203.0.113.1", col: 2, row: 0 },
      { id: "isp-b", kind: "router", label: "ISP router B (down)", address: "203.0.113.2", col: 2, row: 1 },
      { id: "server", kind: "server", label: "Web server", address: "198.51.100.7", col: 3, row: 0 },
    ],
    links: [
      { from: "laptop", to: "home" },
      { from: "home", to: "printer" },
      { from: "home", to: "isp-a" },
      { from: "home", to: "isp-b" },
      { from: "isp-a", to: "server" },
      { from: "isp-b", to: "server" },
    ],
    source: "laptop",
    destination: "server",
    validPaths: [["laptop", "home", "isp-a", "server"]],
    explanation: "Router B is down, so the only working route is through ISP router A. The printer is a dead end.",
  },
  {
    id: "sample-terminal-command",
    type: "terminal",
    difficulty: "core",
    prompt: "Use `nslookup` to find the IP address of **example.com**.",
    intro: "Simulated Linux shell. Type help to list commands.",
    commands: [
      {
        command: "nslookup example.com",
        aliases: ["nslookup www.example.com"],
        description: "Ask DNS for example.com's address",
        output:
          "Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\nNon-authoritative answer:\nName:\texample.com\nAddress: 203.0.113.10",
      },
      {
        command: "hostname",
        description: "Show this computer's name",
        output: "learner-laptop",
      },
    ],
    success: { type: "ran_command", command: "nslookup example.com" },
    explanation: "`nslookup` asks a DNS server which IP address belongs to a name.",
  },
  {
    id: "sample-terminal-answer",
    type: "terminal",
    difficulty: "core",
    prompt: "Run `ping -c 2 example.com`, then read the IP address from the output.",
    commands: [
      {
        command: "ping -c 2 example.com",
        description: "Send 2 test packets to example.com",
        output:
          "PING example.com (203.0.113.10) 56(84) bytes of data.\n64 bytes from 203.0.113.10: icmp_seq=1 ttl=56 time=11.8 ms\n64 bytes from 203.0.113.10: icmp_seq=2 ttl=56 time=12.1 ms\n\n--- example.com ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms",
      },
    ],
    success: { type: "answer", question: "Which IP address replied?", accepted: ["203.0.113.10"] },
    explanation: "Each reply line says who answered: `64 bytes from 203.0.113.10`.",
  },
];

/** Validated samples. Throws on import if any sample breaks its schema. */
export const CARD_SAMPLES: Card[] = raw.map((c) => CardSchema.parse(c));
