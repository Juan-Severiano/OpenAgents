import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Link2Off, Trash2 } from 'lucide-react'

import { mcpServersApi } from '../api/mcpServers'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'outline'
> = {
  disconnected: 'secondary',
  connecting: 'default',
  connected: 'success',
  error: 'destructive',
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
        <p className="text-sm text-muted-foreground">{servers.length} servers configured</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{server.display_name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(server.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge variant={statusVariant[server.status] ?? 'outline'}>{server.status}</Badge>
                <Badge variant="outline">{server.transport}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{server.description}</p>
              {server.command && (
                <p className="text-xs font-mono text-muted-foreground truncate">{server.command}</p>
              )}
              {server.url && (
                <p className="text-xs font-mono text-muted-foreground truncate">{server.url}</p>
              )}
              {(server.discovered_tools?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {server.discovered_tools?.length} tools discovered
                </p>
              )}
              <div className="flex gap-2">
                {server.status !== 'connected' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => connectMutation.mutate(server.id)}
                    disabled={server.status === 'connecting'}
                  >
                    <Link2 className="mr-2 h-3 w-3" /> Connect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => disconnectMutation.mutate(server.id)}
                  >
                    <Link2Off className="mr-2 h-3 w-3" /> Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && servers.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-12">
            No MCP servers configured yet.
          </p>
        )}
      </div>
    </div>
  )
}
