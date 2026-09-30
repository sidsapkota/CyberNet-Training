import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

export const NetworkNodeKind = z.enum(["device", "router", "switch", "server", "internet"]);
export type NetworkNodeKind = z.infer<typeof NetworkNodeKind>;

/** Grid size limit: small networks that fit a phone without panning or zooming. */
export const GRID_MAX = 4;

const NetworkNode = z.object({
  id: CardId,
  kind: NetworkNodeKind,
  /** Short name shown under the node, e.g. "Laptop", "Home router". */
  label: nonEmpty.max(24),
  /** Optional technical detail shown in mono, e.g. "192.168.1.10" or "203.0.113.5". */
  address: nonEmpty.max(15).optional(),
  /** Position on a small grid (0-based). Narrow screens may rotate the layout to fit. */
  col: z.number().int().min(0).max(GRID_MAX - 1),
  row: z.number().int().min(0).max(GRID_MAX - 1),
  /** Broken (e.g. a router that's down): drawn dashed with a cross, links dashed. Never on a valid path. */
  down: z.boolean().optional(),
});

export const PacketPathCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("packet_path"),
    nodes: z.array(NetworkNode).min(2, "needs at least 2 nodes").max(8, "allows at most 8 nodes"),
    /** Undirected cables/connections between nodes. */
    links: z.array(z.object({ from: CardId, to: CardId })).min(1, "needs at least 1 link"),
    source: CardId,
    destination: CardId,
    /** Every acceptable route, each as node ids from source to destination. */
    validPaths: z.array(z.array(CardId).min(2)).min(1, "needs at least 1 valid path"),
  })
  .superRefine((card, ctx) => {
    const ids = new Set<string>();
    const cells = new Set<string>();
    card.nodes.forEach((n, i) => {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${n.id}"`, path: ["nodes", i, "id"] });
      ids.add(n.id);
      const cell = `${n.col},${n.row}`;
      if (cells.has(cell)) {
        ctx.addIssue({ code: "custom", message: `two nodes share grid cell col ${n.col}, row ${n.row}`, path: ["nodes", i] });
      }
      cells.add(cell);
    });

    const linkKeys = new Set<string>();
    card.links.forEach((l, i) => {
      for (const end of ["from", "to"] as const) {
        if (!ids.has(l[end])) {
          ctx.addIssue({ code: "custom", message: `link refers to unknown node "${l[end]}"`, path: ["links", i, end] });
        }
      }
      if (l.from === l.to) ctx.addIssue({ code: "custom", message: "a node can't link to itself", path: ["links", i] });
      const key = [l.from, l.to].sort().join("|");
      if (linkKeys.has(key)) ctx.addIssue({ code: "custom", message: "duplicate link", path: ["links", i] });
      linkKeys.add(key);
    });

    for (const end of ["source", "destination"] as const) {
      if (!ids.has(card[end])) ctx.addIssue({ code: "custom", message: `${end} must be a node id`, path: [end] });
    }
    if (card.source === card.destination) {
      ctx.addIssue({ code: "custom", message: "source and destination must differ", path: ["destination"] });
    }

    const downIds = new Set(card.nodes.filter((n) => n.down).map((n) => n.id));
    for (const end of ["source", "destination"] as const) {
      if (downIds.has(card[end])) ctx.addIssue({ code: "custom", message: `the ${end} can't be down`, path: [end] });
    }
    card.validPaths.forEach((path, i) => {
      if (path.some((id) => downIds.has(id))) {
        ctx.addIssue({ code: "custom", message: "a valid path can't go through a node that's down", path: ["validPaths", i] });
      }
    });

    const seenPaths = new Set<string>();
    card.validPaths.forEach((path, i) => {
      const where = ["validPaths", i];
      if (path[0] !== card.source) ctx.addIssue({ code: "custom", message: "path must start at the source", path: where });
      if (path.at(-1) !== card.destination) {
        ctx.addIssue({ code: "custom", message: "path must end at the destination", path: where });
      }
      if (new Set(path).size !== path.length) ctx.addIssue({ code: "custom", message: "path repeats a node", path: where });
      for (let h = 1; h < path.length; h++) {
        const key = [path[h - 1], path[h]].sort().join("|");
        if (!linkKeys.has(key)) {
          ctx.addIssue({ code: "custom", message: `no link between "${path[h - 1]}" and "${path[h]}"`, path: where });
        }
      }
      const joined = path.join(">");
      if (seenPaths.has(joined)) ctx.addIssue({ code: "custom", message: "duplicate valid path", path: where });
      seenPaths.add(joined);
    });
  });

export type PacketPathCard = z.infer<typeof PacketPathCardSchema>;
export type NetworkNode = PacketPathCard["nodes"][number];
/** Node ids in the order the learner chose, always starting with the source. */
export type PacketPathAnswer = string[];
