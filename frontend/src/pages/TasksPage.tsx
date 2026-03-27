import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2, Plus, X } from 'lucide-react'

import { tasksApi, type Task } from '../api/tasks'
import { agentsApi } from '../api/agents'
import { useTaskSocket } from '../hooks/useTaskSocket'
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
import type { TaskCreate } from '../api/tasks'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  running: 'default',
  completed: 'outline',
  failed: 'destructive',
}

// ── Create task dialog ────────────────────────────────────────────────────────

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
            <Button
              type="submit"
              disabled={mutation.isPending || !form.orchestrator_id}
            >
              {mutation.isPending ? 'Creating...' : 'Create & Enqueue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Task detail panel ─────────────────────────────────────────────────────────

const roleColor: Record<string, string> = {
  user: 'text-blue-400',
  assistant: 'text-green-400',
  system: 'text-yellow-400',
  tool: 'text-purple-400',
}

function TaskDetail({ task }: { task: Task }) {
  const qc = useQueryClient()
  const { lastEvent } = useTaskSocket(
    task.status === 'pending' || task.status === 'running' ? task.id : null
  )

  // Refresh task data when we receive a terminal event
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
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {/* Live event banner */}
      {lastEvent && task.status === 'running' && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="font-mono">{lastEvent.type}</span>
          {lastEvent.payload?.prompt_preview && (
            <span className="truncate opacity-70">
              — {String(lastEvent.payload.prompt_preview)}
            </span>
          )}
        </div>
      )}

      {/* Result */}
      {task.result && (
        <div className="rounded-md bg-green-950/30 p-3">
          <p className="mb-1 text-xs font-semibold text-green-400">Result</p>
          <p className="whitespace-pre-wrap text-xs text-foreground">{task.result}</p>
        </div>
      )}

      {/* Error */}
      {task.error && (
        <div className="rounded-md bg-red-950/30 p-3">
          <p className="mb-1 text-xs font-semibold text-red-400">Error</p>
          <p className="text-xs text-foreground">{task.error}</p>
        </div>
      )}

      {/* Message log */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Message log ({messages.length})
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-md bg-muted/40 p-2">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold uppercase ${roleColor[msg.role] ?? 'text-muted-foreground'}`}
                  >
                    {msg.role}
                  </span>
                  {msg.tokens_used && (
                    <span className="text-xs text-muted-foreground">
                      {msg.tokens_used} tokens
                    </span>
                  )}
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-xs">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel button */}
      {(task.status === 'pending' || task.status === 'running') && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          <X className="mr-2 h-3 w-3" />
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Task'}
        </Button>
      )}
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = task.status === 'pending' || task.status === 'running'

  return (
    <Card className={isActive ? 'border-primary/40' : ''}>
      <CardHeader className="pb-2">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {task.status === 'running' && (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            )}
            <Badge variant={statusVariant[task.status] ?? 'outline'}>{task.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(task.created_at).toLocaleString()}
        </p>
        {expanded && <TaskDetail task={task} />}
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    refetchInterval: 5000,
  })

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'running')
  const done = tasks.filter((t) => t.status === 'completed' || t.status === 'failed')

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} active · {done.length} completed
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {!isLoading && tasks.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No tasks yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
