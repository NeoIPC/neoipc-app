import { useDataEngine } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { MultiSelectField, MultiSelectOption, NoticeBox } from '@dhis2/ui'
import React, { FC, useEffect, useRef, useState } from 'react'
import { OrgUnitRow, OrgUnitsPage, orgUnitsQuery } from './orgUnits'

interface OrganisationUnitMultiSelectProps {
    name: string
    label: string
    helpText?: string
    /**
     * Org-unit group code identifying the role to filter to
     * (`COUNTRY_GROUP_CODE`, `HOSPITAL_GROUP_CODE`, or
     * `DEPARTMENT_GROUP_CODE` from `dhis2Constants`).
     */
    groupCode: string
    /**
     * Selected orgUnit codes. The picker emits and consumes `code`
     * strings (the wire format the report endpoints accept), not
     * orgUnit UIDs.
     */
    selectedCodes: string[]
    onChange: (codes: string[]) => void
    /** Show the parent's `displayName` as a prefix in option labels. */
    showParentInLabel?: boolean
    /**
     * Called once the full org-unit list has loaded, with the enriched
     * rows (group membership + ancestors). Lets a parent form derive
     * facts about the selected units — e.g. eligibility-group membership
     * or ancestor country — without issuing a second query.
     */
    onRowsLoaded?: (rows: OrgUnitRow[]) => void
    disabled?: boolean
    required?: boolean
}

/**
 * Multi-select picker for orgUnits of a specific NeoIPC role
 * (Country / Hospital / Department). The list is filtered to
 *   - orgUnits within the current user's data-view hierarchy
 *     (`withinUserHierarchy`)
 *   - orgUnits in the role's org-unit group (the `groupCode` prop).
 *
 * Role is identified by group membership, not hierarchy level — see
 * `dhis2Constants` for why level is not a stable contract.
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
    groupCode,
    selectedCodes,
    onChange,
    showParentInLabel = false,
    onRowsLoaded,
    disabled,
    required,
}) => {
    const engine = useDataEngine()
    const [rows, setRows] = useState<OrgUnitRow[] | null>(null)
    const [error, setError] = useState<Error | null>(null)

    // Held in a ref so a changing `onRowsLoaded` identity doesn't
    // re-trigger the fetch effect (which keys only on engine + groupCode).
    const onRowsLoadedRef = useRef(onRowsLoaded)
    onRowsLoadedRef.current = onRowsLoaded

    useEffect(() => {
        let cancelled = false
        setRows(null)
        setError(null)

        const fetchAllPages = async (): Promise<OrgUnitRow[]> => {
            const collected: OrgUnitRow[] = []
            let page = 1
            let pageCount = 1
            do {
                const result = (await engine.query(
                    orgUnitsQuery(groupCode, page)
                )) as unknown as OrgUnitsPage
                collected.push(...result.ous.organisationUnits)
                pageCount = result.ous.pager?.pageCount ?? 1
                page += 1
            } while (page <= pageCount)
            return collected
        }

        fetchAllPages()
            .then((all) => {
                if (!cancelled) {
                    setRows(all)
                    onRowsLoadedRef.current?.(all)
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err : new Error(String(err))
                    )
                }
            })

        return () => {
            cancelled = true
        }
    }, [engine, groupCode])

    if (error) {
        return (
            <NoticeBox error title={label}>
                {i18n.t('Failed to load organisation units — {{message}}', {
                    message: error.message,
                })}
            </NoticeBox>
        )
    }

    const loading = rows === null
    const loadedRows = rows ?? []
    const rowsWithoutCode = loadedRows.filter(
        (row) => row.code === null || row.code === ''
    )
    const options = loadedRows
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
