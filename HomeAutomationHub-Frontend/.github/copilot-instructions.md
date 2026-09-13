Tech stack
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- @microsoft/signalr
- lucide-react

UI style
- Modern dark smart-home dashboard aesthetic
- Use soft pill / rounded badges (rounded-2xl, rounded-full)
- Smooth transitions for state changes and hover effects
- Avoid sharp square borders; prefer rounded corners and subtle shadows

API endpoints (local development)
- REST: http://localhost:5235/api/devices
- SignalR Hub: http://localhost:5235/hubs/home

SignalR events
- Subscribe to DeviceStateChanged and apply immutable state updates in React (avoid mutating arrays/objects in-place)

Frontend responsibilities
- Poll or fetch initial device list from REST endpoint on app load
- Use SignalR to receive real-time state updates and merge them into local state immutably
- Use Tailwind utility classes for spacing, colors, rounded corners and transitions

Notes
- Keep network calls small and resilient; reconnect SignalR with withAutomaticReconnect()
- Keep TypeScript interfaces synchronized with backend contract (deviceId, deviceType, isActive, telemetry, lastUpdatedUtc)
