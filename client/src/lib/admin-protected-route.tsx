import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";

export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  
  // Only user with ID 1 can access admin routes
  const isAdmin = user && user.id === 1;

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : isAdmin ? (
        <Component />
      ) : user ? (
        // If user is logged in but not admin, show access denied
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-4">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            This page is only accessible to administrators. You don't have permission to view this content.
          </p>
          <a 
            href="/" 
            className="bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </a>
        </div>
      ) : (
        <Redirect to="/auth" />
      )}
    </Route>
  );
}