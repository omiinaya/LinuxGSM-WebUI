# LinuxGSM Web UI - Architecture Plan

## Project Overview

A full-featured web interface for managing LinuxGSM game servers with a modern, professional UI using Next.js, React, and shadcn/ui components.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project Setup
- [ ] Initialize Next.js 14+ with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up project structure (components, lib, hooks, types)
- [ ] Configure ESLint and Prettier

### 1.2 Backend API Layer
- [ ] Create API routes for LinuxGSM communication
- [ ] Set up SSH connection manager (using ssh2 library)
- [ ] Create command execution service
- [ ] Implement config file parser (read/write .cfg files)
- [ ] Set up WebSocket for real-time updates

### 1.3 Core UI Components (shadcn)
- [ ] Layout components (Sidebar, Header, PageContainer)
- [ ] Navigation with server selector
- [ ] Server cards with status indicators
- [ ] Basic data tables for server lists
- [ ] Toast notifications
- [ ] Loading states and skeletons

### 1.4 Server Discovery & Connection
- [ ] Server scanner (detect servers in /home or configurable path)
- [ ] SSH connection form/modal
- [ ] Connection testing and validation
- [ ] Server profile management (save connections)

**Deliverable**: Basic server listing with connection status

---

## Phase 2: Server Management Dashboard

### 2.1 Server List View
- [ ] Grid/List view toggle
- [ ] Server cards showing:
  - Server name and game type
  - Status (Running/Stopped/Installing/Updating)
  - Player count (from query)
  - Uptime
  - CPU/RAM usage indicators
- [ ] Quick action buttons (Start/Stop/Restart)
- [ ] Search and filter functionality
- [ ] Bulk actions

### 2.2 Server Detail View
- [ ] Overview tab:
  - Real-time status
  - Player list (from query)
  - Server info (IP, port, map)
  - Resource usage charts
- [ ] Control panel:
  - Start/Stop/Restart buttons with confirmations
  - Force stop for hung servers
  - Quick console access
- [ ] Activity feed showing recent events

### 2.3 Real-time Monitoring
- [ ] WebSocket integration for live updates
- [ ] Server status polling (configurable interval)
- [ ] Player count tracking over time
- [ ] Resource usage graphs (CPU, RAM, Network)

**Deliverable**: Complete server dashboard with real-time status

---

## Phase 3: Configuration Management

### 3.1 LinuxGSM Config Editor
- [ ] Read/parse _default.cfg, common.cfg, instance.cfg
- [ ] Visual config editor with form fields:
  - Server name and description
  - IP and port configuration
  - Default map/world
  - Max players
  - Query port management
- [ ] Config templates (save/load configurations)
- [ ] Diff view for changes
- [ ] Backup before save

### 3.2 Game Server Config Editor
- [ ] Support for common game configs (server.cfg, etc.)
- [ ] Syntax-highlighted code editor (Monaco)
- [ ] Config presets per game type
- [ ] Template library

### 3.3 Start Parameters
- [ ] Launch options editor
- [ ] Predefined templates per game
- [ ] Advanced mode (raw parameters)
- [ ] Parameter validation

### 3.4 IP & Port Management
- [ ] Visual port allocator
- [ ] Port conflict detection
- [ ] IP binding configuration
- [ ] Firewall rule suggestions

**Deliverable**: Complete configuration management system

---

## Phase 4: Commands & Operations

### 4.1 Command Center
- [ ] Full command palette (Ctrl+K):
  - install, start, stop, restart
  - update, check-update, force-update
  - validate, backup
  - monitor, test-alert
- [ ] Command queue with progress
- [ ] Command history log

### 4.2 Install Wizard
- [ ] Game server selector (browse supported games)
- [ ] Installation path selection
- [ ] Dependency checker and installer
- [ ] Auto-install mode
- [ ] Progress tracking with logs

### 4.3 Update Management
- [ ] Check for updates UI
- [ ] Update preview (what will change)
- [ ] One-click update
- [ ] Rollback capability
- [ ] Validation after update

### 4.4 Backup System
- [ ] Backup creation with name/description
- [ ] Backup scheduler (cron-like UI)
- [ ] Backup storage location config
- [ ] One-click restore
- [ ] Backup comparison (size, date)

### 4.5 Console Access
- [ ] Real-time console output (WebSocket)
- [ ] Command input field
- [ ] ANSI color support
- [ ] Log search and filter
- [ ] Download console logs

### 4.6 Debug Mode
- [ ] Debug log viewer
- [ ] Common debug actions
- [ ] Error highlighting

**Deliverable**: Complete command center with all LinuxGSM commands

---

## Phase 5: Alerts & Notifications

### 5.1 Alert Configuration UI
- [ ] Enable/disable alerts per server
- [ ] Alert event types selection:
  - Server started/stopped
  - Server crash/freeze
  - Update available
  - Low disk space
  - High CPU/RAM
  - Player count threshold

### 5.2 Notification Channels
- [ ] **Discord**: Webhook configuration
- [ ] **Email**: SMTP settings with test
- [ ] **Telegram**: Bot API setup
- [ ] **Slack**: Webhook configuration
- [ ] **Pushbullet**: API key setup
- [ ] **Pushover**: API key setup
- [ ] **IFTTT**: Webhook setup
- [ ] **Rocket.Chat**: Webhook setup

### 5.3 Test Alerts
- [ ] Send test message to each channel
- [ ] Delivery status tracking

### 5.4 Notification History
- [ ] Alert log with timestamps
- [ ] Filter by type/server/channel

**Deliverable**: Complete alert system with all notification channels

