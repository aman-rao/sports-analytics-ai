"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimpleLineChart from "@/components/charts/SimpleLineCharts"

type AskResponse = {
  spec: {
    metric: "points"|"assists"|"rebounds"|"minutes"
    filters: { lastNGames?: number }
  }
  results: Array<{
    _id: string
    name: string
    teamName?: string
    avgPoints: number
    avgAssists: number
    avgRebounds: number
    avgMinutes: number
  }>
  answer: string
}

export default function AskPage() {
  const [prompt, setPrompt] = React.useState("Who averaged the most points in last 5?")
  const [resp, setResp] = React.useState<AskResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [series, setSeries] = React.useState<any[]>([])

  async function onAsk() {
    setLoading(true)
    setSeries([])
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const json = await r.json()
      setResp(json)

      // Optionally pull timeseries for the #1 result so we can chart it
      const top = json?.results?.[0]
      if (top?._id) {
        const ts = await fetch(`/api/players/${top._id}/timeseries`, { cache: "no-store" }).then(r => r.json())
        let s = ts.series || []
        // If query was last N games, slice from the end client-side too for the chart
        const n = json?.spec?.filters?.lastNGames
        if (n) s = s.slice(-n)
        const metric = json?.spec?.metric || "points"
        setSeries(s.map((row: any) => ({ date: row.date, value: row[metric] ?? 0 })))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Ask</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="border rounded-md px-3 py-2 flex-1"
              placeholder='e.g., "Who averaged the most points in last 5?"'
            />
            <Button onClick={onAsk} disabled={loading}>{loading ? "Thinking…" : "Ask"}</Button>
          </div>
          {resp && (
            <div className="text-sm">
              <div className="font-medium">Answer:</div>
              <div className="mt-1">{resp.answer}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {resp?.results?.length ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">Top results</div>
            <table className="w-full text-sm">
              <thead className="bg-accent/40">
                <tr>
                  <th className="text-left p-2">Player</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-right p-2">PTS</th>
                  <th className="text-right p-2">AST</th>
                  <th className="text-right p-2">REB</th>
                  <th className="text-right p-2">MIN</th>
                </tr>
              </thead>
              <tbody>
                {resp.results.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.teamName ?? "-"}</td>
                    <td className="p-2 text-right">{r.avgPoints}</td>
                    <td className="p-2 text-right">{r.avgAssists}</td>
                    <td className="p-2 text-right">{r.avgRebounds}</td>
                    <td className="p-2 text-right">{r.avgMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {series.length ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium">Trend (top player)</div>
            <SimpleLineChart data={series} xKey="date" yKey="value" />
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
