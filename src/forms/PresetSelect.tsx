import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import React, { FC } from 'react'
import { PresetMap } from '../api/reportConfig'

/**
 * The client-only pseudo-preset that unlocks the individual content
 * controls for hand-editing. Not a server-defined preset.
 */
export const CUSTOM_PRESET = 'custom'

const presetLabel = (name: string): string => {
    switch (name) {
        case 'default':
            return i18n.t('Default')
        case 'minimal':
            return i18n.t('Minimal')
        case 'full':
            return i18n.t('Full')
        case CUSTOM_PRESET:
            return i18n.t('Custom')
        default:
            return name
    }
}

interface PresetSelectProps {
    /** Server-defined presets (`null` while loading). */
    presets: PresetMap | null
    /** Currently-selected preset name (a server preset, or {@link CUSTOM_PRESET}). */
    value: string
    onChange: (preset: string) => void
}

/**
 * Selector for a report's content preset. The server presets come from
 * `GET /<report>/presets`; selecting one fills (and the form then locks)
 * the governed content controls. The always-present "Custom" entry
 * unlocks them for individual editing.
 */
const PresetSelect: FC<PresetSelectProps> = ({ presets, value, onChange }) => {
    const names = presets ? Object.keys(presets) : []
    return (
        <SingleSelectField
            label={i18n.t('Content preset')}
            helpText={i18n.t(
                'A preset fills the content options below. Choose "Custom" to edit each one yourself.'
            )}
            selected={value}
            loading={presets === null}
            onChange={({ selected }) => onChange(selected)}
        >
            {names.map((name) => (
                <SingleSelectOption
                    key={name}
                    value={name}
                    label={presetLabel(name)}
                />
            ))}
            <SingleSelectOption
                value={CUSTOM_PRESET}
                label={presetLabel(CUSTOM_PRESET)}
            />
        </SingleSelectField>
    )
}

export default PresetSelect