---

## Phase 6: Monitoring & Logs

### 6.1 Log Viewer
- [ ] Multiple log file support (console, current, latest)
- [ ] Real-time log streaming
- [ ] Search and filter
- [ ] Log level filtering (INFO, WARN, ERROR)
- [ ] Download logs
- [ ] Log rotation settings

### 6.2 Statistics & Metrics
- [ ] Player count history (graphs)
- [ ] Resource usage history
- [ ] Uptime tracking
- [ ] Custom date ranges
- [ ] Export data (CSV/JSON)

### 6.3 Health Checks
- [ ] Server health score
- [ ] Issue detection (port conflicts, missing deps)
- [ ] Recommendations panel

**Deliverable**: Comprehensive monitoring and logging

---

## Phase 7: Advanced Features

### 7.1 Mod Management
- [ ] Workshop integration (Steam)
- [ ] Mod list viewer
- [ ] Install/update/remove mods
- [ ] Mod presets

### 7.2 Steam Features
- [ ] SteamCMD integration
- [ ] Branch management (beta, experimental)
- [ ] App ID configuration
- [ ] Steam credentials management (secrets)

### 7.3 User Management
- [ ] Multi-user support with roles:
  - Admin: Full access
  - Operator: Start/Stop/Config
  - Viewer: Read-only
- [ ] User authentication (local or OAuth)
- [ ] Activity audit log

### 7.4 Automation
- [ ] Scheduled tasks (cron-like UI)
- [ ] Auto-restart on crash
- [ ] Auto-update schedules
- [ ] Auto-backup schedules

### 7.5 Server Templates
- [ ] Create server templates
- [ ] Quick deploy from template
- [ ] Template marketplace (future)

**Deliverable**: Advanced features for power users

---

## Phase 8: Polish & Production

### 8.1 UI/UX Refinement
- [ ] Dark/Light mode toggle
- [ ] Responsive design (mobile support)
- [ ] Custom themes
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

### 8.2 Performance
- [ ] Optimize WebSocket connections
- [ ] Caching strategies
- [ ] Pagination for large lists
- [ ] Lazy loading

### 8.3 Security
- [ ] HTTPS enforcement
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] SSH key management
- [ ] Audit logging

### 8.4 Deployment
- [ ] Docker configuration
- [ ] Production build optimization
- [ ] Health checks
- [ ] Error tracking (Sentry)

### 8.5 Documentation
- [ ] User documentation
- [ ] API documentation
- [ ] In-app tooltips

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide Icons |
| State | Zustand, React Query |
| Backend | Next.js API Routes |
| SSH | ssh2, node-ssh |
| Real-time | WebSocket (ws) |
| Charts | Recharts |
| Editor | Monaco Editor |
| Forms | React Hook Form + Zod |

---

## Component Library (shadcn/ui)

### Layout
- [ ] Sidebar
- [ ] Header
- [ ] PageContainer
- [ ] Card
- [ ] Tabs
- [ ] CommandPalette

### Forms
- [ ] Input
- [ ] Select
- [ ] Switch
- [ ] Checkbox
- [ ] Textarea
- [ ] Form (with validation)

### Data Display
- [ ] Table
- [ ] Badge
- [ ] Avatar
- [ ] Progress
- [ ] Skeleton

### Feedback
- [ ] Toast
- [ ] Dialog (Modal)
- [ ] AlertDialog (Confirm)
- [ ] ScrollArea
- [ ] Separator

### Navigation
- [ ] Command (CommandK)
- [ ] DropdownMenu
- [ ] Sheet (Slide-over)

---

## File Structure

```
/app
  /api                    # API routes
    /servers              # Server CRUD
    /commands             # Command execution
    /configs              # Config management
    /alerts               # Alert config
    /ws                   # WebSocket
  /(dashboard)            # Dashboard routes
    /servers              # Server list
    /server/[id]          # Server detail
    /settings             # Global settings
    /alerts               # Alert config
/components
  /ui                     # shadcn components
  /servers                # Server-specific components
  /dashboard              # Dashboard components
  /config                 # Config editor components
  /console                # Console components
/lib
  /ssh                    # SSH utilities
  /parser                 # Config parsers
  /linuxgsm               # LinuxGSM command helpers
/hooks
  /useServer              # Server data fetching
  /useConsole             # Console WebSocket
  /useConfig              # Config management
/types
  /server.ts
  /config.ts
  /command.ts
  /alert.ts
```

---

## API Design

### Endpoints

```
GET    /api/servers              # List all servers
POST   /api/servers              # Add new server
GET    /api/servers/[id]         # Get server details
PUT    /api/servers/[id]         # Update server
DELETE /api/servers/[id]         # Remove server
POST   /api/servers/[id]/start   # Start server
POST   /api/servers/[id]/stop    # Stop server
POST   /api/servers/[id]/restart # Restart server
GET    /api/servers/[id]/status  # Get server status
GET    /api/servers/[id]/console # Stream console
POST   /api/servers/[id]/command # Send command

GET    /api/servers/[id]/config              # Get configs
PUT    /api/servers/[id]/config              # Save config

GET    /api/alerts           # Get alert configs
PUT    /api/alerts           # Save alert config
POST   /api/alerts/test      # Send test alert
```

---

## Next Steps

**Recommended Phase 1 Focus:**
1. Project setup with Next.js + shadcn/ui
2. Basic SSH connection handling
3. Server discovery (scan for LinuxGSM servers)
4. Server list with status indicators
5. Basic start/stop/restart functionality

Shall we begin with Phase 1?
