import { Menu, MenuItem } from '@dhis2/ui'
import React, { FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuCategory } from '../menu/categories'

// LEARN: `categories` is a "prop" — an input passed in by the parent (AppShell).
// Props flow down and are read-only inside this component. The interface below
// declares the exact shape this component expects. See docs/03-react.md §3.4.
interface LeftNavProps {
    categories: MenuCategory[]
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
const LeftNav: FC<LeftNavProps> = ({ categories }) => {
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
                    onClick={() => navigate(`/${category.id}`)}
                />
            ))}
        </Menu>
    )
}

export default LeftNav
