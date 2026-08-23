import { useMutation } from '@tanstack/react-query'
import { createRobotApi } from '@/api/robots'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateRobotRequest } from '@/interface/robots'
import type { IMutation } from '@/interface/utils'

export const useCreateRobotMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, ICreateRobotRequest> = {}) => {
  return useMutation({
    mutationFn: createRobotApi,
    onSuccess,
    onError,
    onMutate,
  })
}
