import { createServer } from "http";
import { parse } from "url";
import { Server } from "socket.io";
import next from "next";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Room,
  Player,
  RoomState,
} from "./src/types/game";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory room storage
const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRoomState(room: Room): RoomState {
  const players = Array.from(room.players.values());
  const buzzOrder = room.buzzOrder
    .map((id) => room.players.get(id))
    .filter((p): p is Player => p !== undefined);

  return {
    code: room.code,
    players,
    isActive: room.isActive,
    buzzOrder,
  };
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    }
  );

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("createRoom", () => {
      let code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }

      const room: Room = {
        id: code,
        code,
        hostId: socket.id,
        players: new Map(),
        isActive: false,
        roundStartTime: null,
        buzzOrder: [],
      };

      rooms.set(code, room);
      playerToRoom.set(socket.id, code);
      socket.join(code);

      socket.emit("roomCreated", { roomCode: code });
      console.log(`Room created: ${code} by ${socket.id}`);
    });

    socket.on("joinAsHost", ({ roomCode }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      // Update the host socket ID (in case of reconnection)
      room.hostId = socket.id;
      playerToRoom.set(socket.id, roomCode.toUpperCase());
      socket.join(roomCode.toUpperCase());

      socket.emit("hostJoined", { roomCode: room.code });
      console.log(`Host joined room ${room.code} (socket: ${socket.id})`);
    });

    socket.on("joinRoom", ({ roomCode, playerName }) => {
      const room = rooms.get(roomCode.toUpperCase());

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      const player: Player = {
        id: socket.id,
        name: playerName,
        buzzTime: null,
      };

      room.players.set(socket.id, player);
      playerToRoom.set(socket.id, roomCode.toUpperCase());
      socket.join(roomCode.toUpperCase());

      socket.emit("roomJoined", { roomCode: room.code, playerName });
      io.to(room.code).emit("playerJoined", { player });
      io.to(room.code).emit("roomState", getRoomState(room));

      console.log(`${playerName} joined room ${room.code}`);
    });

    socket.on("startRound", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      room.isActive = true;
      room.roundStartTime = Date.now();
      room.buzzOrder = [];

      // Reset all player buzz times
      room.players.forEach((player) => {
        player.buzzTime = null;
      });

      io.to(roomCode).emit("roundStarted", { startTime: room.roundStartTime });
      io.to(roomCode).emit("roomState", getRoomState(room));

      console.log(`Round started in room ${roomCode}`);
    });

    socket.on("stopRound", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      room.isActive = false;

      io.to(roomCode).emit("roundStopped");
      io.to(roomCode).emit("roomState", getRoomState(room));

      console.log(`Round stopped in room ${roomCode}`);
    });

    socket.on("resetRound", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostId !== socket.id) return;

      room.isActive = false;
      room.roundStartTime = null;
      room.buzzOrder = [];

      room.players.forEach((player) => {
        player.buzzTime = null;
      });

      io.to(roomCode).emit("roundReset");
      io.to(roomCode).emit("roomState", getRoomState(room));

      console.log(`Round reset in room ${roomCode}`);
    });

    socket.on("pressBuzzer", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || !room.isActive || !room.roundStartTime) return;

      const player = room.players.get(socket.id);
      if (!player || player.buzzTime !== null) return;

      player.buzzTime = Date.now() - room.roundStartTime;
      room.buzzOrder.push(socket.id);

      const position = room.buzzOrder.length;

      io.to(roomCode).emit("buzzerPressed", { player, position });
      io.to(roomCode).emit("roomState", getRoomState(room));

      console.log(
        `${player.name} buzzed at position ${position} in room ${roomCode}`
      );
    });

    socket.on("getRoomState", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      socket.emit("roomState", getRoomState(room));
    });

    socket.on("disconnect", () => {
      const roomCode = playerToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.hostId === socket.id) {
        // Host left, close the room
        io.to(roomCode).emit("error", { message: "Host left the room" });
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} closed (host left)`);
      } else {
        // Player left
        room.players.delete(socket.id);
        room.buzzOrder = room.buzzOrder.filter((id) => id !== socket.id);
        io.to(roomCode).emit("playerLeft", { playerId: socket.id });
        io.to(roomCode).emit("roomState", getRoomState(room));
      }

      playerToRoom.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
