import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { QuerySpec, MetricEnum } from "@/lib/ai/querySchema"
import { runPlayersQuery } from "@/lib/ai/executor"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1"
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"

const SYSTEM = `You convert natural-language basketball queries into strict JSON matching this TypeScript type:
type QuerySpec = {
  entity: "players"|"teams";
  metric: "points"|"assists"|"rebounds"|"minutes";
  filters: {
    name?: string; team?: string; position?: string;
    dateFrom?: string; dateTo?: string;
    lastNGames?: number; minGames?: number;
  };
  sort: { field: "points"|"assists"|"rebounds"|"minutes"; dir: "asc"|"desc" };
  limit: number; // 1..20
}
Rules:
- Output ONLY JSON (no markdown).
- Default entity=players, metric=points, sort by metric desc, limit=5.
- Map "last N" to filters.lastNGames = N (e.g., "last 5" -> 5).
- If "since <yyyy-mm-dd>" set filters.dateFrom.
- If "most/least points/assists/..." set sort.field accordingly, dir desc for "most", asc for "least".
- If a team is named (e.g., "Warriors"), set filters.team to exact string.
- Keep it simple and valid JSON.`

function fallbackParse(prompt: string) {
  const p = prompt.toLowerCase()
  const spec: any = {
    entity: "players",
    metric: "points",
    filters: {},
    sort: { field: "points", dir: "desc" },
    limit: 5
  }
  // metric
  if (/assist/.test(p)) spec.metric = "assists"
  if (/rebound|boards/.test(p)) spec.metric = "rebounds"
  if (/minute/.test(p)) spec.metric = "minutes"
  spec.sort.field = spec.metric

  // most/least
  if (/least|lowest/.test(p)) spec.sort.dir = "asc"
  if (/most|highest|top/.test(p)) spec.sort.dir = "desc"

  // last N
  const lastN = /last\s+(\d{1,2})/.exec(p)
  if (lastN) spec.filters.lastNGames = Math.max(1, Math.min(30, parseInt(lastN[1], 10)))

  // since yyyy-mm-dd
  const since = /since\s+(\d{4}-\d{2}-\d{2})/.exec(p)
  if (since) spec.filters.dateFrom = since[1]

  // crude team extraction (demo only)
  const teamMatch = /\b(guardians|wingers|lakers|warriors|celtics|bucks|nuggets)\b/i.exec(prompt)
  if (teamMatch) spec.filters.team = teamMatch[0]

  // limit N
  const limitN = /\btop\s+(\d{1,2})/.exec(p)
  if (limitN) spec.limit = Math.max(1, Math.min(20, parseInt(limitN[1], 10)))

  return spec
}

async function nlToSpec(prompt: string) {
  // If no key, fallback
  if (!OPENAI_API_KEY) return fallbackParse(prompt)

  const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`LLM error ${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || "{}"
  try {
    return JSON.parse(text)
  } catch {
    // if model didn't return clean JSON
    return fallbackParse(prompt)
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    // 1) NL -> JSON
    const raw = await nlToSpec(prompt)

    // 2) Zod validate/normalize
    const parsed = QuerySpec.safeParse(raw)
    const spec = parsed.success ? parsed.data : QuerySpec.parse({})

    // 3) Execute safely (players only for MVP)
    if (spec.entity !== "players") {
      return NextResponse.json({ spec, results: [], note: "Only players supported in MVP" })
    }
    const results = await runPlayersQuery(spec)

    // 4) Compose a tiny natural answer
    const metric = spec.metric
    let answer = ""
    if (results.length) {
      const top = results[0]
      const val = metric === "points" ? top.avgPoints
        : metric === "assists" ? top.avgAssists
        : metric === "rebounds" ? top.avgRebounds
        : top.avgMinutes
      const scope = spec.filters.lastNGames
        ? `over the last ${spec.filters.lastNGames} games`
        : (spec.filters.dateFrom || spec.filters.dateTo) ? `in the selected date range` : "overall"
      answer = `${top.name} (${top.teamName ?? "—"}) leads with ${val} ${metric} ${scope}.`
    } else {
      answer = "No matching players were found for that query."
    }

    return NextResponse.json({ spec, results, answer })
  } catch (e: any) {
    console.error("[/api/ask] error:", e)
    return NextResponse.json({ error: true, message: e?.message || "Internal error" }, { status: 500 })
  }
}
