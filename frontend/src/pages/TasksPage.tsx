import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { tasksApi, type TaskCreate } from '../api/tasks'
import { agentsApi } from '../api/agents'
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

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'outline'
> = {
  pending: 'secondary',
  running: 'default',
  completed: 'success',
  failed: 'destructive',
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
  })
  const orchestrators = agents.filter((a) => a.role === 'orchestrator')

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
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
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
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
                <SelectValue placeholder="Select orchestrator..." />
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create & Enqueue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
    refetchInterval: 5000,
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks total</p>
        </div>
        <CreateTaskDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{task.title}</CardTitle>
                <Badge variant={statusVariant[task.status] ?? 'outline'}>{task.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              {task.result && (
                <p className="mt-2 text-xs text-green-400 line-clamp-2">{task.result}</p>
              )}
              {task.error && (
                <p className="mt-2 text-xs text-red-400 line-clamp-2">{task.error}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(task.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
