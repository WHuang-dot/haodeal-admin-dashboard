"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReadChannel {
  id: string;
  channel: string;
  category: string | null;
  note: string | null;
  created_at: string;
  pipeline_kind: "deal" | "release";
}

export default function ChannelsPage() {
  const { data: channels, loading, error, refetch } = useApi<ReadChannel[]>(
    "/api/admin/settings/channels"
  );

  const [creatingChannel, setCreatingChannel] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({
    channel: "",
    category: "",
    note: "",
    pipeline_kind: "deal" as "deal" | "release",
  });
  const [editingChannel, setEditingChannel] = useState({
    channel: "",
    category: "",
    note: "",
    pipeline_kind: "deal" as "deal" | "release",
  });

  const createChannel = async () => {
    if (!newChannel.channel.trim()) {
      toast.error("channel is required");
      return;
    }

    setCreatingChannel(true);
    try {
      const res = await fetch("/api/admin/settings/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: newChannel.channel.trim(),
          category: newChannel.category.trim() || null,
          note: newChannel.note.trim() || null,
          pipeline_kind: newChannel.pipeline_kind,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create channel");
      toast.success("Channel created");
      setNewChannel({
        channel: "",
        category: "",
        note: "",
        pipeline_kind: "deal",
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setCreatingChannel(false);
    }
  };

  const startEditChannel = (row: ReadChannel) => {
    setEditingChannelId(row.id);
    setEditingChannel({
      channel: row.channel,
      category: row.category ?? "",
      note: row.note ?? "",
      pipeline_kind: row.pipeline_kind,
    });
  };

  const saveEditChannel = async (id: string) => {
    if (!editingChannel.channel.trim()) {
      toast.error("channel is required");
      return;
    }

    setSavingChannel(true);
    try {
      const res = await fetch(`/api/admin/settings/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: editingChannel.channel.trim(),
          category: editingChannel.category.trim() || null,
          note: editingChannel.note.trim() || null,
          pipeline_kind: editingChannel.pipeline_kind,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update channel");
      toast.success("Channel updated");
      setEditingChannelId(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setSavingChannel(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 pb-20 md:space-y-8 md:pb-24">
      <PageHeader title="Channels" description="Manage read_channels table records" />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="rounded-md border border-border p-3">
            <p className="mb-3 text-sm font-medium">Create Channel</p>
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                value={newChannel.channel}
                onChange={(e) => setNewChannel((prev) => ({ ...prev, channel: e.target.value }))}
                placeholder="channel"
              />
              <Input
                value={newChannel.category}
                onChange={(e) => setNewChannel((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="category"
              />
              <Input
                value={newChannel.note}
                onChange={(e) => setNewChannel((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="note"
              />
              <select
                value={newChannel.pipeline_kind}
                onChange={(e) =>
                  setNewChannel((prev) => ({
                    ...prev,
                    pipeline_kind: e.target.value as "deal" | "release",
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="deal">deal</option>
                <option value="release">release</option>
              </select>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={createChannel} disabled={creatingChannel}>
                {creatingChannel ? "Creating..." : "Create Channel"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {(channels ?? []).map((row) => {
              const isEditing = editingChannelId === row.id;
              return (
                <div key={row.id} className="rounded-md border border-border p-3">
                  <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
                    <Input
                      value={isEditing ? editingChannel.channel : row.channel}
                      onChange={(e) =>
                        setEditingChannel((prev) => ({ ...prev, channel: e.target.value }))
                      }
                      disabled={!isEditing}
                    />
                    <Input
                      value={isEditing ? editingChannel.category : row.category ?? ""}
                      onChange={(e) =>
                        setEditingChannel((prev) => ({ ...prev, category: e.target.value }))
                      }
                      disabled={!isEditing}
                    />
                    <Input
                      value={isEditing ? editingChannel.note : row.note ?? ""}
                      onChange={(e) =>
                        setEditingChannel((prev) => ({ ...prev, note: e.target.value }))
                      }
                      disabled={!isEditing}
                    />
                    <select
                      value={isEditing ? editingChannel.pipeline_kind : row.pipeline_kind}
                      onChange={(e) =>
                        setEditingChannel((prev) => ({
                          ...prev,
                          pipeline_kind: e.target.value as "deal" | "release",
                        }))
                      }
                      disabled={!isEditing}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                    >
                      <option value="deal">deal</option>
                      <option value="release">release</option>
                    </select>
                    <div className="flex items-center justify-end gap-2">
                      {!isEditing ? (
                        <Button size="sm" variant="outline" onClick={() => startEditChannel(row)}>
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingChannelId(null)}
                            disabled={savingChannel}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEditChannel(row.id)}
                            disabled={savingChannel}
                          >
                            {savingChannel ? "Saving..." : "Save"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {row.id} | created {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}

            {(channels ?? []).length === 0 && (
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                No channels yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

