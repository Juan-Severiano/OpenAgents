import { useQuery } from '@tanstack/react-query'
import { skillsApi } from '../api/skills'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const typeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  builtin: 'default',
  custom_python: 'secondary',
  custom_http: 'secondary',
  mcp_tool: 'outline',
}

export function SkillsPage() {
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsApi.list(),
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Skills</h1>
        <p className="text-sm text-muted-foreground">{skills.length} skills available</p>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <Card key={skill.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{skill.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Badge variant={typeVariant[skill.type] ?? 'outline'}>{skill.type}</Badge>
                <Badge variant="outline">{skill.source}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{skill.description}</p>
              <p className="text-xs font-mono text-muted-foreground">{skill.name}</p>
            </CardContent>
          </Card>
        ))}
        {!isLoading && skills.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-12">
            No skills registered yet. Skills will appear here once seeded.
          </p>
        )}
      </div>
    </div>
  )
}
