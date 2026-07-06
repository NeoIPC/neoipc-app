import { useConfig, useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
// Register the app's generated translation bundles into the shared i18n
// instance. Without this side-effect import the bundles are never included in
// the build, so `i18n.t` returns the key and the UI stays English regardless of
// the user's DHIS2 locale.
// eslint-disable-next-line import/order
import './locales'
import {
    Center,
    CircularLoader,
    CssReset,
    CssVariables,
    NoticeBox,
} from '@dhis2/ui'
import React, { FC, useCallback, useEffect, useState } from 'react'
import { HashRouter } from 'react-router-dom'
import {
    AppContextProvider,
    MeData,
    PublicReferenceDataMetadata,
} from './AppContext'
import { NeoipcReportingError } from './api/neoipcReporting'
import { loadReferenceDataSets } from './api/referenceData'
import './render/report-theme.css'
import AppShell from './shell/AppShell'

interface MeQueryResult {
    me: MeData
}

const meQuery = {
    me: {
        resource: 'me',
        params: { fields: 'id,authorities' },
    },
}

const App: FC = () => {
    const { baseUrl } = useConfig()
    const {
        loading: meLoading,
        error: meError,
        data: meData,
    } = useDataQuery<MeQueryResult>(meQuery)

    const [referenceDataSets, setReferenceDataSets] = useState<
        PublicReferenceDataMetadata[] | null
    >(null)
    const [refDataError, setRefDataError] = useState<Error | null>(null)

    // Fetch (and re-fetch) the shared reference-dataset listing. On success it
    // updates the shared value seamlessly (no loading flash on a refresh); a
    // 401/403 means no NeoIPC access, surfaced as an empty list so AppShell can
    // show its dedicated notice. Any other error is re-thrown for the caller to
    // handle — the initial load gates the app on it; an admin-triggered refresh
    // keeps the existing list and swallows it (non-blocking).
    const reloadReferenceDataSets = useCallback(async () => {
        try {
            setReferenceDataSets(await loadReferenceDataSets(baseUrl))
        } catch (err) {
            if (
                err instanceof NeoipcReportingError &&
                (err.response.status === 401 || err.response.status === 403)
            ) {
                setReferenceDataSets([])
                return
            }
            throw err
        }
    }, [baseUrl])

    useEffect(() => {
        let cancelled = false
        reloadReferenceDataSets().catch((err: Error) => {
            if (!cancelled) setRefDataError(err)
        })
        return () => {
            cancelled = true
        }
    }, [reloadReferenceDataSets])

    const loading = meLoading || (referenceDataSets === null && refDataError === null)
    const error = meError ?? refDataError

    return (
        <>
            <CssReset />
            <CssVariables colors spacers theme />
            {loading ? (
                <Center>
                    <CircularLoader />
                </Center>
            ) : error || !meData || !referenceDataSets ? (
                <Center>
                    <NoticeBox
                        error
                        title={i18n.t('Failed to load NeoIPC app data')}
                    >
                        {error?.message ?? i18n.t('Unknown error')}
                    </NoticeBox>
                </Center>
            ) : (
                <AppContextProvider
                    value={{
                        me: meData.me,
                        referenceDataSets,
                        reloadReferenceDataSets,
                    }}
                >
                    <HashRouter
                        future={{
                            v7_startTransition: true,
                            v7_relativeSplatPath: true,
                        }}
                    >
                        <AppShell />
                    </HashRouter>
                </AppContextProvider>
            )}
        </>
    )
}

export default App
