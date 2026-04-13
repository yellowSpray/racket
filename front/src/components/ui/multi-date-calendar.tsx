import { useState } from "react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MultiDateCalendarProps {
    selectedDates: string[]
    onChange: (dates: string[]) => void
    disabled?: boolean
    className?: string
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const MONTH_LABELS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

function toISO(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
    const firstDay = new Date(year, month, 1)
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeks: (Date | null)[][] = []
    let week: (Date | null)[] = []

    for (let i = 0; i < startDow; i++) {
        week.push(null)
    }

    for (let d = 1; d <= daysInMonth; d++) {
        week.push(new Date(year, month, d))
        if (week.length === 7) {
            weeks.push(week)
            week = []
        }
    }

    if (week.length > 0) {
        while (week.length < 7) {
            week.push(null)
        }
        weeks.push(week)
    }

    return weeks
}

export function MultiDateCalendar({ selectedDates, onChange, disabled = false, className }: MultiDateCalendarProps) {
    const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
    const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

    const selectedSet = new Set(selectedDates)
    const weeks = getMonthGrid(viewYear, viewMonth)

    const toggleDate = (date: Date) => {
        if (disabled) return
        const iso = toISO(date)
        if (selectedSet.has(iso)) {
            onChange(selectedDates.filter(d => d !== iso))
        } else {
            onChange([...selectedDates, iso].sort())
        }
    }

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(viewYear - 1)
            setViewMonth(11)
        } else {
            setViewMonth(viewMonth - 1)
        }
    }

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewYear(viewYear + 1)
            setViewMonth(0)
        } else {
            setViewMonth(viewMonth + 1)
        }
    }



    return (
        <div className={cn("border rounded-lg p-3 w-fit flex flex-col", className)}>
            {/* Header */}
            <div className="flex items-center justify-center gap-4 mb-2">
                <Button type="button" variant="ghost" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                    <ArrowLeft01Icon className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                    {MONTH_LABELS[viewMonth]} {viewYear}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-1">
                {DAY_LABELS.map(label => (
                    <div key={label} className="text-center text-xs text-muted-foreground font-medium py-1">
                        {label}
                    </div>
                ))}
            </div>

            {/* Date grid */}
            <div className="flex-1 flex flex-col justify-between">
            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-2">
                    {week.map((date, di) => {
                        if (!date) {
                            return <div key={di} className="h-8" />
                        }

                        const iso = toISO(date)
                        const isSelected = selectedSet.has(iso)
                        const isToday = iso === toISO(new Date())

                        return (
                            <button
                                key={di}
                                type="button"
                                onClick={() => toggleDate(date)}
                                disabled={disabled}
                                className={cn(
                                    "h-8 w-full rounded-md text-sm transition-colors",
                                    !disabled && "cursor-pointer",
                                    disabled && "cursor-default opacity-60",
                                    !isSelected && !disabled && "hover:bg-accent",
                                    isSelected && "bg-primary text-primary-foreground",
                                    isToday && !isSelected && "border border-primary",
                                )}
                            >
                                {date.getDate()}
                            </button>
                        )
                    })}
                </div>
            ))}
            </div>
        </div>
    )
}
