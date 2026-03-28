import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ExternalLink, Github, Pencil, Play, Plus, Trash2 } from 'lucide-react'

import { skillsApi, type GitHubInstallRequest, type Skill, type SkillCreate } from '../api/skills'
import { Button } from '../components/ui/button'
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
import { cn } from '../lib/utils'

const typeAccent: Record<string, string> = {
  builtin: 'bg-primary',
  custom_python: 'bg-blue-500',
  custom_http: 'bg-violet-500',
  mcp_tool: 'bg-cyan-500',
  github: 'bg-neutral-600',
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
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              value={typeof form.input_schema === 'string' ? (form.input_schema as unknown as string) : JSON.stringify(form.input_schema, null, 2)}
              onChange={(e) => { setSchemaError(''); setForm((f) => ({ ...f, input_schema: e.target.value as unknown as Record<string, unknown> })) }}
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
                value={typeof form.http_config === 'string' ? (form.http_config as unknown as string) : JSON.stringify(form.http_config ?? { url: '', method: 'GET' }, null, 2)}
                onChange={(e) => setForm((f) => ({ ...f, http_config: e.target.value as unknown as Record<string, unknown> }))}
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

function GitHubInstallDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<GitHubInstallRequest>({ url: '', subdir: '', token: '' })
  const [error, setError] = useState('')

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: GitHubInstallRequest) =>
      skillsApi.installFromGithub({
        url: data.url,
        subdir: data.subdir || undefined,
        token: data.token || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['skills'] })
      setOpen(false)
      setForm({ url: '', subdir: '', token: '' })
      setError('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.url.trim()) return
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            Install Skill from GitHub
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Repository URL</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://github.com/owner/repo"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              The repo must contain a <code className="font-mono">skill.json</code> manifest and a Python entrypoint.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Subdirectory <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={form.subdir}
              onChange={(e) => setForm((f) => ({ ...f, subdir: e.target.value }))}
              placeholder="skills/my_skill"
            />
          </div>
          <div className="space-y-1">
            <Label>GitHub Token <span className="text-muted-foreground">(optional, for private repos)</span></Label>
            <Input
              type="password"
              value={form.token}
              onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
              placeholder="ghp_..."
            />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Installing...' : 'Install Skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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
        <Textarea value={inputJson} onChange={(e) => setInputJson(e.target.value)} rows={3} className="font-mono text-xs" />
        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      </div>
      <Button size="sm" onClick={run} disabled={mutation.isPending}>
        <Play className="mr-2 h-3 w-3" />
        {mutation.isPending ? 'Running...' : 'Run'}
      </Button>
      {testResult !== null && (
        <div className={cn('rounded-lg p-2 text-xs font-mono', testResult.success ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-destructive/10 text-destructive')}>
          {testResult.error ? (
            <p>Error: {String(testResult.error)}</p>
          ) : (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
              {JSON.stringify(testResult.result ?? testResult, null, 2)}
            </pre>
          )}
          {typeof testResult.execution_time_ms === 'number' && (
            <p className="mt-1 opacity-60">{testResult.execution_time_ms}ms</p>
          )}
        </div>
      )}
    </div>
  )
}

function SkillCard({ skill }: { skill: Skill }) {
  const [expanded, setExpanded] = useState(false)
  const qc = useQueryClient()
  const isUserDefined = skill.source === 'user_defined'
  const isGithub = skill.source === 'github'

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

  const accentKey = isGithub ? 'github' : skill.type

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{skill.display_name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{skill.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {isGithub && skill.github_url && (
              <a
                href={skill.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                title={skill.github_ref ? `Commit: ${skill.github_ref.slice(0, 7)}` : 'View on GitHub'}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {isUserDefined && (
              <SkillFormDialog
                trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Pencil className="h-4 w-4" /></Button>}
                initial={editForm}
                skillId={skill.id}
              />
            )}
            {(isUserDefined || isGithub) && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
        {isGithub && skill.github_ref && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
            {skill.github_ref.slice(0, 7)}
          </p>
        )}
        {expanded && <TestPanel skill={skill} />}
      </div>
      <div className={cn('h-1', typeAccent[accentKey] ?? 'bg-muted')} />
    </div>
  )
}

export function SkillsPage() {
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsApi.list(),
  })

  const builtin = skills.filter((s) => s.source === 'builtin')
  const github = skills.filter((s) => s.source === 'github')
  const custom = skills.filter((s) => s.source === 'user_defined')

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {builtin.length} builtin · {github.length} github · {custom.length} custom
        </span>
        <div className="flex items-center gap-2">
          <GitHubInstallDialog
            trigger={
              <Button size="sm" variant="outline">
                <Github className="mr-2 h-4 w-4" /> Install from GitHub
              </Button>
            }
          />
          <SkillFormDialog
            trigger={<Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Skill</Button>}
          />
        </div>
      </div>

      <div className="p-4 space-y-5">
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}

        {builtin.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Builtin</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {builtin.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
            </div>
          </section>
        )}

        {github.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">GitHub</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {github.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
            </div>
          </section>
        )}

        {custom.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Custom</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {custom.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
            </div>
          </section>
        )}

        {!isLoading && skills.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No skills yet. Start the server to seed builtin skills.
          </p>
        )}
      </div>
    </div>
  )
}
