"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { Store as StoreIcon, Plus, Pencil, Power, PowerOff } from "lucide-react";

interface Store {
  id: string;
  code: string;
  name_en: string;
  name_cn: string;
  aliases: string[];
  domains: string[];
  is_active: boolean;
  deals_count: number;
}

function StoreForm({
  store,
  onSubmit,
  onCancel,
  loading,
}: {
  store?: Store;
  onSubmit: (data: Partial<Store>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [code, setCode] = useState(store?.code ?? "");
  const [nameEn, setNameEn] = useState(store?.name_en ?? "");
  const [nameCn, setNameCn] = useState(store?.name_cn ?? "");
  const [aliases, setAliases] = useState((store?.aliases ?? []).join("\n"));
  const [domains, setDomains] = useState((store?.domains ?? []).join("\n"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code,
      name_en: nameEn,
      name_cn: nameCn,
      aliases: aliases
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      domains: domains
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name_en">Name (EN)</Label>
        <Input
          id="name_en"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name_cn">Name (CN)</Label>
        <Input
          id="name_cn"
          value={nameCn}
          onChange={(e) => setNameCn(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aliases">Aliases (one per line)</Label>
        <Textarea
          id="aliases"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="domains">Domains (one per line)</Label>
        <Textarea
          id="domains"
          value={domains}
          onChange={(e) => setDomains(e.target.value)}
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : store ? "Save Changes" : "Create Store"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function StoresPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: stores, loading, error } = useApi<{ data: Store[]; total: number }>(
    `/api/admin/stores?r=${refreshKey}`
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [updating, setUpdating] = useState(false);

  const { mutate: createStore, loading: creating } = useMutation<
    Partial<Store>,
    Store
  >("/api/admin/stores", {
    onSuccess: () => {
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
    },
    onError: (msg) => alert(msg),
  });

  const handleUpdate = async (data: Partial<Store>) => {
    if (!editStore) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/stores/${editStore.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed");
      setEditStore(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (store: Store) => {
    try {
      const res = await fetch(`/api/admin/stores/${store.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !store.is_active }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Toggle failed");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stores" description="Manage stores and their aliases" />
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
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
        <PageHeader title="Stores" description="Manage stores and their aliases" />
        <EmptyState
          icon={StoreIcon}
          title="Error loading stores"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Stores" description="Manage stores and their aliases">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Store
        </Button>
      </PageHeader>

      {stores && stores.data.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title="No stores found"
          description="Create your first store to get started"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Store
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name (EN / CN)</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(stores?.data ?? []).map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{store.name_en}</div>
                    {store.name_cn && (
                      <div className="text-xs text-muted-foreground">
                        {store.name_cn}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {store.aliases.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {store.domains.map((d) => (
                        <span key={d} className="text-xs text-muted-foreground">
                          {d}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.is_active ? "default" : "secondary"}>
                      {store.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{store.deals_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditStore(store)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(store)}
                        title={store.is_active ? "Deactivate" : "Activate"}
                      >
                        {store.is_active ? (
                          <PowerOff className="h-4 w-4 text-destructive" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Store</DialogTitle>
            <DialogDescription>
              Add a new store to the system.
            </DialogDescription>
          </DialogHeader>
          <StoreForm
            onSubmit={(data) => createStore(data)}
            onCancel={() => setCreateOpen(false)}
            loading={creating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editStore}
        onOpenChange={(open) => !open && setEditStore(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>
              Update store details.
            </DialogDescription>
          </DialogHeader>
          {editStore && (
            <StoreForm
              store={editStore}
              onSubmit={handleUpdate}
              onCancel={() => setEditStore(null)}
              loading={updating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
