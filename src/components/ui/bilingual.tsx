import { t } from '@/lib/i18n/zh'

interface BilingualTextProps {
  en: string
  zh?: string
  className?: string
}

export function BilingualText({ en, zh, className }: BilingualTextProps) {
  const chinese = zh ?? t(en)
  if (!chinese) return <span className={className}>{en}</span>
  return (
    <span className={className}>
      {en}
      <span className="block text-xs text-gray-500 mt-0.5">{chinese}</span>
    </span>
  )
}
