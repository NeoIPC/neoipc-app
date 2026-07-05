import { NeoipcReportingError } from './neoipcReporting'
import { enrichError } from './problemDetails'

const makeError = (
    status: number,
    body: unknown,
    contentType = 'application/problem+json'
): NeoipcReportingError => {
    const response = {
        status,
        statusText: '',
        headers: {
            get: (h: string) =>
                h === 'content-type' ? contentType : null,
        },
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : ''),
    } as unknown as Response
    return new NeoipcReportingError(response)
}

describe('enrichError', () => {
    it('maps a known code to a friendly, user-domain message', async () => {
        const err = await enrichError(
            makeError(400, { code: 'missing-unit-codes' })
        )
        expect(err.message).toBe('Select at least one department.')
    })

    it('names the control for a stale/invalid benchmark dataset', async () => {
        const err = await enrichError(
            makeError(404, { code: 'reference-dataset-not-found' })
        )
        expect(err.message).toContain('benchmark dataset')
    })

    it('prefers the mapped message over the backend title/detail', async () => {
        const err = await enrichError(
            makeError(400, {
                code: 'missing-unit-codes',
                title: 'Missing unitCodes',
                detail: "The 'unitCodes' query parameter is required.",
            })
        )
        expect(err.message).toBe('Select at least one department.')
    })

    it('falls back to title/detail for an unmapped code', async () => {
        const err = await enrichError(
            makeError(400, { code: 'some-future-code', title: 'Odd', detail: 'thing' })
        )
        expect(err.message).toBe('Odd — thing')
    })

    it('falls back to title/detail when there is no code', async () => {
        const err = await enrichError(
            makeError(400, {
                title: 'Invalid period',
                detail: 'from is after to',
            })
        )
        expect(err.message).toBe('Invalid period — from is after to')
    })

    it('uses a generic render message for an empty 500 body', async () => {
        const err = await enrichError(makeError(500, {}))
        expect(err.message).toMatch(/generating the report/i)
    })

    it('surfaces a trimmed non-JSON text body', async () => {
        const err = await enrichError(makeError(500, 'boom text', 'text/plain'))
        expect(err.message).toBe('boom text')
    })

    it('passes a non-reporting error through unchanged', async () => {
        const err = await enrichError(new Error('network down'))
        expect(err.message).toBe('network down')
    })
})
