"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Sports Analytics AI</h1>
      <p className="mt-2 text-muted-foreground">Day 1 backend scaffold is live.</p>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <form action="/api/upload" method="post" encType="multipart/form-data" className="space-y-2">
            <input type="file" name="file" accept=".csv" />
            <Button type="submit" variant="outline">Upload CSV</Button>
          </form>

          <form method="post" action="/api/seed">
            <Button type="submit">Load Demo Data</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
