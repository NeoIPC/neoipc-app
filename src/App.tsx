// LEARN: This is the ROOT component — the top of the whole app (declared as the
// entry point in d2.config.js). Its job is "startup gating": fetch the two things
// the rest of the app assumes exist (the current user, the reference datasets),
// show a spinner/error until they arrive, then mount everything else.
// New here? Read docs/06-annotated-codebase-tour.md ("The entry point") alongside
// this file, and docs/05-architecture-overview.md §5.2 for the startup sequence.
import { useConfig, useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    Center,
    CircularLoader,
    CssReset,
    CssVariables,
    HeaderBar,
    NoticeBox,
} from '@dhis2/ui'
import React, { FC, useEffect, useState } from 'react'
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

// LEARN: A `useDataQuery` request is DECLARED as a plain object, not written as a
// fetch() call. This describes `GET /api/me?fields=id,authorities` against the
// DHIS2 Web API. The runtime runs it and hands back loading/error/data for us.
// (DHIS2 reads go through useDataQuery; the *separate* NeoIPC-Reporting service is
// reached with our own fetch wrapper in src/api/. See docs/04 §4.3.)
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

    // LEARN: useEffect runs a side-effect (here: a network fetch) AFTER render.
    // The `[baseUrl]` at the bottom is the dependency array — re-run only if it
    // changes. The returned function is cleanup; React calls it if the component
    // disappears mid-fetch, flipping `cancelled` so a late result is ignored.
    // This cancel-flag pattern is standard React; see docs/03-react.md §3.5.
    useEffect(() => {
        let cancelled = false
        loadReferenceDataSets(baseUrl)
            .then((sets) => {
                if (!cancelled) setReferenceDataSets(sets)
            })
            .catch((err: Error) => {
                if (cancelled) return
                // A 401/403 here means the user has no NeoIPC access (or no
                // session for the /neoipc/ mount). Treat as an empty list so
                // AppShell can render its dedicated "No NeoIPC access" notice
                // — keyed off the user's authorities — instead of the generic
                // "Failed to load NeoIPC app data" error notice below.
                if (
                    err instanceof NeoipcReportingError &&
                    (err.response.status === 401 ||
                        err.response.status === 403)
                ) {
                    setReferenceDataSets([])
                    return
                }
                setRefDataError(err)
            })
        return () => {
            cancelled = true
        }
    }, [baseUrl])

    const loading = meLoading || (referenceDataSets === null && refDataError === null)
    const error = meError ?? refDataError

    return (
        <>
            <CssReset />
            <CssVariables colors spacers theme />
            <HeaderBar appName={i18n.t('NeoIPC')} />
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
                // LEARN: Order matters here. AppContextProvider makes the fetched
                // data readable by any descendant via useAppContext() (no
                // "prop drilling"); HashRouter enables URL routing below it. Both
                // must wrap the components that use them. See docs/03 §3.6 & §3.8.
                <AppContextProvider
                    value={{
                        me: meData.me,
                        referenceDataSets,
                    }}
                >
                    <HashRouter>
                        <AppShell />
                    </HashRouter>
                </AppContextProvider>
            )}
        </>
    )
}

export default App
