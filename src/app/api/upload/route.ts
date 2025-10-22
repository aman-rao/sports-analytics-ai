import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Team from "@/lib/models/team"
import Player from "@/lib/models/player"
import Game from "@/lib/models/game"
import StatLine from "@/lib/models/statline"
import { parseCsvText, DemoRow } from "@/lib/utils/csv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  await connectDB()
  const form = await req.formData()
  const file = form.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  const text = await file.text()
  const rows = await parseCsvText<DemoRow>(text)

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
