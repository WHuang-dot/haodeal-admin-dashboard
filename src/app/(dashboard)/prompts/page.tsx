"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Plus, Eye, Zap } from "lucide-react";

interface Prompt {
  id: string;
  kind: string;
  name: string;
  model: string;
  active: boolean;
  created_at: string;
  body: string;
  notes: string;
}

const KINDS = [
  { value: "extract", label: "Extract" },
  { value: "generate_copy", label: "Generate Copy" },
  { value: "generate_image", label: "Generate Image" },
];

function PromptForm({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (data: Partial<Prompt>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [kind, setKind] = useState("extract");
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      kind,
      name,
      model,
      body,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kind">Kind</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger>
            <SelectValue placeholder="Select kind" />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          required
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Version"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function PromptsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: prompts, loading, error } = useApi<{ data: Prompt[] }>(
    `/api/admin/prompts?r=${refreshKey}`
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPrompt, setViewPrompt] = useState<Prompt | null>(null);
  const confirmDialog = useConfirmDialog();

  const { mutate: createPrompt, loading: creating } = useMutation<
    Partial<Prompt>,
    Prompt
  >("/api/admin/prompts", {
    onSuccess: () => {
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
    },
    onError: (msg) => alert(msg),
  });

  const handleActivate = async (prompt: Prompt) => {
    try {
      const res = await fetch(`/api/admin/prompts/${prompt.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Activation failed");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Activation failed");
    }
  };

  const promptGroups = KINDS.map((kind) => ({
    ...kind,
    items:
      (prompts?.data ?? [])
        .filter((p) => p.kind === kind.value)
        .sort((a, b) => {
          if (a.active === b.active) return 0;
          return a.active ? -1 : 1;
        }),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Prompts" description="Manage prompt versions" />
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Prompts" description="Manage prompt versions" />
        <EmptyState
          icon={Settings}
          title="Error loading prompts"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Prompts" description="Manage prompt versions">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Prompt Version
        </Button>
      </PageHeader>

      {prompts && prompts.data.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="No prompts found"
          description="Create your first prompt to get started"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt Version
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="extract" className="w-full">
          <TabsList className="mb-4">
            {KINDS.map((kind) => (
              <TabsTrigger key={kind.value} value={kind.value}>
                {kind.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {promptGroups.map((group) => (
            <TabsContent key={group.value} value={group.value}>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          No prompts for this kind
                        </TableCell>
                      </TableRow>
                    )}
                    {group.items.map((prompt) => (
                      <TableRow
                        key={prompt.id}
                        className={
                          prompt.active ? "bg-primary/5" : undefined
                        }
                      >
                        <TableCell className="font-medium">
                          {prompt.name}
                        </TableCell>
                        <TableCell>{prompt.model}</TableCell>
                        <TableCell>
                          <Badge
                            variant={prompt.active ? "default" : "secondary"}
                          >
                            {prompt.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewPrompt(prompt)}
                              title="View body"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!prompt.active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  confirmDialog.confirm({
                                    title: "Activate Prompt",
                                    description: `Are you sure you want to activate "${prompt.name}"? This will deactivate the current active prompt for ${group.label}.`,
                                    confirmText: "Activate",
                                    onConfirm: () => handleActivate(prompt),
                                  })
                                }
                                title="Activate"
                              >
                                <Zap className="h-4 w-4 text-yellow-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Prompt Version</DialogTitle>
            <DialogDescription>
              Create a new prompt version. Notes are required.
            </DialogDescription>
          </DialogHeader>
          <PromptForm
            onSubmit={(data) => createPrompt(data)}
            onCancel={() => setCreateOpen(false)}
            loading={creating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewPrompt}
        onOpenChange={(open) => !open && setViewPrompt(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewPrompt?.name}</DialogTitle>
            <DialogDescription>
              {viewPrompt?.kind} — {viewPrompt?.model}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prompt Body</Label>
              <div className="mt-2 rounded-md border border-border bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap break-words">
                  {viewPrompt?.body}
                </pre>
              </div>
            </div>
            {viewPrompt?.notes && (
              <div>
                <Label>Notes</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewPrompt.notes}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewPrompt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmDialog.options && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={confirmDialog.close}
          {...confirmDialog.options}
        />
      )}
    </div>
  );
}
