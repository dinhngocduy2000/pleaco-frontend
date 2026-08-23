export enum RobotModel {
  STANDARD = 'STANDARD',
  LITE = 'LITE',
  PRO = 'PRO',
}

export type RobotModelType = RobotModel

export const LIST_ROBOT_MODELS = Object.values(RobotModel)
