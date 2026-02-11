import React, { SelectHTMLAttributes, forwardRef } from 'react'

type Option = {
  value: string | number
  label: string
}

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[]
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ options, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`outline-none border-0 focus:ring-0 bg-transparent text-sm ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }
)

NativeSelect.displayName = 'NativeSelect'
