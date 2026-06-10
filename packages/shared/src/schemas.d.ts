import { z } from "zod";
export declare const SOURCE: readonly ["email", "podcast", "youtube"];
export type Source = (typeof SOURCE)[number];
export declare const CreateItemSchema: any;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
