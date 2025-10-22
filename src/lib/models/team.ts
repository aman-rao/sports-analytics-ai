import { Schema, models, model } from "mongoose"

const TeamSchema = new Schema({
  name: { type: String, required: true, unique: true },
  league: { type: String, default: "NCAA" },
})

export type TeamDoc = { _id: string; name: string; league: string }
export default models.Team || model("Team", TeamSchema)
