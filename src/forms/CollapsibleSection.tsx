import { Card } from '@dhis2/ui'
import React, { FC, ReactNode, useState } from 'react'

interface CollapsibleSectionProps {
    /** Section heading shown on the toggle row. */
    title: string
    /** Open on first render. Defaults to collapsed. */
    defaultOpen?: boolean
    children: ReactNode
}

/**
 * A {@link Card} whose body collapses behind a clickable header — the
 * progressive-disclosure primitive for the report forms (essentials stay
 * visible, secondary options live inside these). `@dhis2/ui` has no
 * accordion/disclosure component, so this is a minimal accessible
 * toggle (`aria-expanded` on a real `<button>`).
 */
const CollapsibleSection: FC<CollapsibleSectionProps> = ({
    title,
    defaultOpen = false,
    children,
}) => {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <Card>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: '1.1em',
                    fontWeight: 600,
                    textAlign: 'left',
                }}
            >
                <span>{title}</span>
                <span aria-hidden>{open ? '▾' : '▸'}</span>
            </button>
            {open && <div>{children}</div>}
        </Card>
    )
}

export default CollapsibleSection
