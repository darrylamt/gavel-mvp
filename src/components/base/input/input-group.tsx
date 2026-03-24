import React, { ReactNode } from 'react'

type InputGroupProps = {
  label?: string
  hint?: string
  isRequired?: boolean
  leadingAddon?: ReactNode
  children: ReactNode
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  hint,
  isRequired,
  leadingAddon,
  children,
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {isRequired && <span className="ml-0.5 text-orange-500">*</span>}
        </label>
      )}

      <div className="flex h-11 overflow-hidden rounded-xl border border-gray-200 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
        {leadingAddon && (
          <div className="flex items-center bg-gray-50 px-3 border-r border-gray-200 text-sm text-gray-500 shrink-0">
            {leadingAddon}
          </div>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
