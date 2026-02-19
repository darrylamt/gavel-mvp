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
      <div className="w-full space-y-2">
        {label && (
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span>
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </span>
            {tooltip && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white cursor-help"
                title={tooltip}
              >
                ?
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />}
          <input
            ref={ref}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
              Icon ? 'pl-10' : ''
            } ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
            {...props}
          />
        </div>

        {hint && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
