import StatLine from "@/lib/models/statline"
import Player from "@/lib/models/player"
import Team from "@/lib/models/team"
import mongoose from "mongoose"
import { QuerySpec } from "./querySchema"

export async function runPlayersQuery(spec: QuerySpec) {
  // collections to avoid casing issues
  const statlines = (StatLine as any).collection.name
  const players = (Player as any).collection.name
  const teams = (Team as any).collection.name
  const games = "games"

  const metricField = {
    points: "$points",
    assists: "$assists",
    rebounds: "$rebounds",
    minutes: "$minutes",
  }[spec.metric || "points"]

  const dateMatch: any = {}
  if (spec.filters.dateFrom) dateMatch.$gte = new Date(spec.filters.dateFrom)
  if (spec.filters.dateTo) dateMatch.$lte = new Date(spec.filters.dateTo)
  const hasDate = Object.keys(dateMatch).length > 0

  const pipeline: any[] = [
    // Start from StatLine for easier last N handling
    { $lookup: { from: games, localField: "gameId", foreignField: "_id", as: "game" } },
    { $unwind: "$game" },
  ]
  if (hasDate) pipeline.push({ $match: { "game.date": dateMatch } })

  // Join player and (optionally) team filters
  pipeline.push(
    { $lookup: { from: players, localField: "playerId", foreignField: "_id", as: "player" } },
    { $unwind: "$player" },
    { $lookup: { from: teams, localField: "player.teamId", foreignField: "_id", as: "team" } },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
  )

  const and: any[] = []
  if (spec.filters.name) and.push({ "player.name": { $regex: spec.filters.name, $options: "i" } })
  if (spec.filters.team) and.push({ "team.name": { $regex: `^${spec.filters.team}$`, $options: "i" } })
  if (spec.filters.position) and.push({ "player.position": { $regex: spec.filters.position, $options: "i" } })
  if (and.length) pipeline.push({ $match: { $and: and } })

  // Sort by date so we can slice last N per player
  pipeline.push({ $sort: { "game.date": 1 } })

  // Group all statlines per player and keep compact objects for slicing
  pipeline.push({
    $group: {
      _id: "$playerId",
      name: { $first: "$player.name" },
      teamId: { $first: "$player.teamId" },
      teamName: { $first: "$team.name" },
      position: { $first: "$player.position" },
      stats: {
        $push: {
          date: "$game.date",
          points: "$points",
          assists: "$assists",
          rebounds: "$rebounds",
          minutes: "$minutes",
        }
      }
    }
  })

  // If lastNGames is set, slice the tail
  if (spec.filters.lastNGames) {
    pipeline.push({
      $set: {
        stats: { $slice: ["$stats", -spec.filters.lastNGames] }
      }
    })
  }

  // Optionally filter by minGames
  if (spec.filters.minGames) {
    pipeline.push({
      $set: { games: { $size: "$stats" } }
    })
    pipeline.push({ $match: { games: { $gte: spec.filters.minGames } } })
  } else {
    pipeline.push({ $set: { games: { $size: "$stats" } } })
  }

  // Compute averages for the chosen metric (and keep the others for display)
  pipeline.push({
    $set: {
      avgPoints: { $avg: { $map: { input: "$stats", as: "s", in: "$$s.points" } } },
      avgAssists: { $avg: { $map: { input: "$stats", as: "s", in: "$$s.assists" } } },
      avgRebounds: { $avg: { $map: { input: "$stats", as: "s", in: "$$s.rebounds" } } },
      avgMinutes: { $avg: { $map: { input: "$stats", as: "s", in: "$$s.minutes" } } },
    }
  })

  // Sort by requested metric
  const sortField = {
    points: "avgPoints",
    assists: "avgAssists",
    rebounds: "avgRebounds",
    minutes: "avgMinutes",
  }[spec.sort.field || spec.metric || "points"]

  pipeline.push({ $sort: { [sortField]: spec.sort.dir === "asc" ? 1 : -1, name: 1 } })

  // Limit
  pipeline.push({ $limit: spec.limit || 5 })

  // Final projection
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      teamId: 1,
      teamName: 1,
      position: 1,
      games: 1,
      avgPoints: { $round: ["$avgPoints", 2] },
      avgAssists: { $round: ["$avgAssists", 2] },
      avgRebounds: { $round: ["$avgRebounds", 2] },
      avgMinutes: { $round: ["$avgMinutes", 2] },
    }
  })

  const rows = await (StatLine as any).aggregate(pipeline)
  return rows
}
