import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Team from "@/lib/models/team"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  await connectDB()
  const names = await Team.distinct("name")
  names.sort((a: string, b: string) => a.localeCompare(b))
  return NextResponse.json({ teams: names })
}
