import { z } from "zod";
import { portfolioSchema, snapshotSchema } from "./portfolio";
export const sharedSchema = z.object({ revision: z.number().int().nonnegative(), portfolio: portfolioSchema.nullable(), updatedAt: z.string().datetime({ offset: true }).nullable() });
export const saveSharedSchema = z.object({ revision: z.number().int().nonnegative(), portfolio: portfolioSchema });
export const appendSnapshotSchema = z.object({ revision: z.number().int().nonnegative(), snapshot: snapshotSchema });
export type SharedPortfolio = z.infer<typeof sharedSchema>;
