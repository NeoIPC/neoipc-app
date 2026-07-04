import i18n from '@dhis2/d2-i18n'
import { NoticeBox } from '@dhis2/ui'
import React, { FC, useEffect, useState } from 'react'
import { useAuthorities } from '../authority/useAuthorities'
import { visibleCategories } from '../menu/categories'
import ContentArea from './ContentArea'
import LeftNav from './LeftNav'
import styles from './Shell.module.css'

/**
 * Two-pane shell: left navigation (authority-filtered) + content
 * route outlet. Rendered inside `<HashRouter>` by `App`.
 *
 * On desktop the nav is a fixed sidebar; on narrow viewports it
 * collapses to an off-canvas drawer toggled by the hamburger button
 * and dismissed on selection, backdrop tap, or Escape.
 *
 * Users whose authorities don't grant access to any category see a
 * dedicated "no access" notice instead of an empty shell.
 */
const AppShell: FC = () => {
    const { has } = useAuthorities()
    const categories = visibleCategories(has)
    const [navOpen, setNavOpen] = useState(false)

    // Close the mobile drawer on Escape while it is open.
    useEffect(() => {
        if (!navOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setNavOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [navOpen])

    if (categories.length === 0) {
        return (
            <div className={styles.noAccess}>
                <NoticeBox title={i18n.t('No NeoIPC access')} warning>
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
            <button
                type="button"
                className={styles.hamburger}
                aria-label={i18n.t('Open navigation menu')}
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path
                        d="M3 6h18M3 12h18M3 18h18"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2"
                    />
                </svg>
            </button>
            {navOpen && (
                <div
                    className={styles.backdrop}
                    aria-hidden="true"
                    onClick={() => setNavOpen(false)}
                />
            )}
            <nav
                className={`${styles.leftNav} ${
                    navOpen ? styles.leftNavOpen : ''
                }`}
            >
                <LeftNav
                    categories={categories}
                    onNavigate={() => setNavOpen(false)}
                />
            </nav>
            <main className={styles.contentArea}>
                <ContentArea visibleCategories={categories} />
            </main>
        </div>
    )
}

export default AppShell
