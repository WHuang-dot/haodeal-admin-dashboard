"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          You are not authorized to access this dashboard. If you believe this is an error, please contact the administrator.
        </p>
        <Button onClick={() => signOut({ redirectUrl: "/login" })}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
