// LEARN: This is the "router outlet" — it shows whichever page matches the current
// URL. <Suspense> shows a spinner while a lazily-loaded page chunk downloads (see
// React.lazy in src/menu/categories.tsx). Routes the user lacks authority for were
// already filtered out upstream, so they aren't even declared. See docs/03 §3.7-3.8.
import { Center, CircularLoader } from '@dhis2/ui'
import React, { FC, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { MenuCategory } from '../menu/categories'

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
            <Routes>
                {/* LEARN: Build one <Route> per visible category by mapping over
                    the array. Each element in a mapped list needs a stable `key`
                    so React can track it efficiently (docs/03 §3.3). */}
                {visibleCategories.map(({ id, Page }) => (
                    <Route key={id} path={id} element={<Page />} />
                ))}
                <Route
                    path="*"
                    element={<Navigate to={`/${fallbackId}`} replace />}
                />
            </Routes>
        </Suspense>
    )
}

export default ContentArea
