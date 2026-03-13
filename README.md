# LinuxGSM Web UI

A modern, responsive web interface for managing LinuxGSM game servers built with Next.js 14, React 18, TypeScript, and shadcn/ui.

## Features

- **Server Management**: View and control multiple game servers from a single dashboard
- **Real-time Status**: Auto-refreshing server status with color-coded indicators
- **Server Control**: Start, stop, restart servers with one click
- **Server Discovery**: Scan remote hosts for LinuxGSM installations via SSH
- **SSH Connections**: Secure password or private key authentication
- **Command Palette**: Quick actions via keyboard shortcut (Cmd+K)
- **Config Editor**: Edit both LinuxGSM and game-specific configs with syntax preservation
- **Console**: View and interact with server console (requires tmux)
- **Backups**: List and restore backups via the Backups tab
- **Alerts**: Configure Discord webhooks for server event notifications
- **Responsive UI**: Works on desktop and mobile with collapsible sidebar

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components, Lucide icons
- **State**: Zustand with persistence
- **SSH**: ssh2 library (externalized for server-side)
- **Forms**: Native HTML with validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Usage

1. **Add a Server**: Click "Add Server" in the sidebar or dashboard
   - Choose **Discover** to scan a remote host for LinuxGSM servers
   - Or use **Manual Add** to configure a server manually
2. **Control Servers**: Use the server cards on the dashboard to start/stop/restart
3. **Server Details**: Click a server to open the detail page with tabs:
   - **Overview**: Stats, player count, server info
   - **Console**: Send commands and view live output
   - **Players**: See who's online
   - **Config**: Edit LGSM or game configs
   - **Backups**: Restore from previous backups
4. **Command Palette**: Press `Cmd+K` (Mac) or `Ctrl+K` to open quick actions
5. **Alerts**: Visit `/alerts` to configure Discord webhook notifications

## Configuration

### Alert Webhooks

To receive Discord notifications:
1. Create a webhook in your Discord channel settings
2. Go to `/alerts`
3. Paste the webhook URL
4. Toggle events you want to be notified about
5. Click "Test" to verify

## Project Structure

```
/src
  /app
    /api           - Next.js API routes for SSH operations
    /server/[id]   - Server detail page
    /alerts        - Alerts configuration page
    page.tsx       - Dashboard (home)
    layout.tsx     - Root layout with command palette
  /components
    /layout        - Header, Sidebar
    /modals        - SSH connection modal
    /servers       - Server card
    /ui            - shadcn/ui components
    command-palette.tsx
  /lib
    /ssh           - SSH client wrapper
    /linuxgsm      - LinuxGSM command helpers (detector, commands)
    utils.ts
  /stores          - Zustand stores (servers, ui, auth)
  /types           - TypeScript type definitions
```

## API Routes

All endpoints expect a JSON body with `connection` (SSH credentials) and `server` (server object).

- `POST /api/servers` - Discover or add servers
- `POST /api/servers/[id]/status` - Get server status
- `POST /api/servers/[id]/start` - Start server
- `POST /api/servers/[id]/stop` - Stop server
- `POST /api/servers/[id]/restart` - Restart server
- `POST /api/servers/[id]/command` - Send console command
- `POST /api/servers/[id]/console` - Get console log
- `POST /api/servers/[id]/config` - Get/save config
- `GET /api/servers/[id]/backups` - List backups
- `POST /api/servers/[id]/restore` - Restore a backup

## Notes

- SSH keys are never stored persistently; they are kept in browser memory
- Server data is persisted in browser's localStorage (zustand)
- Real-time updates use polling (30s interval); WebSocket planned
- For production, ensure proper secret management for SSH credentials

## Development Roadmap

- [ ] WebSocket for real-time console streaming
- [ ] Install wizard UI
- [ ] Update management with progress UI
- [ ] Advanced log viewer with filtering
- [ ] Settings page (theme, polling interval)
- [ ] User authentication
- [ ] Persistent backend storage (database)
- [ ] Multi-user support with roles

## License

MIT
