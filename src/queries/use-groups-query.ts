// @refresh reset

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'
import {
  acceptGroupInvitationAPI,
  changeActiveGroupAPI,
  createGroupApi,
  deleteGroupMemberAPI,
  getGroupInvitationAPI,
  getGroupMembersApi,
  getListGroupKeyValue,
  inviteGroupMembersApi,
} from '@/api/groups'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { KEY_STORAGE } from '@/enum/key-storage'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type {
  ICreateGroupRequest,
  IDeleteMemberRequest,
  IGroupInfo,
  IGroupMemberListInfo,
  IGroupMemberListRequest,
  IInviteGroupMembersRequest,
  ISwitchGroupRequest,
} from '@/interface/groups'
import type { IAxiosError, IMutation, ReactQueryHookParams } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { GET_PROFILE_QUERY_KEY } from './auth-query-keys'

const getListGroupKeyValueQueryKey = (params: unknown, queryKey: unknown[]) => {
  return [GROUPS_ENDPOINTS.LIST_KEY_VALUE, GROUPS_ENDPOINTS.LIST_GROUP, params, ...queryKey]
}

export const getGroupMembersQueryKey = (
  params: IGroupMemberListRequest,
  queryKey: unknown[] = [],
) => [GROUPS_ENDPOINTS.LIST_MEMBERS, params, ...queryKey]

export const useCreateGroupMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<IGroupInfo>, ICreateGroupRequest> = {}) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ICreateGroupRequest) => {
      return await createGroupApi(data)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: GET_PROFILE_QUERY_KEY })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}

export const useListGroupKeyValueQuery = ({
  params,
  queryKey = [],
  enabled = true,
}: ReactQueryHookParams<null>) => {
  return useQuery({
    queryKey: getListGroupKeyValueQueryKey(params, queryKey),
    queryFn: async ({ signal }) => {
      const res = await getListGroupKeyValue({ signal })
      return res
    },
    enabled,
  })
}

export const useGroupMembersQuery = ({
  params,
  queryKey = [],
  enabled = true,
}: ReactQueryHookParams<IGroupMemberListRequest>) => {
  return useQuery<IResponseDataWithPage<IGroupMemberListInfo>>({
    queryKey: getGroupMembersQueryKey(params, queryKey),
    queryFn: async ({ signal }) => await getGroupMembersApi(params, signal),
    enabled,
    staleTime: 5000, // 5 seconds
  })
}

export const useInviteGroupMembersMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, IInviteGroupMembersRequest> = {}) => {
  return useMutation({
    mutationFn: (data) => inviteGroupMembersApi(data?.group_id ?? '', data?.members ?? []),
    onSuccess,
    onError,
    onMutate,
  })
}

export const useChangeActiveGroupMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, ISwitchGroupRequest>) => {
  const queryClient = useQueryClient()
  const toastID = useRef<string | number>(undefined)
  return useMutation({
    mutationFn: async (data: ISwitchGroupRequest) => {
      const res = await changeActiveGroupAPI(data)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_PROFILE_QUERY_KEY })
      toast.success('Active group changed successfully', { id: toastID.current })
      onSuccess?.()
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error as IAxiosError)
      toast.error(errorMessage, { id: toastID.current })
      onError?.(error)
    },
    onMutate: () => {
      toastID.current = toast.loading('Changing active group...')
      onMutate?.()
    },
  })
}

export const useGetGroupInvitationQuery = () => {
  const invitationID = localStorage.getItem(KEY_STORAGE.INVITATION_ID)

  return useQuery({
    queryFn: ({ signal }) => getGroupInvitationAPI(invitationID ?? '', signal),
    enabled: !!invitationID,
    queryKey: [GROUPS_ENDPOINTS.GET_GROUP_INVITATION, invitationID],
  })
}

export const useAcceptGroupInvitationMutation = ({
  onError,
  onMutate,
  onSuccess,
}: IMutation<void, string>) => {
  const invitationID = localStorage.getItem(KEY_STORAGE.INVITATION_ID)
  const queryClient = useQueryClient()
  const translation = getTranslations()
  return useMutation({
    mutationFn: async () => {
      return await acceptGroupInvitationAPI(invitationID ?? '')
    },
    onError: (error) => {
      onError?.(error)
      toast.error(getErrorMessage(error as IAxiosError) || translation.group_invite_member_error())
    },
    onMutate,
    onSuccess: () => {
      onSuccess?.()
      queryClient.invalidateQueries({ queryKey: GET_PROFILE_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: [GROUPS_ENDPOINTS.LIST_KEY_VALUE, GROUPS_ENDPOINTS.LIST_GROUP],
      })
      localStorage.removeItem(KEY_STORAGE.INVITATION_ID)
    },
  })
}

export const useDeleteMemberMutation = ({
  onError,
  onMutate,
  onSuccess,
}: IMutation<void, IDeleteMemberRequest>) => {
  return useMutation({
    mutationFn: async (data: IDeleteMemberRequest) => {
      return await deleteGroupMemberAPI(data)
    },
    onError: (error) => {
      onError?.(error)
      toast.error(getErrorMessage(error as IAxiosError))
    },
    onMutate,
    onSuccess,
  })
}
