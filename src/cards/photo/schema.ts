import { z } from "zod";
import { cardBase, nonEmpty } from "../base";

/**
 * Licences a photo may have: public domain, CC0, CC BY or CC BY-SA. Never NonCommercial (NC) or
 * NoDerivatives (ND). Photos are stored unmodified in /public/photos.
 */
export const PHOTO_LICENCES = [
  "Public domain",
  "CC0",
  "CC BY 2.0",
  "CC BY 3.0",
  "CC BY 4.0",
  "CC BY-SA 2.0",
  "CC BY-SA 3.0",
  "CC BY-SA 4.0",
] as const;

/**
 * A real photo next to a diagram ("Here's the inside of a real smartphone"), with its credit.
 * Read-only, like an explainer. The caption may name the device model; it must never suggest
 * we're affiliated with or endorsed by its maker (the Terms say product names belong to their
 * owners). Every field of `credit` is required, so a photo without credit or licence fails the
 * content check.
 */
export const PhotoCardSchema = z.object({
  ...cardBase,
  type: z.literal("photo"),
  title: nonEmpty.max(80),
  photo: z.object({
    src: z.string().regex(/^\/photos\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/, "must be a file in /public/photos"),
    alt: nonEmpty.max(240),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  /** One or two sentences under the photo (markdown). */
  caption: nonEmpty.max(280),
  credit: z.object({
    author: nonEmpty.max(120),
    licence: z.enum(PHOTO_LICENCES),
    licenceUrl: z.string().url(),
    /** Where the photo came from: its Wikimedia Commons file page. */
    sourceUrl: z.string().url().startsWith("https://commons.wikimedia.org/wiki/File:", "must be a Wikimedia Commons file page"),
    /** The device shown, if known (e.g. "Framework Laptop 13 (2023)"). */
    device: nonEmpty.max(80).optional(),
  }),
});

export type PhotoCard = z.infer<typeof PhotoCardSchema>;
