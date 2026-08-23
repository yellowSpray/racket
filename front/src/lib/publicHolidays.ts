// Meeus/Jones/Butcher algorithm — returns Easter Sunday for a given year
function easterSunday(year: number): Date {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(year, month, day)
}

function toISO(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

export type CountryCode = "FR" | "BE" | "NL" | "DE" | "CH" | "ES" | "PT" | "LU" | "IT"

function buildHolidays(year: number, easter: Date, country: CountryCode): Date[] {
    const fixed = (month: number, day: number) => new Date(year, month, day)
    const e = (offset: number) => addDays(easter, offset)

    switch (country) {
        case "FR": return [
            fixed(0, 1),   // Jour de l'An
            e(1),          // Lundi de Pâques
            fixed(4, 1),   // Fête du Travail
            fixed(4, 8),   // Victoire 1945
            e(39),         // Ascension
            e(50),         // Lundi de Pentecôte
            fixed(6, 14),  // Fête nationale
            fixed(7, 15),  // Assomption
            fixed(10, 1),  // Toussaint
            fixed(10, 11), // Armistice
            fixed(11, 25), // Noël
        ]
        case "BE": return [
            fixed(0, 1),   // Jour de l'An
            e(1),          // Lundi de Pâques
            fixed(4, 1),   // Fête du Travail
            e(39),         // Ascension
            e(50),         // Lundi de Pentecôte
            fixed(6, 21),  // Fête nationale belge
            fixed(7, 15),  // Assomption
            fixed(10, 1),  // Toussaint
            fixed(10, 11), // Armistice
            fixed(11, 25), // Noël
        ]
        case "NL": return [
            fixed(0, 1),   // Nieuwjaar
            e(-2),         // Goede Vrijdag
            e(1),          // Tweede Paasdag
            fixed(3, 27),  // Koningsdag
            e(39),         // Hemelvaartsdag
            e(50),         // Tweede Pinksterdag
            fixed(11, 25), // Eerste Kerstdag
            fixed(11, 26), // Tweede Kerstdag
        ]
        case "DE": return [
            fixed(0, 1),   // Neujahr
            e(-2),         // Karfreitag
            e(1),          // Ostermontag
            fixed(4, 1),   // Tag der Arbeit
            e(39),         // Christi Himmelfahrt
            e(50),         // Pfingstmontag
            fixed(9, 3),   // Tag der Deutschen Einheit
            fixed(11, 25), // Erster Weihnachtstag
            fixed(11, 26), // Zweiter Weihnachtstag
        ]
        case "CH": return [
            fixed(0, 1),   // Neujahr
            fixed(0, 2),   // Berchtoldstag
            e(-2),         // Karfreitag
            e(1),          // Ostermontag
            e(39),         // Auffahrt
            e(50),         // Pfingstmontag
            fixed(7, 1),   // Nationalfeiertag
            fixed(11, 25), // Weihnachten
            fixed(11, 26), // Stephanstag
        ]
        case "ES": return [
            fixed(0, 1),   // Año Nuevo
            fixed(0, 6),   // Reyes Magos
            e(-2),         // Viernes Santo
            fixed(4, 1),   // Día del Trabajador
            fixed(7, 15),  // Asunción
            fixed(9, 12),  // Fiesta Nacional
            fixed(10, 1),  // Todos los Santos
            fixed(11, 6),  // Día de la Constitución
            fixed(11, 8),  // Inmaculada Concepción
            fixed(11, 25), // Navidad
        ]
        case "PT": return [
            fixed(0, 1),   // Ano Novo
            e(-2),         // Sexta-feira Santa
            e(0),          // Domingo de Páscoa
            fixed(3, 25),  // Dia da Liberdade
            fixed(4, 1),   // Dia do Trabalhador
            e(60),         // Corpo de Deus
            fixed(5, 10),  // Dia de Portugal
            fixed(7, 15),  // Assunção
            fixed(9, 5),   // Implantação da República
            fixed(10, 1),  // Todos-os-Santos
            fixed(11, 1),  // Restauração da Independência
            fixed(11, 8),  // Imaculada Conceição
            fixed(11, 25), // Natal
        ]
        case "LU": return [
            fixed(0, 1),   // Jour de l'An
            e(1),          // Lundi de Pâques
            fixed(4, 1),   // Fête du Travail
            e(39),         // Ascension
            e(50),         // Lundi de Pentecôte
            fixed(5, 23),  // Fête nationale
            fixed(7, 15),  // Assomption
            fixed(10, 1),  // Toussaint
            fixed(11, 25), // Noël
            fixed(11, 26), // Saint-Étienne
        ]
        case "IT": return [
            fixed(0, 1),   // Capodanno
            fixed(0, 6),   // Epifania
            e(0),          // Domenica di Pasqua
            e(1),          // Lunedì dell'Angelo
            fixed(3, 25),  // Festa della Liberazione
            fixed(4, 1),   // Festa dei Lavoratori
            fixed(5, 2),   // Festa della Repubblica
            fixed(7, 15),  // Ferragosto
            fixed(10, 1),  // Ognissanti
            fixed(11, 8),  // Immacolata Concezione
            fixed(11, 25), // Natale
            fixed(11, 26), // Santo Stefano
        ]
    }
}

export function getPublicHolidays(year: number, country: CountryCode = "FR"): string[] {
    const easter = easterSunday(year)
    return buildHolidays(year, easter, country).map(toISO).sort()
}

export function generatePlayingDates(
    startDate: string,
    endDate: string,
    daysOfWeek: number[],
    excludeHolidays: boolean,
    country: CountryCode = "FR"
): string[] {
    if (startDate > endDate) return []

    const activeDays = daysOfWeek.length > 0 ? new Set(daysOfWeek) : null

    let holidays: Set<string> | null = null
    if (excludeHolidays) {
        const startYear = parseInt(startDate.slice(0, 4), 10)
        const endYear = parseInt(endDate.slice(0, 4), 10)
        const allHolidays: string[] = []
        for (let y = startYear; y <= endYear; y++) {
            allHolidays.push(...getPublicHolidays(y, country))
        }
        holidays = new Set(allHolidays)
    }

    const result: string[] = []
    const current = new Date(startDate + "T12:00:00")
    const end = new Date(endDate + "T12:00:00")

    while (current <= end) {
        const iso = toISO(current)
        const dow = current.getDay()

        const dayMatch = activeDays === null || activeDays.has(dow)
        const notHoliday = !holidays || !holidays.has(iso)

        if (dayMatch && notHoliday) {
            result.push(iso)
        }

        current.setDate(current.getDate() + 1)
    }

    return result
}
