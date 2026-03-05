import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const baseClasses = 'w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, children, className = '', ...props }, ref) => {
    const selectId = id || props.name
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${baseClasses} ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const textareaId = id || props.name
    return (
      <div>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${baseClasses} ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
