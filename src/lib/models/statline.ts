import { Schema, models, model } from "mongoose"

const StatLineSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: "Player", index: true },
  gameId: { type: Schema.Types.ObjectId, ref: "Game", index: true },
  minutes: Number,
  points: Number,
  assists: Number,
  rebounds: Number,
  steals: Number,
  blocks: Number,
  fga: Number,
  fgm: Number,
  tpa: Number,
  tpm: Number,
  fta: Number,
  ftm: Number,
  turnovers: Number,
  plusMinus: Number,
})

export type StatLineDoc = {
  _id: string
  playerId: string
  gameId: string
  minutes?: number
  points?: number
  assists?: number
  rebounds?: number
  steals?: number
  blocks?: number
  fga?: number
  fgm?: number
  tpa?: number
  tpm?: number
  fta?: number
  ftm?: number
  turnovers?: number
  plusMinus?: number
}
export default models.StatLine || model("StatLine", StatLineSchema)
