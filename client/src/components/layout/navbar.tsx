import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gamepad2, Wallet, User, Home, LogOut, Menu, X, ShieldCheck } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { href: "/", label: "Home", icon: <Home size={18} /> },
    { href: "/games", label: "Games", icon: <Gamepad2 size={18} /> },
    { href: "/wallet", label: "Wallet", icon: <Wallet size={18} /> },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-gaming-dark bg-opacity-90 backdrop-filter backdrop-blur-lg border-b border-gaming-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <a className="text-2xl font-gaming font-bold text-white flex items-center">
                <span className="text-accent mr-1">
                  <Gamepad2 />
                </span>{" "}
                GameZone
              </a>
            </Link>
          </div>

          <div className="hidden md:ml-6 md:flex md:items-center md:space-x-6">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                    location === item.href
                      ? "text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border border-gaming-card">
                      <AvatarImage
                        src={user.avatarUrl || undefined}
                        alt={user.username}
                      />
                      <AvatarFallback className="bg-gaming-highlight text-white">
                        {getInitials(user.fullName || user.username)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>
                      {logoutMutation.isPending ? "Logging out..." : "Log out"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost" className="text-white">
                    Login
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button className="bg-accent hover:bg-accent/90 text-white">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gaming-card bg-gaming-dark">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`block px-3 py-2 text-base font-medium rounded-md flex items-center ${
                    location === item.href
                      ? "text-white bg-gaming-highlight"
                      : "text-gray-300 hover:text-white hover:bg-gaming-card"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </a>
              </Link>
            ))}

            {user ? (
              <>
                <Link href="/profile">
                  <a
                    className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gaming-card rounded-md flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User size={18} className="mr-2" />
                    Profile
                  </a>
                </Link>
                <Link href="/admin">
                  <a
                    className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gaming-card rounded-md flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShieldCheck size={18} className="mr-2" />
                    Admin Panel
                  </a>
                </Link>
                <button
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gaming-card rounded-md flex items-center"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut size={18} className="mr-2" />
                  {logoutMutation.isPending ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <div className="pt-4 pb-3 border-t border-gaming-card flex flex-col space-y-2">
                <Link href="/auth">
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button
                    className="w-full bg-accent hover:bg-accent/90 justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
