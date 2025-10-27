// src/app/api/players/[id]/timeseries/route.ts
import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import StatLine from "@/lib/models/statline"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: any) {
  await connectDB()

  // In Next 15, ctx.params can be a Promise. Normalize it:
  const rawParams = ctx?.params?.then ? await ctx.params : ctx?.params
  const playerIdStr: string = rawParams?.id
  if (!playerIdStr) {
    return NextResponse.json({ error: "Missing player id" }, { status: 400 })
  }

  const playerId = new mongoose.Types.ObjectId(playerIdStr)

  const rows = await (StatLine as any).aggregate([
    { $match: { playerId } },
    { $lookup: { from: "games", localField: "gameId", foreignField: "_id", as: "game" } },
    { $unwind: "$game" },
    { $project: { date: "$game.date", points: 1, assists: 1, rebounds: 1, minutes: 1 } },
    { $sort: { date: 1 } }
  ])

  const series = rows.map((r: any) => ({
    date: r.date,
    points: r.points ?? 0,
    assists: r.assists ?? 0,
    rebounds: r.rebounds ?? 0,
    minutes: r.minutes ?? 0,
  }))

  return NextResponse.json({ series })
}
