import i18n from '@dhis2/d2-i18n'
import { Field, FieldGroup, InputField } from '@dhis2/ui'
import React, { FC } from 'react'
import styles from './NumberRangeField.module.css'

interface NumberRangeFieldProps {
    name: string
    label: string
    helpText?: string
    /** `null` for empty (matches the backend's nullable `ushort?` shape). */
    fromValue: number | null
    toValue: number | null
    onFromChange: (value: number | null) => void
    onToChange: (value: number | null) => void
    min?: number
    max?: number
    disabled?: boolean
    /** Mark both inputs and the group message as invalid. */
    error?: boolean
    /** Validation message shown beneath the pair (with `error`). */
    validationText?: string
}

const parseValue = (raw: string): number | null => {
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
}

/**
 * A `from`/`to` integer range, used for `BirthWeight*` and
 * `GestationalAge*` parameter pairs. Renders two `InputField`s in a
 * `FieldGroup` so they share a label and validation status; emits
 * `null` for empty cells (matching the backend's nullable `ushort?`).
 */
const NumberRangeField: FC<NumberRangeFieldProps> = ({
    name,
    label,
    helpText,
    fromValue,
    toValue,
    onFromChange,
    onToChange,
    min,
    max,
    disabled,
    error,
    validationText,
}) => (
    <FieldGroup
        label={label}
        helpText={helpText}
        name={name}
        error={error}
        validationText={error ? validationText : undefined}
    >
        <div className={styles.pair}>
            <Field label={i18n.t('From')} name={`${name}-from`}>
                <InputField
                    type="number"
                    name={`${name}-from`}
                    value={fromValue === null ? '' : String(fromValue)}
                    onChange={(payload) =>
                        onFromChange(parseValue(payload.value ?? ''))
                    }
                    min={min === undefined ? undefined : String(min)}
                    max={max === undefined ? undefined : String(max)}
                    disabled={disabled}
                    error={error}
                />
            </Field>
            <Field label={i18n.t('To')} name={`${name}-to`}>
                <InputField
                    type="number"
                    name={`${name}-to`}
                    value={toValue === null ? '' : String(toValue)}
                    onChange={(payload) =>
                        onToChange(parseValue(payload.value ?? ''))
                    }
                    min={min === undefined ? undefined : String(min)}
                    max={max === undefined ? undefined : String(max)}
                    disabled={disabled}
                    error={error}
                />
            </Field>
        </div>
    </FieldGroup>
)

export default NumberRangeField
