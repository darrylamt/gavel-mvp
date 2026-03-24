import React, { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  tooltip?: string
  icon?: React.ComponentType<{ className?: string }>
  isRequired?: boolean
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, tooltip, icon: Icon, isRequired, error, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span>
              {label}
              {isRequired && <span className="ml-0.5 text-orange-500">*</span>}
            </span>
            {tooltip && (
              <span
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 transition-colors hover:bg-gray-200"
                title={tooltip}
              >
                ?
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
          <input
            ref={ref}
            className={[
              'h-11 w-full rounded-xl border px-4 text-sm text-gray-900 transition-colors',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400',
              'disabled:cursor-not-allowed disabled:opacity-60',
              Icon ? 'pl-10' : '',
              error
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                : 'border-gray-200 bg-white',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
        </div>

        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
