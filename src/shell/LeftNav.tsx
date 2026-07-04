import { Menu, MenuItem } from '@dhis2/ui'
import React, { FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuCategory } from '../menu/categories'

interface LeftNavProps {
    categories: MenuCategory[]
    /** Called after a category is selected — used to close the mobile drawer. */
    onNavigate?: () => void
}

/**
 * Authority-filtered left navigation. The {@link MenuCategory.icon} +
 * label come from the manifest; the active state comes from
 * `react-router-dom`'s current location.
 *
 * Navigation uses `useNavigate` (rather than `MenuItem`'s `href` /
 * anchor) so HashRouter resolves the segment via React Router instead
 * of relying on the browser's hashchange event.
 */
const LeftNav: FC<LeftNavProps> = ({ categories, onNavigate }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const currentSegment = location.pathname.replace(/^\//, '')

    return (
        <Menu>
            {categories.map((category) => (
                <MenuItem
                    key={category.id}
                    label={category.label()}
                    icon={category.icon}
                    active={currentSegment === category.id}
                    onClick={() => {
                        navigate(`/${category.id}`)
                        onNavigate?.()
                    }}
                />
            ))}
        </Menu>
    )
}

export default LeftNav
