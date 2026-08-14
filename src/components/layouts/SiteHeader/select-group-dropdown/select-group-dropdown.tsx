import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import type { IOption } from '@/interface/utils'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useListGroupKeyValueQuery } from '@/queries/use-groups-query'

const SelectGroupDropdown = () => {
  const [selectedTeam, setSelectedTeam] = useState<IOption | undefined>(undefined)
  const { data: profileResponse } = useProfileQuery()
  const { data: groupKeyValueListData } = useListGroupKeyValueQuery({
    params: null,
  })
  const [searchValue, setSearchValue] = useState<string>('')
  // const handleChangeActiveGroup = async (group_id: string) => {
  //   if (!group_id) return
  //   if (group_id === user?.group_id) return
  //   await changeActiveGroup({ group_id })
  // }
  const listGroupKeyValueWithIcon = useMemo(
    () =>
      (groupKeyValueListData?.data ?? [])
        .map((item) => ({
          ...item,
          icon: item.label,
        }))
        .filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase())),
    [groupKeyValueListData?.data, searchValue],
  )
  // const { mutateAsync: changeActiveGroup } = useChangeActiveGroupMutation({})
  const handleSearchTeam = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  useEffect(
    function setDefaultSelectedTeam() {
      const defaultGroup = profileResponse?.data?.group
      if (defaultGroup) {
        setSelectedTeam({
          ...defaultGroup,
          icon: defaultGroup.label,
        })
      }
    },
    [profileResponse],
  )

  return (
    <AppSelectComponent
      options={listGroupKeyValueWithIcon}
      value={selectedTeam}
      onChange={() => {
        // handleChangeActiveGroup(value?.value ?? '')
        return
      }}
      placeholder="Select team..."
      className="w-48"
      searchable
      onSearchChange={handleSearchTeam}
    />
  )
}

export default SelectGroupDropdown
