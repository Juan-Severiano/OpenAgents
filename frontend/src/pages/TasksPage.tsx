import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2, Plus, X } from 'lucide-react'

import { tasksApi, type Task, type TaskCreate } from '../api/tasks'
import { agentsApi } from '../api/agents'
import { useTaskSocket } from '../hooks/useTaskSocket'
import { Button } from '../components/ui/button'
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
import { cn } from '../lib/utils'

const statusAccent: Record<string, string> = {
  pending: 'bg-muted-foreground/30',
  running: 'bg-primary',
  completed: 'bg-green-500',
  failed: 'bg-destructive',
}

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  running: 'default',
  completed: 'outline',
  failed: 'destructive',
}

const roleColor: Record<string, string> = {
  user: 'text-blue-400',
  assistant: 'text-green-400',
  system: 'text-yellow-400',
  tool: 'text-purple-400',
}

function CreateTaskDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<TaskCreate>({
    title: '',
    description: '',
    orchestrator_id: '',
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
    enabled: open,
  })
  const orchestrators = agents.filter((a) => a.role === 'orchestrator')

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
      setForm({ title: '', description: '', orchestrator_id: '' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Orchestrator</Label>
            <Select
              value={form.orchestrator_id}
              onValueChange={(v) => setForm((f) => ({ ...f, orchestrator_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select orchestrator agent..." />
              </SelectTrigger>
              <SelectContent>
                {orchestrators.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.orchestrator_id}>
              {mutation.isPending ? 'Creating...' : 'Create & Enqueue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskDetail({ task }: { task: Task }) {
  const qc = useQueryClient()
  const { lastEvent } = useTaskSocket(
    task.status === 'pending' || task.status === 'running' ? task.id : null
  )

  useEffect(() => {
    if (!lastEvent) return
    if (['task.completed', 'task.failed', 'task.started'].includes(lastEvent.type)) {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['task-messages', task.id] })
    }
    if (['agent.message_sent', 'subtask.completed'].includes(lastEvent.type)) {
      void qc.invalidateQueries({ queryKey: ['task-messages', task.id] })
    }
  }, [lastEvent, task.id, qc])

  const { data: messages = [] } = useQuery({
    queryKey: ['task-messages', task.id],
    queryFn: () => tasksApi.getMessages(task.id),
    refetchInterval: task.status === 'running' ? 3000 : false,
  })

  const cancelMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {lastEvent && task.status === 'running' && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="font-mono text-primary/70">{lastEvent.type}</span>
          {lastEvent.payload?.prompt_preview && (
            <span className="truncate opacity-60">— {String(lastEvent.payload.prompt_preview)}</span>
          )}
        </div>
      )}

      {task.result && (
        <div className="overflow-hidden rounded-lg border border-green-500/20 bg-green-500/5">
          <div className="border-b border-green-500/20 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">Result</p>
          </div>
          <p className="p-3 whitespace-pre-wrap text-xs">{task.result}</p>
        </div>
      )}

      {task.error && (
        <div className="overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5">
          <div className="border-b border-destructive/20 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-destructive">Error</p>
          </div>
          <p className="p-3 text-xs">{task.error}</p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Log ({messages.length})
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wide', roleColor[msg.role] ?? 'text-muted-foreground')}>
                    {msg.role}
                  </span>
                  {msg.tokens_used && (
                    <span className="text-[10px] text-muted-foreground">{msg.tokens_used}t</span>
                  )}
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-xs">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(task.status === 'pending' || task.status === 'running') && (
        <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
          <X className="mr-2 h-3 w-3" />
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Task'}
        </Button>
      )}
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = task.status === 'pending' || task.status === 'running'

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card transition-colors', isActive ? 'border-primary/30' : 'border-border')}>
      <div
        className="flex cursor-pointer items-start gap-3 p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold leading-tight">{task.title}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              {task.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              <Badge variant={statusBadge[task.status] ?? 'outline'} className="text-[10px]">
                {task.status}
              </Badge>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            {new Date(task.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <TaskDetail task={task} />
        </div>
      )}
      <div className={cn('h-1', statusAccent[task.status] ?? 'bg-muted')} />
    </div>
  )
}

export function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    refetchInterval: 5000,
  })

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'running')
  const done = tasks.filter((t) => t.status === 'completed' || t.status === 'failed')

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {pending.length} active · {done.length} done
        </span>
        <CreateTaskDialog />
      </div>

      <div className="p-4 space-y-5">
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}

        {pending.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {pending.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">History</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {done.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          </section>
        )}

        {!isLoading && tasks.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tasks yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
