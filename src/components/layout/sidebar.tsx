"use client";

import * as React from "react";
import { 
  Server, 
  Settings, 
  Terminal, 
  Bell, 
  Shield, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Menu,
  User,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, useServersStore } from "@/stores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}


export function Sidebar({ className }: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, toggleSidebar, setShowConnectionModal } = useUIStore();
  const { servers, selectedServerId, selectServer } = useServersStore();
  const [searchQuery, setSearchQuery] = React.useState("");

  const runningServers = servers.filter(s => s.status === "running").length;

  const filteredServers = servers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.gameName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { user } = useAuth();

  const baseNavigation = [
    { name: "Servers", icon: Server, href: "/servers", badge: 0 },
    { name: "Console", icon: Terminal, href: "/console", badge: 0 },
    { name: "Alerts", icon: Bell, href: "/alerts", badge: 0 },
    { name: "Settings", icon: Settings, href: "/settings", badge: 0 },
    { name: "Support", icon: HelpCircle, href: "/support", badge: 0 },
  ];

  let navigation = [...baseNavigation];
  
  if (user) {
    navigation.push({ name: "Profile", icon: User, href: "/profile", badge: 0 });
  }
  
  if (user?.role === "admin") {
    navigation.push({ name: "Sessions", icon: Activity, href: "/sessions", badge: 0 });
    navigation.push({ name: "Admin", icon: Shield, href: "/admin/users", badge: 0 });
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex flex-col h-screen border-r bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
          className
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">LinuxGSM</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(!sidebarOpen && "mx-auto")}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>

        {/* Server Selector */}
        {sidebarOpen && (
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {servers.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{servers.length} servers</span>
                <Badge variant="secondary" className="ml-auto">
                  {runningServers} running
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Server List */}
        {sidebarOpen && filteredServers.length > 0 && (
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {filteredServers.map((server) => (
                <Button
                  key={server.id}
                  variant={selectedServerId === server.id ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 h-10",
                    selectedServerId === server.id && "bg-secondary"
                  )}
                  onClick={() => selectServer(server.id)}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    server.status === "running" ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span className="truncate">{server.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="p-2 border-t">
          {navigation.map((item) => (
            <Tooltip key={item.name} delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2",
                    sidebarOpen ? "px-3" : "px-2"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {sidebarOpen && <span>{item.name}</span>}
                  {item.badge > 0 && (
                    <Badge className="ml-auto" variant="destructive">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        {/* Add Server Button - only for admin and operator */}
        {user?.role !== "viewer" && (
          <div className="p-2 border-t">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 text-primary",
                    sidebarOpen ? "px-3" : "px-2"
                  )}
                  onClick={() => setShowConnectionModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  {sidebarOpen && <span>Add Server</span>}
                </Button>
              </TooltipTrigger>
              {!sidebarOpen && (
                <TooltipContent side="right">
                  Add Server
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
