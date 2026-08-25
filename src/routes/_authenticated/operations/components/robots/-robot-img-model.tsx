import { RobotModel, type RobotModelType } from '@/enum/robot'

type Props = {
  model: RobotModelType
}

const RobotImageByModel = ({ model }: Props) => {
  const imageSrcByModel: Record<RobotModelType, string> = {
    [RobotModel.STANDARD]: '/assets/images/pleaco-bot-image-1024.webp',
    [RobotModel.LITE]: '/assets/images/pleaco-bot-lite-1024.webp',
    [RobotModel.PRO]: '/assets/images/pleaco-bot-pro-1024.webp',
  }
  const imageSrcSetByModel: Record<RobotModelType, string> = {
    [RobotModel.STANDARD]: [480, 768, 1024]
      .map((width) => `/assets/images/pleaco-bot-image-${width}.webp ${width}w`)
      .join(', '),
    [RobotModel.LITE]: [480, 768, 1024]
      .map((width) => `/assets/images/pleaco-bot-lite-${width}.webp ${width}w`)
      .join(', '),
    [RobotModel.PRO]: [480, 768, 1024]
      .map((width) => `/assets/images/pleaco-bot-pro-${width}.webp ${width}w`)
      .join(', '),
  }
  return (
    <img
      src={imageSrcByModel[model]}
      srcSet={imageSrcSetByModel[model]}
      sizes="(min-width: 1280px) 14rem, 100vw"
      alt=""
      className="h-full w-full object-cover object-center"
    />
  )
}

export default RobotImageByModel
