import { useEffect, useState } from 'react'
import { ActionIcon, Button, Combobox, Group, Modal, ScrollArea, Stack, Text, TextInput, Tooltip, useCombobox } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { addFavorite, listFavoriteGroups, listFavorites } from '../../services/api'
import { useT } from '../../i18n'
import type { LatLng } from './types'

type Props = {
  point: LatLng | null
}

type FavoriteGroupPickerProps = {
  value: string
  groups: string[]
  placeholder: string
  loading?: boolean
  loadingLabel: string
  emptyLabel: string
  onChange: (value: string) => void
}

export const FAVORITE_GROUP_DROPDOWN_Z_INDEX = 10000

export function FavoriteGroupPicker({ value, groups, placeholder, loading = false, loadingLabel, emptyLabel, onChange }: FavoriteGroupPickerProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  })
  const matchingGroups = groups.filter((item) => item.toLocaleLowerCase().includes(value.toLocaleLowerCase()))

  return (
    <Combobox
      store={combobox}
      withinPortal
      zIndex={FAVORITE_GROUP_DROPDOWN_Z_INDEX}
      onOptionSubmit={(option) => {
        onChange(option)
        combobox.closeDropdown()
      }}
    >
      <Combobox.Target>
        <TextInput
          value={value}
          maxLength={40}
          placeholder={placeholder}
          rightSection={(
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={placeholder}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => combobox.toggleDropdown()}
            >
              <Combobox.Chevron />
            </ActionIcon>
          )}
          rightSectionPointerEvents="all"
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
          onChange={(event) => {
            onChange(event.currentTarget.value)
            combobox.openDropdown()
            combobox.updateSelectedOptionIndex()
          }}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <ScrollArea.Autosize mah={180} type="auto" offsetScrollbars>
          <Combobox.Options>
            {loading
              ? <Combobox.Empty>{loadingLabel}</Combobox.Empty>
              : matchingGroups.length === 0
                ? <Combobox.Empty>{emptyLabel}</Combobox.Empty>
                : matchingGroups.map((item) => <Combobox.Option value={item} key={item}>{item}</Combobox.Option>)}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  )
}

export function FavoriteButton({ point }: Props) {
  const t = useT()
  const [added, setAdded] = useState(false)
  const [isNaming, setIsNaming] = useState(false)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [existingGroups, setExistingGroups] = useState<string[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  useEffect(() => {
    if (!isNaming) return
    let cancelled = false
    setGroupsLoading(true)
    Promise.allSettled([listFavorites(), listFavoriteGroups()])
      .then(([favoritesResult, groupsResult]) => {
        if (cancelled) return
        const favorites = favoritesResult.status === 'fulfilled' ? favoritesResult.value : []
        const savedGroups = groupsResult.status === 'fulfilled' ? groupsResult.value : []
        const groups = Array.from(new Set([...savedGroups, ...favorites.map((favorite) => favorite.group).filter(Boolean)])).sort()
        setExistingGroups(groups)
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false)
      })
    return () => { cancelled = true }
  }, [isNaming])

  function handleOpenNaming() {
    if (!point) return
    setName('')
    setGroup('')
    setIsNaming(true)
  }

  async function handleAdd() {
    if (!point || !name.trim()) return
    try {
      await addFavorite({ name: name.trim(), lat: point.lat, lng: point.lng, group: group.trim() })
      setAdded(true)
      setIsNaming(false)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      // ignore, non-critical
    }
  }

  return (
    <>
      <Tooltip label={t('favorites.add')}>
        <ActionIcon variant="subtle" color="yellow" disabled={!point} onClick={handleOpenNaming} aria-label={t('favorites.add')}>
          {added ? <IconStarFilled size={17} /> : <IconStar size={17} />}
        </ActionIcon>
      </Tooltip>
      <Modal opened={isNaming && !!point} onClose={() => setIsNaming(false)} title={t('favorites.name_title')} centered size="sm">
        {point && <form onSubmit={(event) => { event.preventDefault(); void handleAdd() }}>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</Text>
            <TextInput autoFocus value={name} maxLength={80} onChange={(event) => setName(event.currentTarget.value)} placeholder={t('favorites.name_placeholder')} />
            <FavoriteGroupPicker
              value={group}
              groups={existingGroups}
              placeholder={t('favorites.group_placeholder')}
              loading={groupsLoading}
              loadingLabel={t('favorites.group_loading')}
              emptyLabel={t('favorites.group_empty')}
              onChange={setGroup}
            />
            <Group justify="flex-end"><Button variant="default" onClick={() => setIsNaming(false)}>{t('favorites.cancel')}</Button><Button type="submit" disabled={!name.trim()}>{t('favorites.save')}</Button></Group>
          </Stack>
        </form>}
      </Modal>
    </>
  )
}
