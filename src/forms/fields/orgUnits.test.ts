import {
    OrgUnitRow,
    allCodedUnitsExcluded,
    ancestorCountryCodesForSelection,
    anySelectedInGroup,
    pickableCodeSet,
} from './orgUnits'

const row = (
    code: string | null,
    groups: string[] = [],
    ancestors: { code: string | null; groups: string[] }[] = []
): OrgUnitRow => ({
    id: code ?? 'no-code',
    code,
    displayName: code ?? 'Unnamed',
    organisationUnitGroups: groups.map((c) => ({ code: c })),
    ancestors: ancestors.map((a) => ({
        code: a.code,
        organisationUnitGroups: a.groups.map((c) => ({ code: c })),
    })),
})

const ELIGIBLE = 'NEOIPC_ALL_PATIENTS_ELIGIBLE'
const COUNTRY = 'COUNTRY'

describe('anySelectedInGroup', () => {
    const rows = [
        row('D1', ['NEO_DEPARTMENT', ELIGIBLE]),
        row('D2', ['NEO_DEPARTMENT']),
    ]

    it('is true when a selected unit is in the group', () => {
        expect(anySelectedInGroup(rows, ['D1'], ELIGIBLE)).toBe(true)
    })
    it('is false when the only eligible unit is not selected', () => {
        expect(anySelectedInGroup(rows, ['D2'], ELIGIBLE)).toBe(false)
    })
    it('is false for a selection of codes not present in the rows', () => {
        expect(anySelectedInGroup(rows, ['X9'], ELIGIBLE)).toBe(false)
    })
    it('is false on an empty selection', () => {
        expect(anySelectedInGroup(rows, [], ELIGIBLE)).toBe(false)
    })
})

describe('ancestorCountryCodesForSelection', () => {
    it('resolves the country ancestor by group membership, not level', () => {
        const rows = [
            row('D1', ['NEO_DEPARTMENT'], [
                { code: 'C1', groups: [COUNTRY] },
                { code: 'H1', groups: ['HOSPITAL'] },
            ]),
        ]
        expect(ancestorCountryCodesForSelection(rows, ['D1'], COUNTRY)).toEqual([
            'C1',
        ])
    })

    it('returns distinct countries across the selection', () => {
        const rows = [
            row('D1', [], [{ code: 'C1', groups: [COUNTRY] }]),
            row('D2', [], [{ code: 'C1', groups: [COUNTRY] }]),
            row('D3', [], [{ code: 'C2', groups: [COUNTRY] }]),
        ]
        expect(
            ancestorCountryCodesForSelection(rows, ['D1', 'D2', 'D3'], COUNTRY)
        ).toEqual(['C1', 'C2'])
    })

    it('ignores unselected rows and codeless ancestors', () => {
        const rows = [
            row('D1', [], [{ code: 'C1', groups: [COUNTRY] }]),
            row('D2', [], [{ code: null, groups: [COUNTRY] }]),
        ]
        expect(ancestorCountryCodesForSelection(rows, ['D2'], COUNTRY)).toEqual(
            []
        )
    })
})

describe('pickableCodeSet', () => {
    it('includes coded rows and drops codeless ones', () => {
        const rows = [row('D1', ['NEO_DEPARTMENT']), row(null, ['NEO_DEPARTMENT'])]
        expect([...pickableCodeSet(rows, [])]).toEqual(['D1'])
    })

    it('drops rows belonging to an excluded group', () => {
        const rows = [
            row('D1', ['NEO_DEPARTMENT']),
            row('T1', ['NEO_DEPARTMENT', 'TEST_UNITS']),
        ]
        const set = pickableCodeSet(rows, ['TEST_UNITS'])
        expect(set.has('D1')).toBe(true)
        expect(set.has('T1')).toBe(false)
    })

    it('keeps every coded row when no groups are excluded', () => {
        const rows = [row('D1', ['TEST_UNITS']), row('D2', [])]
        expect([...pickableCodeSet(rows, [])].sort()).toEqual(['D1', 'D2'])
    })
})

describe('allCodedUnitsExcluded', () => {
    it('is true when every coded unit is in an excluded group', () => {
        const rows = [row('T1', ['NEO_DEPARTMENT', 'TEST_UNITS'])]
        expect(allCodedUnitsExcluded(rows, ['TEST_UNITS'])).toBe(true)
    })
    it('is false when at least one coded unit survives exclusion', () => {
        const rows = [
            row('D1', ['NEO_DEPARTMENT']),
            row('T1', ['NEO_DEPARTMENT', 'TEST_UNITS']),
        ]
        expect(allCodedUnitsExcluded(rows, ['TEST_UNITS'])).toBe(false)
    })
    it('is false when nothing is excluded', () => {
        const rows = [row('T1', ['TEST_UNITS'])]
        expect(allCodedUnitsExcluded(rows, [])).toBe(false)
    })
    it('is false when there are no coded units at all', () => {
        const rows = [row(null, ['TEST_UNITS'])]
        expect(allCodedUnitsExcluded(rows, ['TEST_UNITS'])).toBe(false)
    })
})
