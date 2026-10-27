# Frontend Socket.IO rooms

The Pleco realtime endpoint is **Socket.IO**, not a raw WebSocket endpoint. Use
the `socket.io-client` package with the backend origin, path `/api/v1/ws`, and
default namespace `/`. The backend authenticates the existing HTTP-only cookie
during the connection handshake. It does not use a token from the Socket.IO
`auth` payload.

## Which rooms does the frontend join?

| Room | How to join | How to leave | Current robot connectivity events |
| --- | --- | --- | --- |
| `user:{user_id}` | Automatically after a valid cookie handshake | Disconnect | None targeted to this room |
| `group:{group_id}` | Automatically when the user has a valid active group | Disconnect, or reconnect after changing the active group | `robot.status` for robots in that group |
| `map:{map_id}` | Emit `map.subscribe` with `{ mapId }` after connection | Emit `map.unsubscribe` with `{ mapId }`, or disconnect | `robot.status` for robots assigned to that map |

Do not send a room name, user ID, or group ID to join the automatic rooms. The
server chooses them from the authenticated cookie and verifies group membership.
Map subscriptions are authorized against the user's active group. A socket in
both the group and map rooms receives one copy of a connectivity event.

## React example

Install `socket.io-client` in the frontend project. Pass the backend's HTTP(S)
origin, such as `https://api.example.com`, as `apiOrigin`; do not append
`/api/v1/ws` to the origin. Mount this hook once at the page or application
boundary that owns the connection. Pass `mapId` only while viewing a map.

```tsx
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

type RobotStatus = {
  robot_id: string;
  ip_address: string | null;
  connection_status: "ONLINE" | "STALE" | "OFFLINE";
  operational_status: "IDLE" | "EXECUTING" | "CHARGING";
  last_seen_at: string | null;
};

type RoomAck =
  | { success: true }
  | { success: false; error: string };

type Options = {
  apiOrigin: string;
  mapId?: string;
  onStatus: (status: RobotStatus) => void;
  refreshBots: () => void | Promise<void>;
};

export function useRobotStatusSocket({
  apiOrigin,
  mapId,
  onStatus,
  refreshBots,
}: Options): void {
  const callbacks = useRef({ onStatus, refreshBots });

  // New render callbacks must not tear down the connection.
  useEffect(() => {
    callbacks.current = { onStatus, refreshBots };
  }, [onStatus, refreshBots]);

  useEffect(() => {
    const socket = io(apiOrigin, {
      path: "/api/v1/ws",
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });
    let disposed = false;

    const refresh = () => {
      void Promise.resolve()
        .then(() => {
          if (!disposed) return callbacks.current.refreshBots();
        })
        .catch(console.error);
    };

    const handleConnect = () => {
      // A new connection has new server-side room membership. Reload the
      // current snapshot because events missed while offline are not replayed.
      refresh();
      if (!mapId) return; // The user/group rooms were joined automatically.
      void socket
        .timeout(5_000)
        .emitWithAck("map.subscribe", { mapId })
        .then((ack: RoomAck) => {
          if (disposed) return;
          if (!ack.success) {
            console.error("Map subscription failed:", ack.error);
            return;
          }
          // Fetch after the room join so the snapshot covers the gap while
          // disconnected and while the subscription was being established.
          refresh();
        })
        .catch((error: unknown) => {
          if (!disposed) console.error("Map subscription timed out:", error);
        });
    };

    const handleStatus = (status: RobotStatus) => {
      callbacks.current.onStatus(status);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket.IO connection failed:", error.message);
      // socket.active is false after a rejected handshake. Once the cookie or
      // active-group access is fixed, mount a new connection; do not spin here.
      if (!socket.active) console.error("Socket.IO needs a new login/connection");
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.debug("Socket.IO reconnect attempt:", attempt);
    };

    socket.on("connect", handleConnect);
    socket.on("robot.status", handleStatus);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.connect();

    return () => {
      disposed = true;
      socket.off("connect", handleConnect);
      socket.off("robot.status", handleStatus);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.disconnect(); // Stops retries and removes server-side room membership.
    };
  }, [apiOrigin, mapId]);
}
```

Socket.IO increases the retry delay approximately `1 s → 2 s → 4 s → ...`,
caps it at 30 seconds, and adds jitter. It automatically retries temporary
transport failures. A rejected cookie or active-group handshake needs a fresh
login or corrected access before a new connection is opened; repeatedly
calling `connect()` on the same rejected credentials will not help.

When the owning component unmounts, the cleanup removes listeners, stops
reconnection attempts, and disconnects the socket. Changing `mapId` also closes
the old connection and opens a new one, so the previous map membership cannot
linger. If the application instead keeps one shared socket across pages, keep
that connection in a top-level provider: a map page should emit
`map.unsubscribe` for its old `{ mapId }` on unmount and remove only its own
listeners. Disconnect the shared socket when its provider unmounts or the user
logs out.

For a shared socket, the map page's cleanup can send the leave event while the
connection remains open:

```tsx
return () => {
  socket.off("robot.status", handleStatus);
  if (socket.connected) socket.emit("map.unsubscribe", { mapId });
};
```

If the socket is already disconnected, the server has already removed its room
membership. On the next `connect`, subscribe to the currently viewed map again.

## Map acknowledgements and status events

`map.subscribe` and `map.unsubscribe` accept exactly `{ "mapId": "<UUID>" }`.
Both acknowledge success with `{ "success": true }`; failures return
`{ "success": false, "error": "<CODE>" }`. Possible codes are
`AUTHENTICATION_REQUIRED`, `INVALID_PAYLOAD`, `GROUP_REQUIRED`,
`MAP_NOT_FOUND`, `MAP_ACCESS_DENIED`, `ROOM_OPERATION_FAILED`, and
`INTERNAL_ERROR`. If a map subscription fails, the group room can still receive
group-wide connectivity events. Retry the map subscription only after fixing
the reported cause or after a new connection.

The `robot.status` payload has `robot_id`, `ip_address`, `connection_status`,
`operational_status`, and `last_seen_at`. Only accepted ONLINE/OFFLINE
transitions are sent. Heartbeats and operational-only changes have no frontend
event on this path. Fetch the current bot list on the first connection and
after every reconnection so a temporary disconnect cannot leave stale status
in the UI.

See [Robot Status: Mock Device to Frontend](ROBOT_STATUS_REALTIME_DATA_FLOW.md)
for the backend event path and [Socket.IO Map Rooms: Data Flow](SOCKETIO_MAP_ROOMS_DATA_FLOW.md)
for room authorization and acknowledgement details. Socket.IO client retry
behavior is described in the [official client options](https://socket.io/docs/v4/client-options/)
and [client API](https://socket.io/docs/v4/client-api/).
