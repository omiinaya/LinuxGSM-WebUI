"use client";

import * as React from "react";
import { 
  Command, 
  Bell, 
  Search, 
  Moon, 
  Sun,
  User,
  Menu,
  Power,
  RefreshCw,
  Settings,
} from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useUIStore, useServersStore } from "@/stores";
 import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { theme, setTheme, sidebarOpen, toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { servers, getSelectedServer, isLoading, setLoading } = useServersStore();
   const selectedServer = getSelectedServer();
   const { user, logout } = useAuth();
  const router = useRouter();

  const handleRefresh = React.useCallback(() => {
    setLoading(true);
    // Simulate refresh - in real app this would fetch new data
    setTimeout(() => setLoading(false), 1000);
  }, [setLoading]);

  return (
    <header
      className={cn(
        "flex items-center justify-between h-16 px-4 border-b bg-card",
        className
      )}
    >
      {/* Left side - Mobile menu & Server name */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {selectedServer ? (
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-semibold text-lg">{selectedServer.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{selectedServer.gameName}</span>
                <Badge 
                  variant={selectedServer.status === "running" ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    selectedServer.status === "running" && "bg-green-500"
                  )}
                >
                  {selectedServer.status}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="font-semibold text-lg">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your game servers</p>
          </div>
        )}
      </div>

      {/* Center - Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search or run command..."
            className="pl-9 bg-muted/50"
            onClick={() => setCommandPaletteOpen(true)}
            readOnly
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandPaletteOpen(true)}
          className="md:hidden"
        >
          <Search className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.username || 'User'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 w-4 h-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <Power className="mr-2 w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
