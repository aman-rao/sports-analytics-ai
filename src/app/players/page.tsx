"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimpleLineChart from "@/components/charts/SimpleLineCharts"

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

export default function PlayersPage() {
  const [q, setQ] = React.useState("")
  const [sort, setSort] = React.useState<"points"|"assists"|"rebounds"|"minutes"|"name">("points")
  const [dir, setDir] = React.useState<"asc"|"desc">("desc")
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<ApiList | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<PlayerRow | null>(null)

async function fetchData(p = page) {
  setLoading(true)
  try {
    const params = new URLSearchParams({ q, sort, dir, page: String(p), limit: "10" })
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

  React.useEffect(() => { fetchData(1); setPage(1) }, [q, sort, dir])

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Players</h1>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
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
          <div className="flex items-center gap-2">
            <Button onClick={() => fetchData(1)} disabled={loading}>Apply</Button>
            <Button variant="outline" onClick={() => { setQ(""); setSort("points"); setDir("desc") }}>Reset</Button>
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
  const [series, setSeries] = React.useState<{ date: string; points: number }[] | null>(null)

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/players/${player._id}/timeseries`)
      const json = await res.json()
      setSeries(json.series)
    })()
  }, [player._id])

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{player.name} — Points over time</h2>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        <SimpleLineChart data={series ?? []} xKey="date" yKey="points" />
      </CardContent>
    </Card>
  )
}
