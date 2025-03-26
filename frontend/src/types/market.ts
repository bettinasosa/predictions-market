import { z } from "zod"

export const MarketSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  endDate: z.date(),
  createdBy: z.string(),
  totalLiquidity: z.number(),
  yesPrice: z.number(),
  noPrice: z.number(),
  status: z.enum(["ACTIVE", "RESOLVED", "CANCELLED"]),
  resolution: z.enum(["YES", "NO", "UNRESOLVED"]).optional(),
  createdAt: z.date()
})

export type Market = z.infer<typeof MarketSchema>

export const CreateMarketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  endDate: z.date(),
  initialLiquidity: z.number().min(0)
})

export type CreateMarketInput = z.infer<typeof CreateMarketSchema>
