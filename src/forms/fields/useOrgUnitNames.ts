import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect, useState } from 'react'
import { OrgUnitsPage, PAGE_SIZE } from './orgUnits'

const namesQuery = (groupCode: string, page: number) => ({
    ous: {
        resource: 'organisationUnits',
        params: {
            filter: [`organisationUnitGroups.code:eq:${groupCode}`],
            fields: 'id,code,displayName',
            order: 'id:asc',
            pageSize: PAGE_SIZE,
            page,
        },
    },
})

/**
 * `code → displayName` map for every org-unit in the group `groupCode`.
 * Unlike the picker, this is **not** restricted to the user's hierarchy
 * (`withinUserHierarchy`) — it's a label lookup, and a dataset can
 * reference countries outside the partner's own scope. Returns `{}`
 * while loading or on error, so callers fall back to showing the raw
 * code. Codeless units are skipped.
 */
export const useOrgUnitNames = (groupCode: string): Record<string, string> => {
    const engine = useDataEngine()
    const [names, setNames] = useState<Record<string, string>>({})

    useEffect(() => {
        let cancelled = false

        const fetchAll = async (): Promise<Record<string, string>> => {
            const map: Record<string, string> = {}
            let page = 1
            let pageCount = 1
            do {
                const result = (await engine.query(
                    namesQuery(groupCode, page)
                )) as unknown as OrgUnitsPage
                for (const row of result.ous.organisationUnits) {
                    if (row.code) map[row.code] = row.displayName
                }
                pageCount = result.ous.pager?.pageCount ?? 1
                page += 1
            } while (page <= pageCount)
            return map
        }

        fetchAll()
            .then((map) => {
                if (!cancelled) setNames(map)
            })
            .catch(() => {
                if (!cancelled) setNames({})
            })

        return () => {
            cancelled = true
        }
    }, [engine, groupCode])

    return names
}
