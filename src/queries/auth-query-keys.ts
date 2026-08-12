import { AUTH_ENDPOINTS } from '@/enum/endpoints'

/** Shared TanStack Query keys (no hooks — safe for modules imported during HMR). */
export const GET_TRACK_SESSION_QUERY_KEY = [AUTH_ENDPOINTS.TRACK_SESSION]
export const GET_PROFILE_QUERY_KEY = [AUTH_ENDPOINTS.PROFILE]
