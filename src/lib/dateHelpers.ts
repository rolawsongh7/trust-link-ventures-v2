import { subDays } from 'date-fns';

export const getDateRangeForPeriod = (period: string): { from: Date; to: Date } | null => {
  const now = new Date();
  
  switch (period) {
    case 'week':
      return { from: subDays(now, 7), to: now };
    case 'month':
      return { from: subDays(now, 30), to: now };
    case 'quarter':
      return { from: subDays(now, 90), to: now };
    case 'year':
      return { from: subDays(now, 365), to: now };
    default:
      return null;
  }
};

export const isDateInRange = (date: Date, range: { from: Date; to: Date } | null): boolean => {
  if (!range) return true;
  const checkDate = new Date(date);
  return checkDate >= range.from && checkDate <= range.to;
};
