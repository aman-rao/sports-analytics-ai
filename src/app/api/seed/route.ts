import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { connectDB } from "@/lib/db"
import Team from "@/lib/models/team"
import Player from "@/lib/models/player"
import Game from "@/lib/models/game"
import StatLine from "@/lib/models/statline"
import { parseCsvText, DemoRow } from "@/lib/utils/csv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  await connectDB()
  const filePath = path.join(process.cwd(), "public", "sample_data", "demo.csv")
  const text = await fs.readFile(filePath, "utf8")
  const rows = await parseCsvText<DemoRow>(text)

  await Promise.all([
    StatLine.deleteMany({}),
    Game.deleteMany({}),
    Player.deleteMany({}),
    Team.deleteMany({}),
  ])

  let inserted = 0
  for (const r of rows) {
    const team = await Team.findOneAndUpdate(
      { name: r.team },
      { $setOnInsert: { name: r.team, league: "NCAA" } },
      { upsert: true, new: true }
    )

    const player = await Player.findOneAndUpdate(
      { name: r.player },
      { $setOnInsert: { name: r.player, teamId: team._id } },
      { upsert: true, new: true }
    )

    const date = new Date(r.date)
    const game = await Game.findOneAndUpdate(
      { date, homeTeamId: team._id },
      { $setOnInsert: { date, homeTeamId: team._id, awayTeamId: team._id } },
      { upsert: true, new: true }
    )

    await StatLine.create({
      playerId: player._id,
      gameId: game._id,
      minutes: +r.minutes,
      points: +r.points,
      assists: +r.assists,
      rebounds: +r.rebounds,
      fga: +r.fga,
      fgm: +r.fgm,
      tpa: +r.tpa,
      tpm: +r.tpm,
      fta: +r.fta,
      ftm: +r.ftm,
      turnovers: +r.turnovers,
      plusMinus: 0,
    })
    inserted++
  }

  return NextResponse.json({ ok: true, inserted })
}
