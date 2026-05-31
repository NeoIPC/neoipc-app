import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { MultiSelectField, MultiSelectOption, NoticeBox } from '@dhis2/ui'
import React, { FC, useMemo } from 'react'
import { NEOIPC_CORE_PROGRAM_UID } from '../../config/dhis2Constants'

interface OrgUnitRow {
    id: string
    code: string
    displayName: string
    parent?: { displayName: string }
}

interface OrgUnitsQueryResult {
    ous: {
        organisationUnits: OrgUnitRow[]
    }
}

interface OrganisationUnitMultiSelectProps {
    name: string
    label: string
    helpText?: string
    /**
     * OrgUnit hierarchy level to filter to (`COUNTRY_LEVEL`,
     * `HOSPITAL_LEVEL`, or `DEPARTMENT_LEVEL` from `dhis2Constants`).
     */
    level: number
    /**
     * Selected orgUnit codes. The picker emits and consumes `code`
     * strings (the wire format the report endpoints accept), not
     * orgUnit UIDs.
     */
    selectedCodes: string[]
    onChange: (codes: string[]) => void
    /** Show the parent's `displayName` as a prefix in option labels. */
    showParentInLabel?: boolean
    disabled?: boolean
    required?: boolean
}

/**
 * Multi-select picker for orgUnits at a specific NeoIPC hierarchy
 * level (Country / Hospital / Department). The list is filtered to
 *   - orgUnits the current user has data-capture access to (`userOnly`)
 *   - orgUnits assigned to the NeoIPC core program (`D8mSSpOpsKj`)
 *   - the level passed in via the `level` prop.
 *
 * Values are orgUnit `code` strings — the wire format
 * `Partner-/Reference-Report`'s `UnitCodes` / `CountryFilter` /
 * `HospitalFilter` parameters expect. OrgUnits without a `code` are
 * filtered out (un-pickable) and a `NoticeBox` warning is rendered
 * alongside the select so operators know to ask the NeoIPC metadata
 * maintainers to add the missing codes upstream.
 */
const OrganisationUnitMultiSelect: FC<OrganisationUnitMultiSelectProps> = ({
    name,
    label,
    helpText,
    level,
    selectedCodes,
    onChange,
    showParentInLabel = false,
    disabled,
    required,
}) => {
    // LEARN: useMemo returns the SAME object until `level` changes. Without it, a
    // fresh query object every render would make useDataQuery think the query
    // changed and re-fetch endlessly. This is the main reason to reach for useMemo
    // (docs/03 §3.5). The query reads org units from the DHIS2 Web API (docs/04 §4.3).
    const query = useMemo(
        () => ({
            ous: {
                resource: 'organisationUnits',
                params: {
                    userOnly: true,
                    filter: [
                        `programs.id:eq:${NEOIPC_CORE_PROGRAM_UID}`,
                        `level:eq:${level}`,
                    ],
                    fields: 'id,code,displayName,parent[displayName]',
                    paging: false,
                },
            },
        }),
        [level]
    )

    const { loading, error, data } = useDataQuery<OrgUnitsQueryResult>(query)

    if (error) {
        return (
            <NoticeBox error title={label}>
                {i18n.t('Failed to load organisation units — {{message}}', {
                    message: error.message,
                })}
            </NoticeBox>
        )
    }

    const rows = data?.ous.organisationUnits ?? []
    const rowsWithoutCode = rows.filter(
        (row) => row.code === null || row.code === ''
    )
    const options = rows
        .filter((row) => row.code !== null && row.code !== '')
        .map((row) => ({
            value: row.code,
            label:
                showParentInLabel && row.parent?.displayName
                    ? `${row.parent.displayName} — ${row.displayName}`
                    : row.displayName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))

    return (
        <>
            {rowsWithoutCode.length > 0 && (
                <NoticeBox
                    warning
                    title={i18n.t(
                        '{{count}} organisation unit(s) missing a code and not selectable',
                        { count: rowsWithoutCode.length }
                    )}
                >
                    {i18n.t(
                        'These org units cannot be picked because they have no `code` set in DHIS2 metadata. Ask the NeoIPC metadata maintainers to add a code so they can be included in reports.'
                    )}
                </NoticeBox>
            )}
            <MultiSelectField
            dataTest={name}
            label={label}
            helpText={helpText}
            loading={loading}
            disabled={disabled}
            required={required}
            filterable
            clearable
            clearText={i18n.t('Clear')}
            filterPlaceholder={i18n.t('Search')}
            noMatchText={i18n.t('No match')}
            selected={selectedCodes}
            onChange={({ selected }) => onChange(selected)}
        >
            {options.map((option) => (
                <MultiSelectOption
                    key={option.value}
                    value={option.value}
                    label={option.label}
                />
            ))}
            </MultiSelectField>
        </>
    )
}

export default OrganisationUnitMultiSelect
