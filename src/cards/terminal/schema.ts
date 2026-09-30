import { z } from "zod";
import { interactiveCardBase, nonEmpty } from "../base";

/** Commands every terminal card provides itself. Card data can't redefine them. */
export const BUILT_IN_COMMANDS = ["help", "clear", "cls"] as const;

const TerminalCommand = z.object({
  /** Exactly what the learner types, e.g. "nslookup example.com". */
  command: nonEmpty.max(80),
  /** Other accepted spellings, e.g. "nslookup www.example.com". */
  aliases: z.array(nonEmpty.max(80)).optional(),
  /** Fixed text printed verbatim. Nothing is ever executed. */
  output: z.string(),
  /** One line shown by `help`. */
  description: nonEmpty.max(80).optional(),
});

const normalise = (s: string, caseSensitive: boolean) => {
  const collapsed = s.trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
};

export const TerminalCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("terminal"),
    /** Text before the cursor. Keep it realistic for the chosen OS. */
    promptLabel: nonEmpty.max(40).default("learner@cybernet:~$"),
    /** Welcome text printed before the first prompt. */
    intro: z.string().optional(),
    commands: z.array(TerminalCommand).min(1, "needs at least 1 command").max(12, "allows at most 12 commands"),
    /** Whether typed commands must match letter case. Off by default (friendlier for beginners). */
    caseSensitive: z.boolean().default(false),
    success: z.discriminatedUnion("type", [
      /** Correct once the learner has run this command (or one of its aliases). */
      z.object({ type: z.literal("ran_command"), command: nonEmpty }),
      /** Correct when the learner types an accepted answer, read from command output. */
      z.object({
        type: z.literal("answer"),
        question: nonEmpty,
        accepted: z.array(nonEmpty).min(1, "needs at least 1 accepted answer"),
      }),
    ]),
  })
  .superRefine((card, ctx) => {
    const seen = new Map<string, number>();
    card.commands.forEach((c, i) => {
      for (const spelling of [c.command, ...(c.aliases ?? [])]) {
        const key = normalise(spelling, card.caseSensitive);
        if ((BUILT_IN_COMMANDS as readonly string[]).includes(key.toLowerCase())) {
          ctx.addIssue({ code: "custom", message: `"${spelling}" is a built-in command`, path: ["commands", i] });
        }
        if (seen.has(key)) {
          ctx.addIssue({ code: "custom", message: `"${spelling}" is defined twice`, path: ["commands", i] });
        }
        seen.set(key, i);
      }
    });
    if (card.success.type === "ran_command" && !seen.has(normalise(card.success.command, card.caseSensitive))) {
      ctx.addIssue({
        code: "custom",
        message: "success.command must be one of the card's commands or aliases",
        path: ["success", "command"],
      });
    }
  });

export type TerminalCard = z.infer<typeof TerminalCardSchema>;
export type TerminalCommand = TerminalCard["commands"][number];
export interface TerminalAnswer {
  /** Every line the learner entered, in order (the screen is rebuilt from this). */
  history: string[];
  /** Typed answer, for `success.type === "answer"`. */
  response: string;
}
