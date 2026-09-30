import { describe, expect, it } from "vitest";
import { packetPath } from "@/test/fixtures";
import {
  areLinked,
  canAddHop,
  describePacketPathAnswer,
  describePacketPathCorrect,
  firstWrongHop,
  gradePacketPath,
  isPacketPathReady,
  layoutNetwork,
  tapNode,
} from "./grade";
import { PacketPathCardSchema } from "./schema";

const card = packetPath();

describe("graph helpers", () => {
  it("treats links as undirected", () => {
    expect(areLinked(card, "laptop", "home")).toBe(true);
    expect(areLinked(card, "home", "laptop")).toBe(true);
    expect(areLinked(card, "laptop", "server")).toBe(false);
  });

  it("only allows unvisited neighbours of the last hop", () => {
    expect(canAddHop(card, ["laptop"], "home")).toBe(true);
    expect(canAddHop(card, ["laptop"], "a")).toBe(false); // not linked to laptop
    expect(canAddHop(card, ["laptop", "home"], "laptop")).toBe(false); // already visited
  });

  it("stops accepting hops once the destination is reached", () => {
    expect(canAddHop(card, ["laptop", "home", "a", "server"], "b")).toBe(false);
  });
});

describe("tapNode", () => {
  it("adds valid hops and ignores unreachable nodes", () => {
    expect(tapNode(card, ["laptop"], "home")).toEqual(["laptop", "home"]);
    expect(tapNode(card, ["laptop"], "server")).toEqual(["laptop"]);
  });

  it("undoes when the last hop is tapped, but never removes the source", () => {
    expect(tapNode(card, ["laptop", "home"], "home")).toEqual(["laptop"]);
    expect(tapNode(card, ["laptop"], "laptop")).toEqual(["laptop"]);
  });
});

describe("gradePacketPath", () => {
  it("accepts any of the valid paths", () => {
    expect(gradePacketPath(card, ["laptop", "home", "a", "server"])).toEqual({ correct: true });
    expect(gradePacketPath(card, ["laptop", "home", "b", "server"])).toEqual({ correct: true });
  });

  it("rejects routes that aren't listed, including prefixes", () => {
    expect(gradePacketPath(card, ["laptop", "home", "printer"])).toEqual({ correct: false });
    expect(gradePacketPath(card, ["laptop", "home", "a"])).toEqual({ correct: false });
  });

  it("only allows Check once the route ends at the destination", () => {
    expect(isPacketPathReady(["laptop", "home"], card)).toBe(false);
    expect(isPacketPathReady(["laptop", "home", "a", "server"], card)).toBe(true);
  });
});

describe("firstWrongHop", () => {
  it("is null for a correct route or a correct partial route", () => {
    expect(firstWrongHop(card, ["laptop", "home", "b", "server"])).toBeNull();
    expect(firstWrongHop(card, ["laptop", "home"])).toBeNull();
  });

  it("points at the first hop that leaves every valid path", () => {
    expect(firstWrongHop(card, ["laptop", "home", "printer"])).toBe(2);
  });

  it("flags a detour even if it rejoins later", () => {
    const detour = packetPath({
      links: [...card.links, { from: "a", to: "b" }],
    });
    expect(firstWrongHop(detour, ["laptop", "home", "a", "b", "server"])).toBe(3);
  });
});

describe("layoutNetwork", () => {
  it("keeps the authored grid on wide screens, trimmed to used cells", () => {
    const layout = layoutNetwork(card, false);
    expect(layout.cols).toBe(4);
    expect(layout.rows).toBe(2);
    expect(layout.nodes.find((n) => n.id === "server")).toEqual({ id: "server", col: 3, row: 0 });
  });

  it("rotates wide layouts on narrow screens so they fit a phone", () => {
    const layout = layoutNetwork(card, true);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(4);
    expect(layout.nodes.find((n) => n.id === "server")).toEqual({ id: "server", col: 0, row: 3 });
  });

  it("does not rotate layouts that are already tall", () => {
    const tall = packetPath({
      nodes: card.nodes.map((n) => ({ ...n, col: n.row, row: n.col })),
    });
    expect(layoutNetwork(tall, true).cols).toBe(2);
  });
});

describe("describe*", () => {
  it("uses node labels", () => {
    expect(describePacketPathAnswer(card, ["laptop", "home", "printer"])).toBe("Laptop → Home router → Printer");
    expect(describePacketPathCorrect(card)).toBe(
      "Laptop → Home router → Router A → Server  or  Laptop → Home router → Router B → Server",
    );
  });
});

describe("PacketPathCardSchema", () => {
  const messages = (c: unknown) => PacketPathCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("accepts the fixture", () => {
    expect(messages(card)).toEqual([]);
  });

  it("rejects links to unknown nodes, self-links and duplicates", () => {
    expect(messages(packetPath({ links: [...card.links, { from: "laptop", to: "ghost" }] }))).toContain(
      'link refers to unknown node "ghost"',
    );
    expect(messages(packetPath({ links: [...card.links, { from: "home", to: "home" }] }))).toContain(
      "a node can't link to itself",
    );
    expect(messages(packetPath({ links: [...card.links, { from: "home", to: "laptop" }] }))).toContain("duplicate link");
  });

  it("rejects valid paths that don't follow links or endpoints", () => {
    expect(messages(packetPath({ validPaths: [["laptop", "a", "server"]] }))).toContain('no link between "laptop" and "a"');
    expect(messages(packetPath({ validPaths: [["home", "a", "server"]] }))).toContain("path must start at the source");
    expect(messages(packetPath({ validPaths: [["laptop", "home", "a"]] }))).toContain("path must end at the destination");
  });

  it("rejects duplicate node ids, shared cells and more than 8 nodes", () => {
    expect(messages(packetPath({ nodes: [...card.nodes, { ...card.nodes[0]!, col: 3, row: 3 }] }))).toContain(
      'duplicate node id "laptop"',
    );
    expect(messages(packetPath({ nodes: [...card.nodes, { id: "x", kind: "device", label: "X", col: 0, row: 0 }] }))).toContain(
      "two nodes share grid cell col 0, row 0",
    );
    const nine = Array.from({ length: 9 }, (_, i) => ({
      id: `n${i}`,
      kind: "device" as const,
      label: `N${i}`,
      col: i % 4,
      row: Math.floor(i / 4),
    }));
    expect(messages(packetPath({ nodes: nine }))).toContain("allows at most 8 nodes");
  });

  it("rejects grid positions outside 4×4 and a destination equal to the source", () => {
    expect(PacketPathCardSchema.safeParse(packetPath({ nodes: [{ ...card.nodes[0]!, col: 4 }, ...card.nodes.slice(1)] })).success).toBe(false);
    expect(messages(packetPath({ destination: "laptop" }))).toContain("source and destination must differ");
  });
});
