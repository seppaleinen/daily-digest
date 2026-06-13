import { z } from "zod";

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const SOURCE = ["email", "podcast", "youtube"] as const;
export type Source = (typeof SOURCE)[number];

export const CreateItemSchema = z.object({
  date: DateSchema,
  source: z.enum(SOURCE),
  category: z.string().min(1).max(50).default("general"),
  title: z.string().min(1).max(500),
  html: z.string(),
  sourceUrl: z.string(),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
