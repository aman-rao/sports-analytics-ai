"use client"

import * as React from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

type Props = {
  data: any[]
  xKey: string
  yKey: string
}

export default function SimpleLineChart({ data, xKey, yKey }: Props) {
  // Format date ticks if ISO dates are provided
  function tickFormatter(value: any) {
    try { return new Date(value).toLocaleDateString() } catch { return value }
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tickFormatter={tickFormatter} />
          <YAxis />
          <Tooltip labelFormatter={(l)=> (typeof l === "string" ? new Date(l).toLocaleDateString() : l)} />
          <Line type="monotone" dataKey={yKey} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
