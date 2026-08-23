export const RobotModel = {
  STANDARD: 'STANDARD',
  LITE: 'LITE',
  PRO: 'PRO',
} as const

export type RobotModelType = (typeof RobotModel)[keyof typeof RobotModel]

export const LIST_ROBOT_MODELS = Object.values(RobotModel)

export const ROBOT_CONNECTION_STATUS = {
  ONLINE: 'ONLINE',
  STALE: 'STALE',
  OFFLINE: 'OFFLINE',
}

export type RobotConnectionStatusType =
  (typeof ROBOT_CONNECTION_STATUS)[keyof typeof ROBOT_CONNECTION_STATUS]

export const ROBOT_OPERATION_STATUS = {
  IDLE: 'IDLE',
  EXECUTING: 'EXECUTING',
  CHARGING: 'CHARGING',
}

export type RobotOperationStatusType =
  (typeof ROBOT_OPERATION_STATUS)[keyof typeof ROBOT_OPERATION_STATUS]
