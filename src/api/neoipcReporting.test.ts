import {
    NeoipcReportingError,
    fetchNeoipcReporting,
    neoipcReportingUrl,
} from './neoipcReporting'

describe('neoipcReportingUrl', () => {
    it('joins the DHIS2 base, the reporting mount, and the path', () => {
        expect(
            neoipcReportingUrl('https://dhis.example', '/reference-data')
        ).toBe('https://dhis.example/neoipc/api/reference-data')
    })

    it('strips a single trailing slash from the base URL', () => {
        expect(
            neoipcReportingUrl('https://dhis.example/', '/reference-data')
        ).toBe('https://dhis.example/neoipc/api/reference-data')
    })

    it('preserves a base URL that carries a sub-path', () => {
        expect(neoipcReportingUrl('https://host/dhis', '/admin/x')).toBe(
            'https://host/dhis/neoipc/api/admin/x'
        )
    })
})

describe('fetchNeoipcReporting', () => {
    const realFetch = global.fetch
    afterEach(() => {
        global.fetch = realFetch
        jest.restoreAllMocks()
    })

    it('sends the DHIS2 session cookie and returns the response on 2xx', async () => {
        const ok = { ok: true, status: 200 } as unknown as Response
        const fetchMock = jest.fn().mockResolvedValue(ok)
        global.fetch = fetchMock as unknown as typeof fetch

        const res = await fetchNeoipcReporting(
            'https://dhis.example',
            '/reference-data',
            { method: 'GET' }
        )

        expect(res).toBe(ok)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://dhis.example/neoipc/api/reference-data')
        expect(init).toMatchObject({ method: 'GET', credentials: 'include' })
    })

    it('throws NeoipcReportingError carrying the raw response on non-2xx', async () => {
        const notFound = {
            ok: false,
            status: 404,
            statusText: 'Not Found',
        } as unknown as Response
        global.fetch = jest
            .fn()
            .mockResolvedValue(notFound) as unknown as typeof fetch

        const err = await fetchNeoipcReporting('https://dhis.example', '/missing')
            .then(() => {
                throw new Error('expected fetchNeoipcReporting to reject')
            })
            .catch((e) => e)

        expect(err).toBeInstanceOf(NeoipcReportingError)
        expect((err as NeoipcReportingError).response.status).toBe(404)
    })
})
