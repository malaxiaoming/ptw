interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}
