import i18n from '@dhis2/d2-i18n'
import { NoticeBox } from '@dhis2/ui'
import React, { FC } from 'react'
import { useAuthorities } from '../authority/useAuthorities'
import { visibleCategories } from '../menu/categories'
import ContentArea from './ContentArea'
import LeftNav from './LeftNav'
import styles from './Shell.module.css'

/**
 * Two-pane shell: left navigation (authority-filtered) + content
 * route outlet. Rendered inside `<HashRouter>` by `App`.
 *
 * Users whose authorities don't grant access to any category see a
 * dedicated "no access" notice instead of an empty shell.
 */
const AppShell: FC = () => {
    // LEARN: `has` is a predicate from our custom hook — has('NEOIPC_ADMIN') etc.
    // visibleCategories filters the menu down to what THIS user may see. The same
    // filtered list feeds both the nav and the routes, so they can't disagree.
    // Access control is explained in docs/08-styling-i18n-and-authorities.md §8.3.
    const { has } = useAuthorities()
    const categories = visibleCategories(has)

    if (categories.length === 0) {
        return (
            <div className={styles.noAccess}>
                <NoticeBox
                    title={i18n.t('No NeoIPC access')}
                    warning
                >
                    {i18n.t(
                        'Your DHIS2 account does not hold any NeoIPC authority. ' +
                            'Ask a NeoIPC administrator to assign you the ' +
                            'NeoIPC Reporter or NeoIPC Administrator role.'
                    )}
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.shell}>
            <nav className={styles.leftNav}>
                <LeftNav categories={categories} />
            </nav>
            <main className={styles.contentArea}>
                <ContentArea visibleCategories={categories} />
            </main>
        </div>
    )
}

export default AppShell
