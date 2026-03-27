import { useQuery } from '@tanstack/react-query'
import { capabilitiesApi } from '../api/capabilities'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

export function CapabilitiesPage() {
  const { data: capabilities = [], isLoading } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => capabilitiesApi.list(),
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Capabilities</h1>
        <p className="text-sm text-muted-foreground">{capabilities.length} capabilities available</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((cap) => (
          <Card key={cap.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cap.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="secondary">{cap.type}</Badge>
                {cap.is_builtin && <Badge variant="outline">builtin</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{cap.description}</p>
              {cap.system_prompt_injection && (
                <p className="text-xs italic text-muted-foreground line-clamp-2">
                  Injects: {cap.system_prompt_injection}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && capabilities.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-12">
            No capabilities registered yet.
          </p>
        )}
      </div>
    </div>
  )
}
