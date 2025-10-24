import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Player from "@/lib/models/player"
import Team from "@/lib/models/team"
import StatLine from "@/lib/models/statline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const q = searchParams.get("q")?.trim() || ""
    const team = searchParams.get("team")?.trim() || ""
    const position = searchParams.get("position")?.trim() || ""
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sortField = (searchParams.get("sort") || "points") as "points"|"assists"|"rebounds"|"minutes"|"name"
    const dir = (searchParams.get("dir") || "desc") as "asc"|"desc"
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)))
    const skip = (page - 1) * limit

    // Use actual collection names from Mongoose to avoid casing issues
    const statlinesColl = (StatLine as any).collection.name // "statlines"
    const teamsColl = (Team as any).collection.name         // "teams"
    const gamesColl = "games" // or (await import("@/lib/models/game")).default.collection.name

    const pipeline: any[] = [
      { $lookup: { from: statlinesColl, localField: "_id", foreignField: "playerId", as: "stats" } },
      { $unwind: "$stats" },
      { $lookup: { from: gamesColl, localField: "stats.gameId", foreignField: "_id", as: "game" } },
      { $unwind: "$game" },
    ]

    // date filter on game.date
    const dateMatch: any = {}
    if (dateFrom) dateMatch.$gte = new Date(dateFrom)
    if (dateTo) dateMatch.$lte = new Date(dateTo)
    if (Object.keys(dateMatch).length) pipeline.push({ $match: { "game.date": dateMatch } })

    pipeline.push({
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        teamId: { $first: "$teamId" },
        position: { $first: "$position" },
        games: { $sum: 1 },
        avgPoints: { $avg: "$stats.points" },
        avgAssists: { $avg: "$stats.assists" },
        avgRebounds: { $avg: "$stats.rebounds" },
        avgMinutes: { $avg: "$stats.minutes" },
      }
    })

    pipeline.push(
      { $lookup: { from: teamsColl, localField: "teamId", foreignField: "_id", as: "team" } },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
    )

    const and: any[] = []
    if (q) and.push({ name: { $regex: q, $options: "i" } })
    if (team) and.push({ "team.name": { $regex: `^${team}$`, $options: "i" } })
    if (position) and.push({ position: { $regex: position, $options: "i" } })
    if (and.length) pipeline.push({ $match: { $and: and } })

    const sortMap: Record<string, any> = {
      points: { avgPoints: dir === "asc" ? 1 : -1 },
      assists: { avgAssists: dir === "asc" ? 1 : -1 },
      rebounds: { avgRebounds: dir === "asc" ? 1 : -1 },
      minutes: { avgMinutes: dir === "asc" ? 1 : -1 },
      name: { name: dir === "asc" ? 1 : -1 },
    }
    pipeline.push({ $sort: sortMap[sortField] || { avgPoints: -1 } })

    const pagePipeline = pipeline.concat([{ $skip: skip }, { $limit: limit }])
    const countPipeline = pipeline.concat([{ $count: "total" }])

    const [items, countRes] = await Promise.all([
      (Player as any).aggregate(pagePipeline),
      (Player as any).aggregate(countPipeline),
    ])

    const total = countRes?.[0]?.total || 0
    return NextResponse.json({ items, page, limit, total })
  } catch (err: any) {
    console.error("[/api/players] error:", err)
    return NextResponse.json({ error: true, message: err?.message || "Internal error" }, { status: 500 })
  }
}
