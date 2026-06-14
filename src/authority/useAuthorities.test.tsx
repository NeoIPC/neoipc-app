import { useAppContext } from '../AppContext'
import { renderHook } from '../test-utils/renderHook'
import { useAuthorities } from './useAuthorities'

jest.mock('../AppContext', () => ({
    useAppContext: jest.fn(),
}))

const mockedUseAppContext = useAppContext as jest.MockedFunction<
    typeof useAppContext
>

const withAuthorities = (authorities: string[]): void => {
    mockedUseAppContext.mockReturnValue({
        me: { id: 'u1', authorities },
        referenceDataSets: [],
    })
}

describe('useAuthorities', () => {
    afterEach(() => jest.clearAllMocks())

    it('grants an authority the user explicitly holds and denies the others', () => {
        withAuthorities(['NEOIPC_REPORT'])
        const { result } = renderHook(() => useAuthorities())
        expect(result.current.has('NEOIPC_REPORT')).toBe(true)
        expect(result.current.has('NEOIPC_ADMIN')).toBe(false)
    })

    it('treats the DHIS2 superuser authority (ALL) as holding every gate', () => {
        withAuthorities(['ALL'])
        const { result } = renderHook(() => useAuthorities())
        expect(result.current.has('NEOIPC_ADMIN')).toBe(true)
        expect(result.current.has('NEOIPC_REPORT')).toBe(true)
    })

    it('denies everything when the user holds no authorities', () => {
        withAuthorities([])
        const { result } = renderHook(() => useAuthorities())
        expect(result.current.has('NEOIPC_ADMIN')).toBe(false)
        expect(result.current.has('NEOIPC_REPORT')).toBe(false)
    })
})
