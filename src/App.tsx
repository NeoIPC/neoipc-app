import { useConfig, useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import {
    Center,
    CircularLoader,
    CssReset,
    CssVariables,
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
