import React, { InputHTMLAttributes, forwardRef } from 'react'

type InputBaseProps = InputHTMLAttributes<HTMLInputElement> & {
  tooltip?: string
}

export const InputBase = forwardRef<HTMLInputElement, InputBaseProps>(
  ({ tooltip, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-4 py-2 border-0 outline-none focus:ring-0 ${className}`}
        {...props}
      />
    )
  }
)

InputBase.displayName = 'InputBase'
