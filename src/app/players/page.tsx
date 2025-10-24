"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimpleLineChart from "@/components/charts/SimpleLineCharts" // <- fixed import name

type PlayerRow = {
  _id: string
  name: string
  position?: string
  team?: { name: string }
  games: number
  avgPoints: number
  avgAssists: number
  avgRebounds: number
  avgMinutes: number
}

type ApiList = { items: PlayerRow[]; page: number; limit: number; total: number }

// --- NEW: tiny debounce hook (300ms default)
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function PlayersPage() {
  const [q, setQ] = React.useState("")
  const [sort, setSort] = React.useState<"points"|"assists"|"rebounds"|"minutes"|"name">("points")
  const [dir, setDir] = React.useState<"asc"|"desc">("desc")
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<ApiList | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<PlayerRow | null>(null)
  const [teams, setTeams] = React.useState<string[]>([])
  const [team, setTeam] = React.useState("")

  // NEW: debounced version of q
  const debouncedQ = useDebounced(q, 300)

  React.useEffect(() => {
    (async () => {
      const res = await fetch("/api/teams/distinct", { cache: "no-store" })
      const json = await res.json()
      setTeams(json.teams ?? [])
    })()
  }, [])

  async function fetchData(p = page) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: debouncedQ, sort, dir, page: String(p), limit: "10" })
      if (team) params.set("team", team)
      const res = await fetch(`/api/players?${params.toString()}`, { cache: "no-store" })

      const text = await res.text() // read once
      if (!res.ok) {
        // log server error body for quick debugging
        console.error("GET /api/players failed:", res.status, text)
        throw new Error(`Players API ${res.status}`)
      }
      const json = text ? JSON.parse(text) : { items: [], page: 1, limit: 10, total: 0 }
      setData(json)
    } catch (e) {
      console.error(e)
      setData({ items: [], page: 1, limit: 10, total: 0 })
    } finally {
      setLoading(false)
    }
  }

  // include debouncedQ so typing doesn't spam requests; include team to refetch on dropdown change
  React.useEffect(() => { fetchData(1); setPage(1) }, [debouncedQ, sort, dir, team])

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Players</h1>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search player name…"
            className="border rounded-md px-3 py-2"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm w-16">Sort</label>
            <select className="border rounded-md px-2 py-2 flex-1" value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="points">Points</option>
              <option value="assists">Assists</option>
              <option value="rebounds">Rebounds</option>
              <option value="minutes">Minutes</option>
              <option value="name">Name</option>
            </select>
            <select className="border rounded-md px-2 py-2" value={dir} onChange={(e) => setDir(e.target.value as any)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {/* Team filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm w-16">Team</label>
            <select
              className="border rounded-md px-2 py-2 flex-1"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="">All</option>
              {teams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => fetchData(1)} disabled={loading}>Apply</Button>
            <Button
              variant="outline"
              onClick={() => { setQ(""); setSort("points"); setDir("desc"); setTeam(""); }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/40">
              <tr>
                <th className="text-left p-3">Player</th>
                <th className="text-left p-3">Team</th>
                <th className="text-right p-3">G</th>
                <th className="text-right p-3">PTS</th>
                <th className="text-right p-3">AST</th>
                <th className="text-right p-3">REB</th>
                <th className="text-right p-3">MIN</th>
                <th className="text-right p-3">Trend</th>
              </tr>
            </thead>
            
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="p-4 text-center">Loading…</td></tr>
              )}
              {!loading && data?.items?.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No results</td></tr>
              )}
              {!loading && data?.items?.map(p => (
                <tr
                  key={p._id}
                  className="border-t hover:bg-accent/20 cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.team?.name ?? "-"}</td>
                  <td className="p-3 text-right">{p.games}</td>
                  <td className="p-3 text-right">{p.avgPoints?.toFixed(1) ?? "0.0"}</td>
                  <td className="p-3 text-right">{p.avgAssists?.toFixed(1) ?? "0.0"}</td>
                  <td className="p-3 text-right">{p.avgRebounds?.toFixed(1) ?? "0.0"}</td>
                  <td className="p-3 text-right">{p.avgMinutes?.toFixed(1) ?? "0.0"}</td>
                  <td className="p-3 text-right">
                    <span className="inline-block h-2 w-8 rounded bg-primary/70" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => { const p = Math.max(1, page-1); setPage(p); fetchData(p) }} disabled={page<=1 || loading}>Prev</Button>
          <div className="text-sm text-muted-foreground">Page {page} · Total {data.total}</div>
          <Button variant="outline" onClick={() => { const p = page+1; setPage(p); fetchData(p) }} disabled={page * data.limit >= data.total || loading}>Next</Button>
        </div>
      )}

      {selected && <PlayerTrend player={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}

function PlayerTrend({ player, onClose }: { player: PlayerRow; onClose: () => void }) {
  const [series, setSeries] = React.useState<any[] | null>(null)
  const [metric, setMetric] = React.useState<"points"|"assists"|"rebounds">("points")
  const [windowSize, setWindowSize] = React.useState<0|5|10>(0) // 0 = off
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await fetch(`/api/players/${player._id}/timeseries`, { cache: "no-store" })
      const json = await res.json()
      setSeries(json.series || [])
      setLoading(false)
    })()
  }, [player._id])

  // compute optional rolling-average in-place
  const data = React.useMemo(() => {
    if (!series) return []
    const arr = series.map((r: any) => ({
      date: r.date,
      value: r[metric] ?? 0,
    }))
    if (!windowSize) return arr
    const out: typeof arr = []
    let sum = 0
    const q: number[] = []
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i].value
      q.push(arr[i].value)
      if (q.length > windowSize) sum -= q.shift()!
      const avg = sum / q.length
      out.push({ date: arr[i].date, value: avg })
    }
    return out
  }, [series, metric, windowSize])

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {player.name} — {metric.toUpperCase()} over time
          </h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex border rounded-md overflow-hidden">
              {(["points","assists","rebounds"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 text-sm ${metric===m ? "bg-primary text-primary-foreground" : "bg-background"}`}
                >
                  {m === "points" ? "PTS" : m === "assists" ? "AST" : "REB"}
                </button>
              ))}
            </div>
            <div className="inline-flex border rounded-md overflow-hidden">
              {([0,5,10] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWindowSize(w)}
                  className={`px-3 py-1 text-sm ${windowSize===w ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  title={w ? `${w}-game rolling average` : "Raw values"}
                >
                  {w ? `${w}-game` : "Raw"}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>

        {loading && <div className="h-64 grid place-items-center"><div className="animate-spin h-6 w-6 border-2 rounded-full border-primary border-t-transparent" /></div>}
        {!loading && <SimpleLineChart data={data} xKey="date" yKey="value" />}
      </CardContent>
    </Card>
  )
}
