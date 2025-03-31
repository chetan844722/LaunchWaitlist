import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Home, Gamepad, Wallet, User, ShieldCheck } from "lucide-react";

export function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border py-2 px-4">
      <div className="flex justify-around">
        <Link to="/" className={`${isActive("/") ? "text-primary" : "text-muted-foreground"} flex flex-col items-center`}>
          <Home className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link to="/games" className={`${isActive("/games") ? "text-primary" : "text-muted-foreground"} flex flex-col items-center`}>
          <Gamepad className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Games</span>
        </Link>
        <Link to="/wallet" className={`${isActive("/wallet") ? "text-primary" : "text-muted-foreground"} flex flex-col items-center`}>
          <Wallet className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Wallet</span>
        </Link>
        <Link to="/profile" className={`${isActive("/profile") ? "text-primary" : "text-muted-foreground"} flex flex-col items-center`}>
          <User className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
        <Link to="/admin" className={`${isActive("/admin") ? "text-primary" : "text-muted-foreground"} flex flex-col items-center`}>
          <ShieldCheck className="text-lg h-5 w-5" />
          <span className="text-xs mt-1">Admin</span>
        </Link>
      </div>
    </div>
  );
}
