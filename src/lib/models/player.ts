import { Schema, models, model } from "mongoose"

const PlayerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
    position: String,
  },
  { timestamps: true }
)

export type PlayerDoc = { _id: string; name: string; teamId: string; position?: string }
export default models.Player || model("Player", PlayerSchema)
