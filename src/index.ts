const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.SECRET;

if (!SECRET) throw new Error("SECRET env var is missing");

type ChatPayload = {
  type: "chat-message";
  content: string;
  userId: string;
  ign: string;
  uuid: string;
  isAdmin: boolean;
  isFlagged: boolean;
  player?: Record<string, unknown> | null;
};

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

function getDate() {
  const now = new Date();
  return {
    month: now.getMonth(), //0 = Jan
    day: now.getDate(),
  };
}

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

/*
  Ported from @duelsplus/src/features/autoStats/StatsMessageBuilder.ts
  spoiler: lots of if else
*/
function hypixelRank(player: Record<string, unknown> | null | undefined) {
  if (!player) return "";
  const prefix = player.prefix as string | undefined;
  if (prefix) {
    return `${prefix.replace(/§[0-9a-fk-or]/gi, "")} `;
  }
  const rank = player.rank as string | undefined;
  if (rank === "YOUTUBER") return "[YOUTUBE] ";
  if (rank === "STAFF") return "[ዞ] ";
  const monthlyPackageRank = player.monthlyPackageRank as string | undefined;
  const newPackageRank = player.newPackageRank as string | undefined;
  const packageRank = player.packageRank as string | undefined;
  if (monthlyPackageRank === "SUPERSTAR") return "[MVP++] ";
  if (newPackageRank === "MVP_PLUS" || packageRank === "MVP_PLUS") {
    return "[MVP+] ";
  }
  if (newPackageRank === "MVP" || packageRank === "MVP") return "[MVP] ";
  if (newPackageRank === "VIP_PLUS" || packageRank === "VIP_PLUS") {
    return "[VIP+] ";
  }
  if (newPackageRank === "VIP" || packageRank === "VIP") return "[VIP] ";
  return "";
}

async function hypixelPlayer(uuid: string) {
  if (!uuid || uuid === "00000000-0000-0000-0000-000000000000") {
    return null;
  }
  try {
    const res = await fetch(
      `https://api.venxm.uk/proxied/hypixel/player?uuid=${encodeURIComponent(uuid)}&apikeyless=true`,
    );
    if (!res.ok) {
      log("warn", `Can't resolve Hypixel player (${res.status})`, {
        uuid,
      });
      return null;
    }
    const data = (await res.json()) as {
      success: boolean;
      player?: Record<string, unknown>;
    };
    if (!data.success || !data.player) {
      return null;
    }
    return data.player;
  } catch {
    log("warn", "Can't resolve Hypixel player :(", {
      uuid,
    });
    return null;
  }
}

async function embed(payload: any) {
  if (!process.env.NOTIFY_WEBHOOK || payload?.type !== "chat-message") return;
  try {
    await fetch(process.env.NOTIFY_WEBHOOK!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `> ${payload?.isAdmin ? ":small_orange_diamond:" : ":small_blue_diamond:"} \`${hypixelRank(payload?.player)}${String(payload?.ign)}\`: \`${String(payload?.content ?? "").slice(0, 200)}\``,
      }),
    });
  } catch (err) {
    log("warn", "Failed to notify webhook", { error: String(err) });
  }
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
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${SECRET}`) {
        log("error", "Unauthorized send attempt", {
          ip: req.headers.get("x-forwarded-for"),
        });
        return new Response("Unauthorized", { status: 401 });
      }

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
        const payload = (await req.json()) as ChatPayload; //i hate typescript it was easier in js
        if (
          payload.type === "chat-message" &&
          payload.uuid &&
          payload.ign !== "System"
        ) {
          payload.player = await hypixelPlayer(payload.uuid);
        }
        const msg = JSON.stringify(payload);
        clients.forEach((ws) => ws.send(msg));
        log("broadcast", "Message sent to clients", {
          payload,
          clients: clients.size,
        });
        await embed(payload);
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

      const { month, day } = getDate();
      if (month === 0 && day === 1) {
        const payload = {
          type: "chat-message",
          content: "Happy New Year from the Duels+ team!",
          userId: "00000000-0000-0000-0000-000000000000",
          ign: "System",
        };
        setTimeout(() => {
          if (!clients.has(ws)) return;
          ws.send(JSON.stringify(payload));
          log("broadcast", "Message sent to clients", {
            payload,
            clients: clients.size,
          });
        }, 3000);
      }
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
