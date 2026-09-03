export interface BirthdayPerson {
  full_name: string;
  birthday: string;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function parseBirthdayMonthDay(birthday: string): { month: number; day: number } {
  const parsed = new Date(`${birthday}T12:00:00`);
  return { month: parsed.getMonth(), day: parsed.getDate() };
}

export function nextBirthdayDate(birthday: string, asOf = new Date()): Date {
  const today = startOfDay(asOf);
  const { month, day } = parseBirthdayMonthDay(birthday);
  const candidate = new Date(today.getFullYear(), month, day);
  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export function daysUntilBirthday(birthday: string, asOf = new Date()): number {
  const today = startOfDay(asOf);
  const next = nextBirthdayDate(birthday, today);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatBirthdayMonthDay(
  birthday: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(`${birthday}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  if (options && Object.keys(options).length > 0) {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...options,
    });
  }
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sortByUpcomingBirthday(
  people: BirthdayPerson[],
  asOf = new Date()
): BirthdayPerson[] {
  return [...people].sort(
    (a, b) => nextBirthdayDate(a.birthday, asOf).getTime() - nextBirthdayDate(b.birthday, asOf).getTime()
  );
}

export function birthdaysWithinDays(
  people: BirthdayPerson[],
  days: number,
  asOf = new Date()
): BirthdayPerson[] {
  return sortByUpcomingBirthday(
    people.filter((person) => {
      const until = daysUntilBirthday(person.birthday, asOf);
      return until >= 0 && until <= days;
    }),
    asOf
  );
}

export function birthdaysOnCalendarDay(
  people: BirthdayPerson[],
  day: Date
): BirthdayPerson[] {
  const month = day.getMonth();
  const date = day.getDate();
  return people
    .filter((person) => {
      const parts = parseBirthdayMonthDay(person.birthday);
      return parts.month === month && parts.day === date;
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" }));
}

export function birthdaysInMonth(
  people: BirthdayPerson[],
  year: number,
  month: number
): BirthdayPerson[] {
  return people
    .filter((person) => parseBirthdayMonthDay(person.birthday).month === month)
    .sort((a, b) => {
      const dayA = parseBirthdayMonthDay(a.birthday).day;
      const dayB = parseBirthdayMonthDay(b.birthday).day;
      if (dayA !== dayB) return dayA - dayB;
      return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
    });
}

export function startOfWeekSunday(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
}

export function getMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeekSunday(firstOfMonth);
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    cells.push({ date, inMonth: date.getMonth() === month });
  }

  return cells;
}

export function upcomingBirthdayLabel(birthday: string, asOf = new Date()): string {
  const days = daysUntilBirthday(birthday, asOf);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return formatBirthdayMonthDay(birthday, { weekday: "short" });
}
