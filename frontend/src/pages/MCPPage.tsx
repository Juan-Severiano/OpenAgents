import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Link2Off, Trash2 } from 'lucide-react'

import { mcpServersApi } from '../api/mcpServers'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'

const statusAccent: Record<string, string> = {
  disconnected: 'bg-muted-foreground/30',
  connecting: 'bg-primary',
  connected: 'bg-green-500',
  error: 'bg-destructive',
}

const statusDot: Record<string, string> = {
  disconnected: 'bg-muted-foreground',
  connecting: 'bg-primary animate-pulse',
  connected: 'bg-green-500',
  error: 'bg-destructive',
}

export function MCPPage() {
  const qc = useQueryClient()
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => mcpServersApi.list(),
    refetchInterval: 10_000,
  })

  const connectMutation = useMutation({
    mutationFn: (id: string) => mcpServersApi.connect(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mcp-servers'] }),
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => mcpServersApi.disconnect(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mcp-servers'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mcpServersApi.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['mcp-servers'] }),
  })

  return (
    <div>
      <div className="border-b border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {servers.length} server{servers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}

        {servers.map((server) => (
          <div key={server.id} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
            <div className="p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 shrink-0 rounded-full', statusDot[server.status] ?? 'bg-muted')} />
                  <p className="text-sm font-semibold leading-tight">{server.display_name}</p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(server.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="secondary" className="text-[10px]">{server.status}</Badge>
                <Badge variant="outline" className="text-[10px]">{server.transport}</Badge>
                {(server.discovered_tools?.length ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[10px]">{server.discovered_tools?.length} tools</Badge>
                )}
              </div>

              {server.description && (
                <p className="mb-2 text-xs text-muted-foreground line-clamp-1">{server.description}</p>
              )}
              {(server.command || server.url) && (
                <p className="mb-3 font-mono text-[10px] text-muted-foreground truncate">
                  {server.command ?? server.url}
                </p>
              )}

              {server.status !== 'connected' ? (
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => connectMutation.mutate(server.id)} disabled={server.status === 'connecting'}>
                  <Link2 className="mr-2 h-3 w-3" /> Connect
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => disconnectMutation.mutate(server.id)}>
                  <Link2Off className="mr-2 h-3 w-3" /> Disconnect
                </Button>
              )}
            </div>
            <div className={cn('h-1', statusAccent[server.status] ?? 'bg-muted')} />
          </div>
        ))}

        {!isLoading && servers.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No MCP servers configured yet.
          </p>
        )}
      </div>
    </div>
  )
}
