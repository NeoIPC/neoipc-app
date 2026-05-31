// LEARN: A small reusable "field" component that wraps a @dhis2/ui widget and
// adapts it to the shape our forms want (here: a plain 'YYYY-MM-DD' string). The
// fields/ folder holds these adapters so the big forms stay readable. The
// `?` on optional props in the interface = "may be omitted" (docs/02 §2.9).
import { CalendarInput } from '@dhis2/ui'
import React, { FC } from 'react'

interface DateFieldProps {
    name: string
    label: string
    helpText?: string
    /** ISO date string (`YYYY-MM-DD`), or empty string for no selection. */
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    required?: boolean
}

/**
 * Date picker that emits an ISO `YYYY-MM-DD` string, matching the wire
 * format for the backend's `DateOnly` parameters
 * (`ReportingPeriodFrom`, `ReportingPeriodTo`, etc.). Wraps
 * `@dhis2/ui`'s `CalendarInput` which calls `onDateSelect` with
 * `null` for "cleared" or `{ calendarDateString: 'YYYY-MM-DD' }` for
 * a selection — we normalise both to a plain string.
 */
const DateField: FC<DateFieldProps> = ({
    name,
    label,
    helpText,
    value,
    onChange,
    disabled,
    required,
}) => (
    <CalendarInput
        name={name}
        label={label}
        helpText={helpText}
        calendar="gregory"
        format="YYYY-MM-DD"
        clearable
        date={value}
        onDateSelect={(payload) =>
            onChange(payload?.calendarDateString ?? '')
        }
        disabled={disabled}
        required={required}
    />
)

export default DateField
