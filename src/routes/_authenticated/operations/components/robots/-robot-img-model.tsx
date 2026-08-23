import { RobotModel, type RobotModelType } from '@/enum/robot'

type Props = {
  model: RobotModelType
}

const RobotImageByModel = ({ model }: Props) => {
  const imageSrcByModel: Record<RobotModelType, string> = {
    [RobotModel.STANDARD]: '/assets/images/pleaco-bot-image.png',
    [RobotModel.LITE]: '/assets/images/pleaco-bot-lite.png',
    [RobotModel.PRO]: '/assets/images/pleaco-bot-pro.png',
  }
  return (
    <img src={imageSrcByModel[model]} alt="" className="h-full w-full object-cover object-center" />
  )
}

export default RobotImageByModel
