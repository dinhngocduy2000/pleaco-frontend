/** Mirrors backend `EventCategory` (snake_case string values). */
export const EventCategory = {
  HANG_OUT: 'hang_out',
  DATE: 'date',
  BUSINESS: 'business',
  COFFEE_HOPPING: 'coffee',
  FOOD_TOUR: 'food',
  GAMING: 'gaming',
  MOVIE: 'movie',
  OTHER: 'other',
} as const

export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory]
