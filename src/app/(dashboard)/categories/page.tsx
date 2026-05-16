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
import { Tags, Plus, Pencil, Power, PowerOff } from "lucide-react";

interface Category {
  id: string;
  code: string;
  category: string;
  subcategory: string;
  aliases: string[];
  is_active: boolean;
}

function CategoryForm({
  category,
  onSubmit,
  onCancel,
  loading,
}: {
  category?: Category;
  onSubmit: (data: Partial<Category>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [code, setCode] = useState(category?.code ?? "");
  const [cat, setCat] = useState(category?.category ?? "");
  const [sub, setSub] = useState(category?.subcategory ?? "");
  const [aliases, setAliases] = useState((category?.aliases ?? []).join("\n"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code,
      category: cat,
      subcategory: sub,
      aliases: aliases
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
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subcategory">Subcategory</Label>
        <Input
          id="subcategory"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          required
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
          {loading ? "Saving..." : category ? "Save Changes" : "Create Category"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function CategoriesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: categories, loading, error } = useApi<{ data: Category[]; total: number }>(
    `/api/admin/categories?r=${refreshKey}`
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [updating, setUpdating] = useState(false);

  const { mutate: createCategory, loading: creating } = useMutation<
    Partial<Category>,
    Category
  >("/api/admin/categories", {
    onSuccess: () => {
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
    },
    onError: (msg) => alert(msg),
  });

  const handleUpdate = async (data: Partial<Category>) => {
    if (!editCategory) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/categories/${editCategory.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed");
      setEditCategory(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    if (category.code === "A999") return;
    try {
      const res = await fetch(`/api/admin/categories/${category.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Toggle failed");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  const isProtected = (category: Category) => category.code === "A999";

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          description="Manage product categories"
        />
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Active</TableHead>
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
        <PageHeader
          title="Categories"
          description="Manage product categories"
        />
        <EmptyState
          icon={Tags}
          title="Error loading categories"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description="Manage product categories">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </PageHeader>

      {categories && categories.data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories found"
          description="Create your first category to get started"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories?.data ?? []).map((category) => {
                const protectedRow = isProtected(category);
                return (
                  <TableRow
                    key={category.id}
                    className={protectedRow ? "bg-muted/30" : undefined}
                  >
                    <TableCell className="font-medium">
                      {category.code}
                    </TableCell>
                    <TableCell>{category.category}</TableCell>
                    <TableCell>{category.subcategory}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {category.aliases.map((a) => (
                          <Badge
                            key={a}
                            variant="secondary"
                            className="text-xs"
                          >
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.is_active ? "default" : "secondary"}
                      >
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditCategory(category)}
                          disabled={protectedRow}
                        >
                          <Pencil
                            className={`h-4 w-4 ${protectedRow ? "opacity-30" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(category)}
                          disabled={protectedRow}
                          title={
                            protectedRow
                              ? "Protected"
                              : category.is_active
                                ? "Deactivate"
                                : "Activate"
                          }
                        >
                          {category.is_active ? (
                            <PowerOff
                              className={`h-4 w-4 text-destructive ${protectedRow ? "opacity-30" : ""}`}
                            />
                          ) : (
                            <Power
                              className={`h-4 w-4 text-green-500 ${protectedRow ? "opacity-30" : ""}`}
                            />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to the system.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            onSubmit={(data) => createCategory(data)}
            onCancel={() => setCreateOpen(false)}
            loading={creating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editCategory}
        onOpenChange={(open) => !open && setEditCategory(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category aliases and details.
            </DialogDescription>
          </DialogHeader>
          {editCategory && (
            <CategoryForm
              category={editCategory}
              onSubmit={handleUpdate}
              onCancel={() => setEditCategory(null)}
              loading={updating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
