import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import StatLine from "@/lib/models/statline"
import Game from "@/lib/models/game"
import mongoose from "mongoose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const playerId = new mongoose.Types.ObjectId(params.id)

  // join Game to get dates, sort by date
  const rows = await (StatLine as any).aggregate([
    { $match: { playerId } },
    { $lookup: { from: "games", localField: "gameId", foreignField: "_id", as: "game" } },
    { $unwind: "$game" },
    { $project: { date: "$game.date", points: 1, assists: 1, rebounds: 1, minutes: 1 } },
    { $sort: { date: 1 } }
  ])

  // map to frontend-friendly shape
  const series = rows.map((r: any) => ({
    date: r.date,
    points: r.points ?? 0,
    assists: r.assists ?? 0,
    rebounds: r.rebounds ?? 0,
    minutes: r.minutes ?? 0,
  }))
  return NextResponse.json({ series })
}
