import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMapApi } from '@/api/maps'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateMapRequest } from '@/interface/maps'
import type { IMutation } from '@/interface/utils'

export const getMapsQueryKey = (queryKey: unknown[] = []) => [MAPS_ENDPOINTS.LIST, ...queryKey]

export const useCreateMapMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, ICreateMapRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMapApi,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: getMapsQueryKey() })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}
