import { z } from "zod"

export const MetricEnum = z.enum(["points","assists","rebounds","minutes"])
export const EntityEnum = z.enum(["players","teams"])

export const QuerySpec = z.object({
  entity: EntityEnum.default("players"),
  metric: MetricEnum.default("points"),
  filters: z.object({
    name: z.string().optional(),
    team: z.string().optional(),
    position: z.string().optional(),
    dateFrom: z.string().optional(), // ISO
    dateTo: z.string().optional(),
    lastNGames: z.number().int().min(1).max(30).optional(),
    minGames: z.number().int().min(1).max(82).optional(),
  }).default({}),
  sort: z.object({
    field: MetricEnum.default("points"),
    dir: z.enum(["asc","desc"]).default("desc"),
  }).default({ field: "points", dir: "desc" }),
  limit: z.number().int().min(1).max(20).default(5),
})

export type QuerySpec = z.infer<typeof QuerySpec>
