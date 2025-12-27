const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.SECRET;

if (!SECRET) throw new Error("SECRET env var is missing");

const clients = new Set<Bun.ServerWebSocket>();

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(
  type: "info" | "warn" | "error" | "broadcast" | "connection",
  message: string,
  extra?: Record<string, unknown>,
) {
  const ts = new Date().toISOString();
  let color = COLORS.cyan;

  switch (type) {
    case "error":
      color = COLORS.red;
      break;
    case "warn":
      color = COLORS.yellow;
      break;
    case "broadcast":
      color = COLORS.green;
      break;
    case "connection":
      color = COLORS.bright;
      break;
    case "info":
    default:
      color = COLORS.cyan;
      break;
  }

  const extras = extra
    ? ` | ${Object.entries(extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")}`
    : "";
  console.log(
    `${color}[${ts}] [${type.toUpperCase()}] ${message}${extras}${COLORS.reset}`,
  );
}

const server = Bun.serve({
  port: PORT,
  fetch: async (req, server) => {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      server.upgrade(req);
      return;
    }

    if (req.method === "GET" && url.pathname === "/metrics") {
      return Response.json({ connectedClients: clients.size });
    }

    if (req.method === "POST" && url.pathname === "/send") {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${SECRET}`) {
        log("error", "Unauthorized send attempt", {
          ip: req.headers.get("x-forwarded-for"),
        });
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const payload = await req.json();
        const msg = JSON.stringify(payload);
        clients.forEach((ws) => ws.send(msg));
        log("broadcast", "Message sent to clients", {
          payload,
          clients: clients.size,
        });
        return new Response("OK");
      } catch (err) {
        log("error", "Failed to parse message", { error: err });
        return new Response("Bad Request", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      log("connection", "Client connected", { clients: clients.size });
    },
    close(ws) {
      clients.delete(ws);
      log("connection", "Client disconnected", { clients: clients.size });
    },
    message(ws, message) {},
  },
});

log("info", "Socket server started", {
  port: server.port,
  endpoints: ["/ws", "/send", "/metrics"],
});
