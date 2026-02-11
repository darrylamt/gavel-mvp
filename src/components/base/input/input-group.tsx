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
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex border border-gray-300 rounded-lg overflow-hidden">
        {leadingAddon && <div className="flex items-center px-3 bg-gray-50 border-r border-gray-300">{leadingAddon}</div>}
        <div className="flex-1">{children}</div>
      </div>

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
