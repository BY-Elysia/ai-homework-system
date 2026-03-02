export function formatDateTime(input) {
  if (!input) return '未设置'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return '未设置'
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}
