import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">HaoDeal Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the operations dashboard
          </p>
        </div>
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-card border-border shadow-none",
              headerTitle: "text-foreground",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton:
                "bg-secondary text-secondary-foreground border-border hover:bg-accent",
              formFieldLabel: "text-foreground",
              formFieldInput:
                "bg-input border-border text-foreground focus:ring-ring",
              formButtonPrimary:
                "bg-primary text-primary-foreground hover:bg-primary/90",
              footerActionLink: "text-primary hover:text-primary/90",
              identityPreviewText: "text-foreground",
              identityPreviewEditButton: "text-primary",
              formFieldErrorText: "text-destructive",
              alertText: "text-destructive",
            },
          }}
        />
      </div>
    </div>
  );
}
