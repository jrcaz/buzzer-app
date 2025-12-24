export interface Player {
  id: string;
  name: string;
  buzzTime: number | null;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  isActive: boolean;
  roundStartTime: number | null;
  buzzOrder: string[];
}

export interface RoomState {
  code: string;
  players: Player[];
  isActive: boolean;
  buzzOrder: Player[];
}

export interface ServerToClientEvents {
  roomCreated: (data: { roomCode: string }) => void;
  hostJoined: (data: { roomCode: string }) => void;
  roomJoined: (data: { roomCode: string; playerName: string }) => void;
  playerJoined: (data: { player: Player }) => void;
  playerLeft: (data: { playerId: string }) => void;
  roundStarted: (data: { startTime: number }) => void;
  roundStopped: () => void;
  roundReset: () => void;
  buzzerPressed: (data: { player: Player; position: number }) => void;
  roomState: (data: RoomState) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  createRoom: () => void;
  joinAsHost: (data: { roomCode: string }) => void;
  joinRoom: (data: { roomCode: string; playerName: string }) => void;
  startRound: () => void;
  stopRound: () => void;
  resetRound: () => void;
  pressBuzzer: () => void;
  getRoomState: () => void;
}
