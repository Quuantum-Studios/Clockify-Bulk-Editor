export const getLast30DaysRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { startDate: start, endDate: end }
}

export const toUtcIso = (d: Date, timezone: string = 'UTC') => {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const parts = dtf.formatToParts(d)
    const y = Number(parts.find(p => p.type === 'year')?.value)
    const mo = Number(parts.find(p => p.type === 'month')?.value)
    const da = Number(parts.find(p => p.type === 'day')?.value)
    const ho = Number(parts.find(p => p.type === 'hour')?.value)
    const mi = Number(parts.find(p => p.type === 'minute')?.value)
    const se = Number(parts.find(p => p.type === 'second')?.value || '0')
    const ms = Date.UTC(y, mo - 1, da, ho, mi, se)
    return new Date(ms).toISOString()
  } catch {
    return d.toISOString()
  }
}

export const toLocalNaive = (d: Date) => {
  const yyyy = d.getFullYear().toString().padStart(4, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  const HH = d.getHours().toString().padStart(2, '0')
  const MM = d.getMinutes().toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00Z`
}

export const normalizeDate = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    const d = new Date(value + ':00');
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};
