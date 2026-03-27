import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Plus, Trash2, XCircle } from 'lucide-react'

import { providersApi, type LLMProviderCreate } from '../api/providers'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

function AddProviderDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<LLMProviderCreate>({
    name: '',
    provider: 'anthropic',
    model: '',
  })

  const { data: modelsData, isFetching: loadingModels } = useQuery({
    queryKey: ['provider-models', form.provider, form.base_url],
    queryFn: () => providersApi.listModels(form.provider, form.base_url),
    enabled: open,
  })
  const models = modelsData?.models ?? []

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: LLMProviderCreate) => providersApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['providers'] })
      setOpen(false)
    },
  })

  const handleProviderChange = (v: string) => {
    setForm((f) => ({ ...f, provider: v, model: '' }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add LLM Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="My Claude Sonnet"
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Provider</Label>
            <Select value={form.provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="ollama">Ollama (local)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.provider === 'ollama' && (
            <div className="space-y-1">
              <Label>Base URL</Label>
              <Input
                value={form.base_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value, model: '' }))}
                placeholder="http://localhost:11434"
              />
            </div>
          )}
          {form.provider !== 'ollama' && (
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input
                type="password"
                value={form.api_key ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Model</Label>
            {models.length > 0 ? (
              <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingModels ? 'Loading...' : 'Select model...'} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder={loadingModels ? 'Loading models...' : 'e.g. llama3'}
                required
              />
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !form.model}>
              {mutation.isPending ? 'Adding...' : 'Add Provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => providersApi.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['providers'] }),
  })

  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})

  const testMutation = useMutation({
    mutationFn: (id: string) => providersApi.test(id),
    onSuccess: (data, id) => {
      setTestResults((prev) => ({ ...prev, [id]: data.ok }))
    },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">LLM Provider configurations</p>
        </div>
        <AddProviderDialog />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="secondary">{p.provider}</Badge>
                <Badge variant="outline">{p.model}</Badge>
              </div>
              {p.base_url && (
                <p className="text-xs font-mono text-muted-foreground truncate">{p.base_url}</p>
              )}
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testMutation.mutate(p.id)}
                  disabled={testMutation.isPending}
                >
                  Test
                </Button>
                {testResults[p.id] === true && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="h-3 w-3" /> OK
                  </span>
                )}
                {testResults[p.id] === false && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <XCircle className="h-3 w-3" /> Failed
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && providers.length === 0 && (
          <p className="col-span-3 text-center text-muted-foreground py-12">
            No providers configured. Add one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
