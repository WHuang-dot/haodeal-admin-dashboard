"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  FileText,
  Store,
  Tags,
  Settings,
  Image as ImageIcon,
  Webhook,
  ClipboardList,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserRole = "viewer" | "operator" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  minRole: UserRole;
}

const ROLE_ORDER: Record<UserRole, number> = {
  viewer: 0,
  operator: 1,
  admin: 2,
};

function hasAccess(userRole: UserRole, minRole: UserRole) {
  return ROLE_ORDER[userRole] >= ROLE_ORDER[minRole];
}

const navItems: NavItem[] = [
  { href: "/", label: "Status", icon: LayoutDashboard, exact: true, minRole: "viewer" },
  { href: "/pipeline", label: "Pipeline", icon: Zap, minRole: "operator" },
  { href: "/clusters", label: "Clusters", icon: MessageSquare, minRole: "viewer" },
  { href: "/deals", label: "Deals", icon: ShoppingBag, minRole: "viewer" },
  
  { href: "/stores", label: "Stores", icon: Store, minRole: "admin" },
  { href: "/categories", label: "Categories", icon: Tags, minRole: "admin" },
  { href: "/prompts", label: "Prompts", icon: Settings, minRole: "admin" },
  { href: "/settings", label: "Settings", icon: Settings, minRole: "admin" },
  { href: "/images", label: "Images", icon: ImageIcon, minRole: "viewer" },
  { href: "/webhooks", label: "Webhooks", icon: Webhook, minRole: "admin" },
  { href: "/audit-logs", label: "Audit Logs", icon: ClipboardList, minRole: "admin" },
  { href: "/logs", label: "Logs", icon: Shield, minRole: "viewer" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { user } = useUser();

  const role = (user?.publicMetadata?.role as UserRole) || "viewer";
  const visibleNavItems = navItems.filter((item) => hasAccess(role, item.minRole));

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">
              HaoDeal
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {visibleNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <div className="flex items-center gap-3 px-3 py-2">
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {user?.primaryEmailAddress?.emailAddress ?? "User"}
                </span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {role}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ redirectUrl: "/login" })}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-semibold tracking-tight">HaoDeal</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {visibleNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">
                {user?.primaryEmailAddress?.emailAddress ?? "User"}
              </span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {role}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ redirectUrl: "/login" })}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="h-8 w-8 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Breadcrumb />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-accent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.primaryEmailAddress?.emailAddress?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="px-2 py-1.5 text-sm font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.primaryEmailAddress?.emailAddress ?? "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {role}
                  </p>
                </div>
              </div>
              <div className="-mx-1 my-1 h-px bg-border" />
              <DropdownMenuItem
                onClick={() => signOut({ redirectUrl: "/login" })}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
