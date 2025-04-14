"use client"

import * as React from "react"
import { TooltipProps } from "recharts"
import {
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import { cn } from "@/lib/utils"

export interface ChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const chartColors = React.useMemo(() => {
    const colors: Record<string, string> = {}
    for (const [key, value] of Object.entries(config)) {
      if (value.color) {
        colors[key] = value.color
      }
    }
    return colors
  }, [config])

  return (
    <div
      className={cn("h-full w-full", className)}
      style={
        {
          "--chart-1": "267 75% 50%", // purple (primary)
          "--chart-2": "260 60% 45%", // indigo
          "--chart-3": "328 73% 41%", // pink
          "--chart-4": "215 91% 54%", // blue
          "--chart-5": "226 71% 40%", // dark blue
          ...chartColors,
        } as React.CSSProperties
      }
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number;
  }>
  config: ChartConfig
  className?: string
  formatter?: (value: number, label: string) => React.ReactNode
  hideLabel?: boolean
}

export function ChartTooltipContent({
  active,
  payload,
  config,
  className,
  formatter,
  hideLabel = false,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  const { dataKey, name, value } = payload[0]
  const dataKeyStr = dataKey !== undefined ? String(dataKey) : '';
  const nameStr = name !== undefined ? String(name) : '';
  const { label } = config[dataKeyStr] || config[nameStr] || { label: nameStr }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background px-3 py-1.5 shadow-md",
        className
      )}
    >
      {!hideLabel && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
      <p className="font-medium">
        {formatter && value !== undefined ? formatter(value, label) : value}
      </p>
    </div>
  )
}

interface ChartTooltipProps extends Omit<TooltipProps<number, string>, 'payload'> {
  config?: ChartConfig
  formatter?: (value: number, label: string) => React.ReactNode
  hideLabel?: boolean
}

export function ChartTooltip({
  content,
  config = {},
  formatter,
  hideLabel = false,
  ...props
}: ChartTooltipProps) {
  if (content) {
    return <Tooltip content={content} {...props} />
  }

  return (
    <Tooltip
      content={({ active, payload }) => (
        <ChartTooltipContent
          active={active}
          payload={payload}
          config={config}
          formatter={formatter}
          hideLabel={hideLabel}
        />
      )}
      {...props}
    />
  )
} 