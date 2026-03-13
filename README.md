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
3. Copy `.env.example` to `.env` and adjust as needed (defaults are fine for local)
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://0.0.0.0:3331](http://0.0.0.0:3331) in your browser (or http://localhost:3331)

### Build for Production

```bash
npm run build
npm start
```

The server binds to `0.0.0.0:3331` by default. You can change the port via the `PORT` environment variable or by editing the `start` script. The host is always `0.0.0.0` to allow external access.

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

### Environment Variables

Copy `.env.example` to `.env` and customize:

- `PORT` - Server port (default: 3331)
- `HOST` - Bind address (default: 0.0.0.0)
- `DEFAULT_ADMIN_PASSWORD` - Initial admin password (default: admin123)
- `PEPPER` - Optional pepper for password hashing (recommended for production)
- `NODE_ENV` - Set to `production` for production deployments
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email settings for alerts

The application stores data (users, sessions, audit logs) in the `data/` directory. Ensure this directory is writable.

### Alert Webhooks

To receive Discord notifications:
1. Create a webhook in your Discord channel settings
2. Go to `/alerts`
3. Paste the webhook URL
4. Toggle events you want to be notified about
5. Click "Test" to verify

### Security Notes

- On first startup, an admin user is automatically created: username `admin` with password from `DEFAULT_ADMIN_PASSWORD` (or `admin123`)
- All credentials are stored encrypted (scrypt) in `data/users.json`
- Sessions are stored in `data/sessions.json`
- Audit logs are stored in `data/audit-log.json` and can be viewed by admins at `/admin/audit`
- Two-factor authentication (2FA) is available per user in the Profile page
- Role-based access control: admin (full), operator (server control), viewer (read-only)

## Project Structure

```
/src
  /app
    /api
      ... various API routes
      /auth          - Authentication (login, logout, 2FA)
      /servers/[id]  - Server operations
      /admin         - Admin pages (users, audit)
    /admin
      /users         - User management page
      /audit         - Audit log viewer page
    /profile        - User profile page
    /sessions       - Session management page
    /server/[id]    - Server detail pages (overview, console, config, monitor, parameters, backups, logs)
    /alerts         - Alerts configuration page
    page.tsx        - Dashboard (home)
    layout.tsx      - Root layout
  /components
    /layout         - Header, Sidebar
    /modals         - SSH connection modal
    /servers        - Server card
    /ui             - shadcn/ui components
    command-palette.tsx
  /lib
    /auth           - Authentication helpers, user management
    /audit.ts       - Audit logging system
    /ssh            - SSH client wrapper
    /linuxgsm       - LinuxGSM command helpers (detector, commands)
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
