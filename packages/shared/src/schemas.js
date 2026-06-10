import { z } from "zod";
export const SOURCE = ["email", "podcast", "youtube"];
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const CreateItemSchema = z.object({
    date: DateSchema,
    source: z.enum(SOURCE),
    title: z.string().min(1).max(500),
    html: z.string(),
});
