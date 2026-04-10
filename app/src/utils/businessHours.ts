type FacilityHoursInput = {
  opening_hours?: string | null;
  opening_hours_json?: Array<{
    day: string;
    open: boolean;
    from: string;
    to: string;
  }> | null;
  open_now?: boolean | null;
  temporary_closed?: boolean | null;
};

const DAY_TOKENS: Record<string, number> = {
  lun: 1,
  lundi: 1,
  mon: 1,
  monday: 1,
  mar: 2,
  mardi: 2,
  tue: 2,
  tues: 2,
  tuesday: 2,
  mer: 3,
  mercredi: 3,
  wed: 3,
  wednesday: 3,
  jeu: 4,
  jeudi: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  ven: 5,
  vendredi: 5,
  fri: 5,
  friday: 5,
  sam: 6,
  samedi: 6,
  sat: 6,
  saturday: 6,
  dim: 0,
  dimanche: 0,
  sun: 0,
  sunday: 0,
};

const normalizeToken = (value: string): string => value.trim().toLowerCase();

const parseTimeToMinutes = (value: string): number | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const expandDayRange = (fromDay: number, toDay: number): number[] => {
  if (fromDay === toDay) {
    return [fromDay];
  }
  const days: number[] = [];
  let current = fromDay;
  for (let i = 0; i < 7; i += 1) {
    days.push(current);
    if (current === toDay) {
      break;
    }
    current = (current + 1) % 7;
  }
  return days;
};

const parseDays = (value: string): number[] => {
  const cleaned = value
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\bet\b/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return [];
  }

  const allDaysMatch = cleaned.match(/\b(lun-?dim|mon-?sun|tous les jours|daily|every day)\b/);
  if (allDaysMatch) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const set = new Set<number>();
  const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);

  parts.forEach((part) => {
    const rangeMatch = part.match(/^([a-z]+)\s*-\s*([a-z]+)$/);
    if (rangeMatch) {
      const from = DAY_TOKENS[normalizeToken(rangeMatch[1])];
      const to = DAY_TOKENS[normalizeToken(rangeMatch[2])];
      if (from !== undefined && to !== undefined) {
        expandDayRange(from, to).forEach((day) => set.add(day));
      }
      return;
    }

    const single = DAY_TOKENS[normalizeToken(part)];
    if (single !== undefined) {
      set.add(single);
    }
  });

  return Array.from(set);
};

const isOpenForRange = (currentMinutes: number, fromMinutes: number, toMinutes: number): boolean => {
  if (fromMinutes === toMinutes) {
    return true;
  }
  if (fromMinutes < toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }
  return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
};

const computeOpenFromOpeningHoursJson = (
  openingHoursJson:
    | Array<{
        day: string;
        open: boolean;
        from: string;
        to: string;
      }>
    | null
    | undefined
): boolean | null => {
  if (!Array.isArray(openingHoursJson) || openingHoursJson.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayNames: Record<number, string[]> = {
    0: ['dimanche', 'dim', 'sunday', 'sun'],
    1: ['lundi', 'lun', 'monday', 'mon'],
    2: ['mardi', 'mar', 'tuesday', 'tue'],
    3: ['mercredi', 'mer', 'wednesday', 'wed'],
    4: ['jeudi', 'jeu', 'thursday', 'thu'],
    5: ['vendredi', 'ven', 'friday', 'fri'],
    6: ['samedi', 'sam', 'saturday', 'sat'],
  };

  const todaySet = new Set(dayNames[currentDay]);
  const row = openingHoursJson.find((entry) => todaySet.has(String(entry.day ?? '').trim().toLowerCase()));
  if (!row) {
    return null;
  }
  if (!row.open) {
    return false;
  }

  const fromMinutes = parseTimeToMinutes(row.from);
  const toMinutes = parseTimeToMinutes(row.to);
  if (fromMinutes === null || toMinutes === null) {
    return null;
  }

  return isOpenForRange(currentMinutes, fromMinutes, toMinutes);
};

const computeOpenFromOpeningHours = (openingHours: string | null | undefined): boolean | null => {
  if (!openingHours || !openingHours.trim()) {
    return null;
  }

  const raw = openingHours.replace(/\n/g, ';');
  const segments = raw.split(';').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let parsedAtLeastOne = false;
  let hasRuleForToday = false;

  for (const segment of segments) {
    const segmentClean = segment.replace(/\(.*?\)/g, '').trim();

    const fullDayMatch = segmentClean.match(/^(.+?)\s+(24h\/24|24\/7|service continu)$/i);
    if (fullDayMatch) {
      const days = parseDays(fullDayMatch[1]);
      if (days.length > 0) {
        parsedAtLeastOne = true;
        if (days.includes(currentDay)) {
          return true;
        }
      }
      continue;
    }

    const match = segmentClean.match(/^(.+?)[:\s]+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i);
    if (!match) {
      continue;
    }

    const days = parseDays(match[1]);
    const fromMinutes = parseTimeToMinutes(match[2]);
    const toMinutes = parseTimeToMinutes(match[3]);
    if (days.length === 0 || fromMinutes === null || toMinutes === null) {
      continue;
    }

    parsedAtLeastOne = true;
    if (!days.includes(currentDay)) {
      continue;
    }

    hasRuleForToday = true;
    if (isOpenForRange(currentMinutes, fromMinutes, toMinutes)) {
      return true;
    }
  }

  if (!parsedAtLeastOne) {
    return null;
  }

  if (hasRuleForToday) {
    return false;
  }

  return false;
};

export const isFacilityOpenNow = (facility: FacilityHoursInput): boolean => {
  if (facility.temporary_closed) {
    return false;
  }

  // "Open for business" switch is authoritative: if turned off, the facility is closed.
  if (!facility.open_now) {
    return false;
  }

  const computedFromJson = computeOpenFromOpeningHoursJson(facility.opening_hours_json);
  if (computedFromJson !== null) {
    return computedFromJson;
  }

  const computed = computeOpenFromOpeningHours(facility.opening_hours);
  if (computed !== null) {
    return computed;
  }

  return true;
};
