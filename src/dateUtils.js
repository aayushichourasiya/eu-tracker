// ── Date calculation utilities ────────────────────────────────────────────────

export const START_DATE = new Date("2025-06-23");

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getScheduledDate(dayIndex, completedDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let extraDays = 0;
  for (let i = 0; i < dayIndex; i++) {
    const baseDate = addDays(START_DATE, i + extraDays);
    baseDate.setHours(0, 0, 0, 0);
    const isDone = completedDays.has(i);
    const isBreakDay = i % 7 === 6;
    if (!isDone && !isBreakDay && baseDate < today) extraDays++;
  }
  return addDays(START_DATE, dayIndex + extraDays);
}

export function formatDate(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function isToday(date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

export function isPast(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return d < today;
}

export const START_DATE = new Date("2025-06-23");

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getScheduledDate(dayIndex, completedDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let extraDays = 0;
  for (let i = 0; i < dayIndex; i++) {
    const baseDate = addDays(START_DATE, i + extraDays);
    baseDate.setHours(0, 0, 0, 0);
    const isDone = completedDays.has(i);
    const isBreakDay = i % 7 === 6;
    if (!isDone && !isBreakDay && baseDate < today) extraDays++;
  }
  return addDays(START_DATE, dayIndex + extraDays);
}

export function formatDate(date) {
  return date.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
}

export function isToday(date) {
  const t = new Date();
  return date.getDate()===t.getDate() && date.getMonth()===t.getMonth() && date.getFullYear()===t.getFullYear();
}

export function isPast(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  return d < today;
}

export function getDayStatus(date, isDone, isBreak) {
  if (isBreak) return "break";
  if (isDone) return "done";
  if (isToday(date)) return "today";
  // Only show pending if the date is AFTER the start date
  const start = new Date("2025-06-23"); start.setHours(0,0,0,0);
  const d = new Date(date); d.setHours(0,0,0,0);
  if (isPast(date) && d >= start) return "overdue";
  return "upcoming";
}

export function buildCompletedSet(weeksState, WEEKS) {
  const s = new Set();
  WEEKS.forEach((w, wi) => {
    for (let di = 0; di < 7; di++) {
      if (di === 6) continue;
      const ds = weeksState[w.id]?.[di] || {};
      if (ds.tech && ds.english) s.add(wi * 7 + di);
    }
  });
  return s;
}

export function buildCompletedSet(weeksState, WEEKS) {
  const s = new Set();
  WEEKS.forEach((w, wi) => {
    for (let di = 0; di < 7; di++) {
      if (di === 6) continue;
      const ds = weeksState[w.id]?.[di] || {};
      if (ds.tech && ds.english) s.add(wi * 7 + di);
    }
  });
  return s;
}
