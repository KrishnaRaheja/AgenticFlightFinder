import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats an ISO date string as "Mon DD, YYYY" (e.g. "Mar 16, 2026"). */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

/** Formats an ISO date string as "Mon DD" (e.g. "Mar 16") — for compact contexts. */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}
