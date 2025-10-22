"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center p-8">
      <Card className="w-full max-w-xl">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-3xl font-bold">Sports Analytics AI</h1>
          <p className="text-muted-foreground">
            UI kit and theming are live.
          </p>
          <Button
            onClick={() =>
              toast.success("It works!", {
                description: "Theme + toast confirmed ✅",
              })
            }
          >
            Show toast
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
