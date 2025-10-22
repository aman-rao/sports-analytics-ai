import { Schema, models, model } from "mongoose"

const GameSchema = new Schema({
  date: { type: Date, index: true },
  homeTeamId: { type: Schema.Types.ObjectId, ref: "Team" },
  awayTeamId: { type: Schema.Types.ObjectId, ref: "Team" },
})

export type GameDoc = { _id: string; date: Date; homeTeamId: string; awayTeamId: string }
export default models.Game || model("Game", GameSchema)
