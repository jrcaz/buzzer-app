"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { connectSocket, getSocket } from "@/lib/socket";
import { playSound, initSound } from "@/lib/sounds";
import type { RoomState, Player } from "@/types/game";

interface HostPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function HostPage({ params }: HostPageProps) {
  const { roomCode } = use(params);
  const router = useRouter();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [newPlayerIds, setNewPlayerIds] = useState<Set<string>>(new Set());

  const generateQRCode = useCallback(async (code: string) => {
    try {
      const joinUrl = `${window.location.origin}/join/${code}`;
      const url = await QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#3B82F6",
          light: "#0F172A",
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  }, []);

  useEffect(() => {
    initSound();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("joinAsHost", { roomCode });
    };

    const handleHostJoined = ({
      roomCode: joinedCode,
    }: {
      roomCode: string;
    }) => {
      generateQRCode(joinedCode);
      socket.emit("getRoomState");
    };

    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
    };

    const handlePlayerJoined = ({ player }: { player: Player }) => {
      playSound("join");
      setNewPlayerIds((prev) => new Set(prev).add(player.id));
      setTimeout(() => {
        setNewPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
      }, 500);
      socket.emit("getRoomState");
    };

    const handlePlayerLeft = () => {
      socket.emit("getRoomState");
    };

    const handleBuzzerPressed = () => {
      playSound("buzz");
      socket.emit("getRoomState");
    };

    const handleError = ({ message }: { message: string }) => {
      console.error("Socket error:", message);
      if (message.includes("not found")) {
        router.replace("/");
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("hostJoined", handleHostJoined);
    socket.on("roomState", handleRoomState);
    socket.on("playerJoined", handlePlayerJoined);
    socket.on("playerLeft", handlePlayerLeft);
    socket.on("buzzerPressed", handleBuzzerPressed);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("joinAsHost", { roomCode });
    } else {
      connectSocket();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("hostJoined", handleHostJoined);
      socket.off("roomState", handleRoomState);
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("playerLeft", handlePlayerLeft);
      socket.off("buzzerPressed", handleBuzzerPressed);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
    };
  }, [roomCode, router, generateQRCode]);

  const handleStartRound = () => {
    const socket = getSocket();
    socket.emit("startRound");
  };

  const handleStopRound = () => {
    const socket = getSocket();
    socket.emit("stopRound");
  };

  const handleResetRound = () => {
    const socket = getSocket();
    socket.emit("resetRound");
    playSound("reset");
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-winner text-white";
      case 2:
        return "bg-slate-400 text-white";
      case 3:
        return "bg-amber-600 text-white";
      default:
        return "bg-electric-blue text-white";
    }
  };

  const getPositionLabel = (position: number): string => {
    switch (position) {
      case 1:
        return "1st";
      case 2:
        return "2nd";
      case 3:
        return "3rd";
      default:
        return `${position}th`;
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gradient-hero">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-gradient-hero">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Room Code Section */}
        <section className="bg-slate-surface/50 backdrop-blur rounded-3xl p-6 text-center animate-fade-in">
          <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wider">
            Room Code
          </p>
          <div className="room-code text-electric-blue">{roomCode}</div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
            {qrCodeUrl && (
              <div className="p-3 bg-deep-navy rounded-2xl border border-white/10">
                <img
                  src={qrCodeUrl}
                  alt="QR Code to join"
                  className="w-32 h-32"
                />
              </div>
            )}
            <div className="text-left">
              <p className="text-white/80 text-sm">Scan to join or visit:</p>
              <p className="text-electric-blue font-mono text-sm break-all">
                {typeof window !== "undefined" &&
                  `${window.location.origin}/join/${roomCode}`}
              </p>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="bg-slate-surface/50 backdrop-blur rounded-3xl p-6 animate-fade-in">
          <div className="flex flex-wrap gap-4 justify-center">
            {!roomState?.isActive ? (
              <button
                className="h-16 px-10 text-xl font-bold rounded-2xl bg-gradient-winner text-white
                           shadow-lg shadow-neon-green/20 hover:shadow-neon-green/40
                           transition-all duration-200 hover:scale-105 active:scale-95
                           disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                onClick={handleStartRound}
                disabled={!roomState || roomState.players.length === 0}
              >
                Start Round
              </button>
            ) : (
              <button
                className="h-16 px-10 text-xl font-bold rounded-2xl bg-gradient-buzzer text-white
                           shadow-lg shadow-hot-pink/20 hover:shadow-hot-pink/40
                           transition-all duration-200 hover:scale-105 active:scale-95"
                onClick={handleStopRound}
              >
                Stop Round
              </button>
            )}
            <button
              className="h-16 px-10 text-xl font-bold rounded-2xl bg-slate-surface text-white
                         border-2 border-white/20 hover:border-white/40
                         transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={handleResetRound}
            >
              Reset
            </button>
          </div>

          {roomState && roomState.players.length === 0 && (
            <p className="text-center text-white/60 mt-4">
              Waiting for players to join...
            </p>
          )}

          {roomState?.isActive && (
            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric-orange/20 text-electric-orange font-semibold">
                <span className="w-2 h-2 rounded-full bg-electric-orange animate-pulse" />
                Round Active
              </span>
            </div>
          )}
        </section>

        {/* Buzz Results */}
        {roomState && roomState.buzzOrder.length > 0 && (
          <section className="bg-slate-surface/50 backdrop-blur rounded-3xl p-6 animate-slide-in-up">
            <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
              <span className="text-2xl">&#9889;</span> Buzz Order
            </h2>
            <div className="space-y-3">
              {roomState.buzzOrder.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                    index === 0
                      ? "bg-neon-green/20 border-2 border-neon-green/50"
                      : "bg-white/5 border border-white/10"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${getPositionStyle(index + 1)}`}
                    >
                      {getPositionLabel(index + 1)}
                    </span>
                    <span
                      className={`text-xl font-semibold ${
                        index === 0 ? "text-neon-green" : "text-white"
                      }`}
                    >
                      {player.name}
                    </span>
                  </div>
                  <span className="text-lg font-mono text-white/60">
                    {player.buzzTime}ms
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Players List */}
        <section className="bg-slate-surface/50 backdrop-blur rounded-3xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-xl">Players</h2>
            <span className="px-3 py-1 rounded-full bg-electric-blue/20 text-electric-blue font-semibold">
              {roomState?.players.length || 0}
            </span>
          </div>

          {roomState && roomState.players.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {roomState.players.map((player: Player) => (
                <div
                  key={player.id}
                  className={`player-card p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
                    newPlayerIds.has(player.id) ? "animate-slide-in-up" : ""
                  } ${
                    player.buzzTime !== null
                      ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                      : "bg-white/5 text-white border border-white/10"
                  }`}
                >
                  <span className="block truncate">{player.name}</span>
                  {player.buzzTime !== null && (
                    <span className="block text-xs mt-1 font-mono opacity-70">
                      {player.buzzTime}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">&#128100;</span>
              </div>
              <p className="text-white/60">No players yet</p>
              <p className="text-white/40 text-sm mt-1">
                Share the room code to get started
              </p>
            </div>
          )}
        </section>

        {/* Connection Status */}
        <footer className="text-center pb-4">
          <div className="inline-flex items-center gap-2 text-sm text-white/40">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-neon-green" : "bg-red-500"}`}
            />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </footer>
      </div>
    </div>
  );
}
