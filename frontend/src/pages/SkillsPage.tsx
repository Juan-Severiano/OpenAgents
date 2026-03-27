import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Pencil, Play, Plus, Trash2 } from 'lucide-react'

import { skillsApi, type Skill, type SkillCreate } from '../api/skills'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const typeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  builtin: 'default',
  custom_python: 'secondary',
  custom_http: 'secondary',
  mcp_tool: 'outline',
}

const EMPTY_FORM: SkillCreate = {
  name: '',
  display_name: '',
  description: '',
  type: 'custom_python',
  source: 'user_defined',
  input_schema: { type: 'object', properties: {} },
  is_public: false,
}

// ── Skill form dialog (create + edit) ────────────────────────────────────────

function SkillFormDialog({
  trigger,
  initial,
  skillId,
}: {
  trigger: React.ReactNode
  initial?: SkillCreate
  skillId?: string
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SkillCreate>(initial ?? EMPTY_FORM)
  const [schemaError, setSchemaError] = useState('')

  const qc = useQueryClient()
  const isEdit = Boolean(skillId)

  const mutation = useMutation({
    mutationFn: (data: SkillCreate) =>
      isEdit ? skillsApi.update(skillId!, data) : skillsApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] })
      setOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSchemaError('')
    try {
      const schema =
        typeof form.input_schema === 'string'
          ? JSON.parse(form.input_schema as unknown as string)
          : form.input_schema
      mutation.mutate({ ...form, input_schema: schema })
    } catch {
      setSchemaError('Invalid JSON in input schema')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Skill' : 'Create Custom Skill'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name (machine)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="my_skill"
                required
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="My Skill"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              required
            />
          </div>
          {!isEdit && (
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom_python">Custom Python</SelectItem>
                  <SelectItem value="custom_http">Custom HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Input Schema (JSON Schema)</Label>
            <Textarea
              value={
                typeof form.input_schema === 'string'
                  ? (form.input_schema as unknown as string)
                  : JSON.stringify(form.input_schema, null, 2)
              }
              onChange={(e) => {
                setSchemaError('')
                setForm((f) => ({
                  ...f,
                  input_schema: e.target.value as unknown as Record<string, unknown>,
                }))
              }}
              rows={4}
              className="font-mono text-xs"
            />
            {schemaError && <p className="text-xs text-destructive">{schemaError}</p>}
          </div>
          {(form.type === 'custom_python' || (isEdit && initial?.implementation !== undefined)) && (
            <div className="space-y-1">
              <Label>Python Implementation</Label>
              <Textarea
                value={form.implementation ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, implementation: e.target.value }))}
                rows={6}
                placeholder={'# Use print() for output or set result = ...\nresult = "hello"'}
                className="font-mono text-xs"
              />
            </div>
          )}
          {form.type === 'custom_http' && (
            <div className="space-y-1">
              <Label>HTTP Config (JSON)</Label>
              <Textarea
                value={
                  typeof form.http_config === 'string'
                    ? (form.http_config as unknown as string)
                    : JSON.stringify(form.http_config ?? { url: '', method: 'GET' }, null, 2)
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    http_config: e.target.value as unknown as Record<string, unknown>,
                  }))
                }
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create Skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Test panel ────────────────────────────────────────────────────────────────

function TestPanel({ skill }: { skill: Skill }) {
  const [inputJson, setInputJson] = useState('{}')
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)
  const [jsonError, setJsonError] = useState('')

  const mutation = useMutation({
    mutationFn: (input: Record<string, unknown>) => skillsApi.test(skill.id, input),
    onSuccess: (data) => setTestResult(data as unknown as Record<string, unknown>),
  })

  const run = () => {
    try {
      const parsed = JSON.parse(inputJson) as Record<string, unknown>
      setJsonError('')
      mutation.mutate(parsed)
    } catch {
      setJsonError('Invalid JSON')
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="space-y-1">
        <Label className="text-xs">Input JSON</Label>
        <Textarea
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          rows={3}
          className="font-mono text-xs"
        />
        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      </div>
      <Button size="sm" onClick={run} disabled={mutation.isPending}>
        <Play className="mr-2 h-3 w-3" />
        {mutation.isPending ? 'Running...' : 'Run'}
      </Button>
      {testResult !== null && (
        <div
          className={`rounded-md p-2 text-xs font-mono ${
            testResult.success ? 'bg-green-950/30 text-green-300' : 'bg-red-950/30 text-red-300'
          }`}
        >
          {testResult.error ? (
            <p>Error: {String(testResult.error)}</p>
          ) : (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
              {JSON.stringify(testResult.result ?? testResult, null, 2)}
            </pre>
          )}
          {typeof testResult.execution_time_ms === 'number' && (
            <p className="mt-1 text-muted-foreground">{testResult.execution_time_ms}ms</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Skill card ────────────────────────────────────────────────────────────────

function SkillCard({ skill }: { skill: Skill }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const isUserDefined = skill.source === 'user_defined'

  const deleteMutation = useMutation({
    mutationFn: () => skillsApi.delete(skill.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['skills'] }),
  })

  const editForm: SkillCreate = {
    name: skill.name,
    display_name: skill.display_name,
    description: skill.description,
    type: skill.type,
    source: skill.source,
    input_schema: skill.input_schema,
    output_schema: skill.output_schema,
    is_public: skill.is_public,
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">{skill.display_name}</CardTitle>
          </div>
          {isUserDefined && (
            <div className="flex items-center gap-1">
              <SkillFormDialog
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                initial={editForm}
                skillId={skill.id}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Badge variant={typeVariant[skill.type] ?? 'outline'}>{skill.type}</Badge>
          <Badge variant="outline">{skill.source}</Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
        <p className="font-mono text-xs text-muted-foreground">{skill.name}</p>
        {expanded && <TestPanel skill={skill} />}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SkillsPage() {
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsApi.list(),
  })

  const builtin = skills.filter((s) => s.source === 'builtin')
  const custom = skills.filter((s) => s.source === 'user_defined')

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground">
            {builtin.length} builtin · {custom.length} custom
          </p>
        </div>
        <SkillFormDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> New Skill
            </Button>
          }
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {builtin.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Builtin
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {builtin.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {custom.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && skills.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          No skills yet. Start the server to seed builtin skills.
        </p>
      )}
    </div>
  )
}
