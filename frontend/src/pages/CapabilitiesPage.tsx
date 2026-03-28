import { useQuery } from '@tanstack/react-query'
import { capabilitiesApi } from '../api/capabilities'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'

const typeAccent: Record<string, string> = {
  reasoning: 'bg-violet-500',
  tool_use: 'bg-cyan-500',
  memory: 'bg-blue-500',
  communication: 'bg-green-500',
}

export function CapabilitiesPage() {
  const { data: capabilities = [], isLoading } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => capabilitiesApi.list(),
  })

  return (
    <div>
      <div className="border-b border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {capabilities.length} available
        </span>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}

        {capabilities.map((cap) => (
          <div key={cap.id} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
            <div className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-tight">{cap.display_name}</p>
                <div className="flex shrink-0 gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{cap.type}</Badge>
                  {cap.is_builtin && <Badge variant="outline" className="text-[10px]">builtin</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{cap.description}</p>
              {cap.system_prompt_injection && (
                <p className="mt-1.5 text-[10px] italic text-muted-foreground/70 line-clamp-1">
                  Injects: {cap.system_prompt_injection}
                </p>
              )}
            </div>
            <div className={cn('h-1', typeAccent[cap.type] ?? 'bg-primary')} />
          </div>
        ))}

        {!isLoading && capabilities.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No capabilities registered yet.
          </p>
        )}
      </div>
    </div>
  )
}
