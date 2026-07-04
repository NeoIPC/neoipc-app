import { Center, CircularLoader } from '@dhis2/ui'
import React, { FC, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { MenuCategory } from '../menu/categories'
import styles from './ContentArea.module.css'

interface ContentAreaProps {
    visibleCategories: MenuCategory[]
}

/**
 * Route outlet for the shell's main pane. Renders the matched
 * category's lazy-loaded `Page`. Routes a user lacks authority for
 * are not declared at all — visiting one redirects to the first
 * visible category.
 */
const ContentArea: FC<ContentAreaProps> = ({ visibleCategories }) => {
    const fallbackId = visibleCategories[0]?.id ?? ''

    return (
        <Suspense
            fallback={
                <Center>
                    <CircularLoader />
                </Center>
            }
        >
            <div className={styles.page}>
                <Routes>
                    {visibleCategories.map(({ id, Page }) => (
                        <Route key={id} path={id} element={<Page />} />
                    ))}
                    <Route
                        path="*"
                        element={<Navigate to={`/${fallbackId}`} replace />}
                    />
                </Routes>
            </div>
        </Suspense>
    )
}

export default ContentArea
