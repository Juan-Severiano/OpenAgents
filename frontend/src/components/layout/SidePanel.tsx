import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SidePanelProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function SidePanel({ open, title, onClose, children }: SidePanelProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <div
      className={cn(
        'fixed right-0 top-0 z-30 flex h-full w-[460px] flex-col',
        'bg-card border-l border-border shadow-2xl shadow-black/10 dark:shadow-black/50',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Gradient header inspired by UFC Flow reference */}
      <div className="relative flex h-16 shrink-0 items-center justify-between overflow-hidden px-5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent dark:from-primary/60 dark:via-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
        <span className="relative text-sm font-bold uppercase tracking-[0.12em] text-white drop-shadow-sm">
          {title}
        </span>
        <button
          onClick={onClose}
          className="relative rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {open && children}
      </div>
    </div>
  )
}
