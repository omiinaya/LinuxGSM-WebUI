"use client";

import * as React from "react";
import { 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  MoreVertical,
  Terminal,
  Settings,
  Trash2,
  Cpu,
  HardDrive,
  Users
} from "lucide-react";
import type { Server as ServerType, ServerStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ServerCardProps {
  server: ServerType;
  onSelect?: (server: ServerType) => void;
  onStart?: (server: ServerType) => void;
  onStop?: (server: ServerType) => void;
  onRestart?: (server: ServerType) => void;
  onConsole?: (server: ServerType) => void;
  onDelete?: (server: ServerType) => void;
}

const statusColors: Record<ServerStatus, string> = {
  running: "bg-green-500",
  stopped: "bg-gray-400",
  starting: "bg-yellow-500",
  stopping: "bg-yellow-500",
  installing: "bg-blue-500",
  updating: "bg-purple-500",
  crashed: "bg-red-500",
  unknown: "bg-gray-400",
};

const statusLabels: Record<ServerStatus, string> = {
  running: "Running",
  stopped: "Stopped",
  starting: "Starting",
  stopping: "Stopping",
  installing: "Installing",
  updating: "Updating",
  crashed: "Crashed",
  unknown: "Unknown",
};

export function ServerCard({
  server,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onConsole,
  onDelete,
}: ServerCardProps) {
  const isRunning = server.status === "running";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              statusColors[server.status]
            )}>
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">{server.name}</h3>
              <p className="text-sm text-muted-foreground">{server.gameName}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelect?.(server)}>
                <Settings className="mr-2 w-4 h-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onConsole?.(server)}>
                <Terminal className="mr-2 w-4 h-4" />
                Console
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onStart?.(server)}
                disabled={isRunning}
              >
                <Play className="mr-2 w-4 h-4" />
                Start
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onStop?.(server)}
                disabled={!isRunning}
              >
                <Square className="mr-2 w-4 h-4" />
                Stop
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onRestart?.(server)}
                disabled={!isRunning}
              >
                <RotateCcw className="mr-2 w-4 h-4" />
                Restart
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(server)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm">
          <Badge 
            variant={isRunning ? "default" : "secondary"}
            className={cn(
              isRunning && "bg-green-500 hover:bg-green-600"
            )}
          >
            {statusLabels[server.status]}
          </Badge>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{server.currentPlayers.length}/{server.maxPlayers}</span>
          </div>

          {server.map && (
            <span className="text-muted-foreground truncate">
              {server.map}
            </span>
          )}
        </div>

        {isRunning && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>CPU: {server.cpuUsage}%</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>RAM: {server.memoryUsage}%</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {isRunning ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onStop?.(server)}
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onRestart?.(server)}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restart
            </Button>
          </>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => onStart?.(server)}
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
