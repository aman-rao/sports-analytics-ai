import * as React from "react"
import { cn } from "@/lib/utils/utils"

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow", className)} {...rest} />
}

export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return <div className={cn("p-6", className)} {...rest} />
}
