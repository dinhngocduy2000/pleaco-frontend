export enum USERS_ENDPOINTS {
  CHECK_EMAIL_EXISTS = '/users/check-existence',
}

export enum AUTH_ENDPOINTS {
  LOGIN = '/auth/login',
  REGISTER = '/auth/register',
  TRACK_SESSION = '/auth/track',
  PROFILE = '/auth/profile',
  REFRESH_TOKEN = '/auth/refresh',
  LOGOUT = '/auth/logout',
  SSO_LOGIN_URL = '/auth/sso',
  VALIDATE_OTP = '/auth/validate-otp',
}

export enum GROUPS_ENDPOINTS {
  CREATE = '/groups/create',
  LIST_KEY_VALUE = '/groups/key-value',
  LIST_GROUP = '/groups',
  CHANGE_ACTIVE_GROUP = '/groups/switch',
}

export enum EVENTS_ENDPOINTS {
  /** `GET` — query: `IEventCalendarRequest`; resolves to `{baseURL}/v1/events` when `baseURL` ends with `/api`. */
  EVENT_CALENDAR = '/events',
}
