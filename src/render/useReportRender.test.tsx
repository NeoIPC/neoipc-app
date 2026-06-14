import { act } from 'react'
import { NeoipcReportingError } from '../api/neoipcReporting'
import { downloadBlob } from '../api/reports'
import type { RenderResult } from '../api/reports'
import { renderHook } from '../test-utils/renderHook'
import { useReportRender } from './useReportRender'

jest.mock('@dhis2/app-runtime', () => ({
    useConfig: () => ({ baseUrl: 'https://dhis.example' }),
}))

// Mock the reports module so the pdf branch's downloadBlob — which calls
// URL.createObjectURL, unimplemented in jsdom — is a no-op spy. The render
// function itself is injected per-test, so the real render*Report are unused.
jest.mock('../api/reports', () => ({
    downloadBlob: jest.fn(),
}))

const mockedDownloadBlob = downloadBlob as jest.MockedFunction<
    typeof downloadBlob
>

afterEach(() => jest.clearAllMocks())

describe('useReportRender', () => {
    it('passes the configured baseUrl to render and stores an html result', async () => {
        const html: RenderResult = { format: 'html', fragmentHtml: '<h1>R</h1>' }
        const render = jest.fn().mockResolvedValue(html)
        const { result } = renderHook(() => useReportRender(render))

        await act(async () => {
            await result.current.submit({ unit: 'DEP_A' })
        })

        expect(render).toHaveBeenCalledWith('https://dhis.example', {
            unit: 'DEP_A',
        })
        expect(result.current.loading).toBe(false)
        expect(result.current.result).toEqual(html)
        expect(result.current.error).toBeNull()
        expect(mockedDownloadBlob).not.toHaveBeenCalled()
    })

    it('routes a pdf result into a browser download and leaves result null', async () => {
        const blob = {} as Blob
        const pdf: RenderResult = {
            format: 'pdf',
            blob,
            suggestedFileName: 'partner-report.pdf',
        }
        const render = jest.fn().mockResolvedValue(pdf)
        const { result } = renderHook(() => useReportRender(render))

        await act(async () => {
            await result.current.submit({})
        })

        expect(mockedDownloadBlob).toHaveBeenCalledWith(
            blob,
            'partner-report.pdf'
        )
        expect(result.current.result).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('enriches an RFC 7807 problem+json error with its title and detail', async () => {
        const response = {
            status: 400,
            statusText: 'Bad Request',
            headers: {
                get: (h: string) =>
                    h === 'content-type' ? 'application/problem+json' : null,
            },
            json: async () => ({
                title: 'Invalid period',
                detail: 'from is after to',
            }),
        } as unknown as Response
        const render = jest
            .fn()
            .mockRejectedValue(new NeoipcReportingError(response))
        const { result } = renderHook(() => useReportRender(render))

        await act(async () => {
            await result.current.submit({})
        })

        expect(result.current.loading).toBe(false)
        expect(result.current.result).toBeNull()
        expect(result.current.error?.message).toBe(
            '400 Bad Request: Invalid period — from is after to'
        )
    })

    it('passes a non-reporting error through unchanged', async () => {
        const render = jest.fn().mockRejectedValue(new Error('network down'))
        const { result } = renderHook(() => useReportRender(render))

        await act(async () => {
            await result.current.submit({})
        })

        expect(result.current.error?.message).toBe('network down')
    })

    it('reset() clears a previously stored result', async () => {
        const html: RenderResult = { format: 'html', fragmentHtml: '<p>x</p>' }
        const render = jest.fn().mockResolvedValue(html)
        const { result } = renderHook(() => useReportRender(render))

        await act(async () => {
            await result.current.submit({})
        })
        expect(result.current.result).toEqual(html)

        act(() => {
            result.current.reset()
        })
        expect(result.current.result).toBeNull()
    })
})
