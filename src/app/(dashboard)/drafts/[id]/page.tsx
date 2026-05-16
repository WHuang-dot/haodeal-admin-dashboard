"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { useConfirmDialog } from "@/hooks/use-confirm";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Copy,
  Check,
  Send,
  Pencil,
  Save,
  X,
  ExternalLink,
} from "lucide-react";

interface DraftDetail {
  id: string;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "published";
  model: string;
  created_at: string;
  updated_at: string;
  selected_image_ids: string[];
  deal?: {
    id: string;
    title: string;
    price?: string;
    original_price?: string;
    url?: string;
  } | null;
  send_history: Array<{
    id: string;
    sent_at: string;
    status: string;
    platform: string;
  }>;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "pending":
      return "secondary";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "published":
      return "default";
    default:
      return "outline";
  }
}

export default function DraftDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [copied, setCopied] = useState(false);
  const { confirm, open, options, close } = useConfirmDialog();

  const url = `/api/admin/drafts/${id}?_t=${refreshKey}`;
  const { data, loading, error } = useApi<DraftDetail>(url);

  const updateMutation = useMutation<{ title?: string; body?: string }, unknown>(
    `/api/admin/drafts/${id}`
  );
  const sendMutation = useMutation<unknown, unknown>(
    `/api/admin/drafts/${id}/send`
  );
  const statusMutation = useMutation<{ status: string }, unknown>(
    `/api/admin/drafts/${id}/status`
  );

  const startEditing = () => {
    if (data) {
      setEditTitle(data.title);
      setEditBody(data.body);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSave = () => {
    confirm({
      title: "Save Changes",
      description: "Update draft title and body?",
      confirmText: "Save",
      onConfirm: async () => {
        await updateMutation.mutate({ title: editTitle, body: editBody });
        setIsEditing(false);
        setRefreshKey((k) => k + 1);
      },
    });
  };

  const handleCopyBody = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    confirm({
      title: "Send Draft",
      description: `Send "${data?.title}"?`,
      confirmText: "Send",
      onConfirm: async () => {
        await sendMutation.mutate({});
        setRefreshKey((k) => k + 1);
      },
    });
  };

  const handleChangeStatus = (newStatus: string) => {
    confirm({
      title: "Change Status",
      description: `Change status to ${newStatus}?`,
      confirmText: "Change",
      variant: newStatus === "rejected" ? "destructive" : "default",
      onConfirm: async () => {
        await statusMutation.mutate({ status: newStatus });
        setRefreshKey((k) => k + 1);
      },
    });
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Draft" />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Draft" />
        <EmptyState
          icon={FileText}
          title="Draft not found"
          description="The draft you are looking for does not exist."
        />
      </div>
    );
  }

  const selectedCount = data.selected_image_ids?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.title}
        description={`Model: ${data.model} · Created: ${new Date(
          data.created_at
        ).toLocaleDateString()}`}
      >
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(data.status)}>{data.status}</Badge>
          {selectedCount > 0 && (
            <Badge variant="outline">{selectedCount} selected</Badge>
          )}
          {data.status !== "published" && (
            <Button size="sm" onClick={handleSend} disabled={sendMutation.loading}>
              <Send className="mr-1 size-3" />
              Send
            </Button>
          )}
          {data.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChangeStatus("approved")}
                disabled={statusMutation.loading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleChangeStatus("rejected")}
                disabled={statusMutation.loading}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {/* Title & Body */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Content</span>
            {!isEditing ? (
              <Button size="sm" variant="ghost" onClick={startEditing}>
                <Pencil className="mr-1 size-3" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={cancelEditing}>
                  <X className="mr-1 size-3" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.loading}>
                  <Save className="mr-1 size-3" />
                  Save
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            {isEditing ? (
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            ) : (
              <p className="text-sm">{data.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              {!isEditing && (
                <Button size="xs" variant="ghost" onClick={handleCopyBody}>
                  {copied ? (
                    <Check className="mr-1 size-3" />
                  ) : (
                    <Copy className="mr-1 size-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            {isEditing ? (
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
              />
            ) : (
              <Textarea value={data.body} readOnly rows={10} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deal Info */}
      {data.deal && (
        <Card>
          <CardHeader>
            <CardTitle>Associated Deal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{data.deal.title}</span>
              {data.deal.url && (
                <a
                  href={data.deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  View
                </a>
              )}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {data.deal.price && <span>Price: {data.deal.price}</span>}
              {data.deal.original_price && <span>Was: {data.deal.original_price}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send History */}
      <Card>
        <CardHeader>
          <CardTitle>Send History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.send_history.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No sends yet"
              description="This draft hasn't been sent yet."
            />
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Platform</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.send_history.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="px-4 py-2">{entry.platform}</td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{entry.status}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {new Date(entry.sent_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={open}
        onOpenChange={close}
        title={options?.title ?? ""}
        description={options?.description ?? ""}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
        onConfirm={options?.onConfirm ?? (() => {})}
      />
    </div>
  );
}
