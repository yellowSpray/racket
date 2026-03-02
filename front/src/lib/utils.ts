import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function intervalToMinutes(interval: string | undefined): number {
  if (!interval) return 30
  const match = interval.match(/(\d{2}):(\d{2})/)
  if (!match) return 30
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

export function minutesToInterval(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}:00`
}
