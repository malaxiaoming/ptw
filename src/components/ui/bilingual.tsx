interface BilingualTextProps {
  en: string
  zh?: string
  className?: string
}

export function BilingualText({ en, zh, className }: BilingualTextProps) {
  if (!zh) return <span className={className}>{en}</span>
  return (
    <span className={className}>
      {en}
      <span className="block text-xs text-gray-500 mt-0.5">{zh}</span>
    </span>
  )
}
