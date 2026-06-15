import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect, useState } from 'react'
import { OrgUnitsPage, PAGE_SIZE } from './orgUnits'

const namesQuery = (groupCode: string, page: number) => ({
    ous: {
        resource: 'organisationUnits',
        params: {
            withinUserHierarchy: true,
            filter: [`organisationUnitGroups.code:eq:${groupCode}`],
            fields: 'id,code,displayName',
            order: 'id:asc',
            pageSize: PAGE_SIZE,
            page,
        },
    },
})

/**
 * `code → displayName` map for org-units in the group `groupCode` that
 * lie **within the current user's hierarchy** (`withinUserHierarchy`),
 * matching the picker and neoipcr.
 *
 * Deliberately scoped: we do NOT resolve names for org-units the user
 * has no stake in. A reference dataset can reference countries/hospitals
 * outside the user's scope, but surfacing their *names* would expose
 * which org-units participate to unconnected users — an organizational-
 * confidentiality concern. DHIS2 metadata read (sharing) is **not** a
 * sufficient boundary here (org-unit metadata is often broadly
 * readable), so we scope by hierarchy, not by read access. Out-of-scope
 * units fall back to their bare `code` (already present in the public
 * reference-data listing). Returns `{}` while loading or on error;
 * codeless units are skipped.
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
