"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket";
import { initSound } from "@/lib/sounds";

interface JoinPageProps {
  params: Promise<{ roomCode: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
  const { roomCode } = use(params);
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initSound();
  }, []);

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsJoining(true);
    setError("");

    const socket = getSocket();
    const trimmedName = playerName.trim();
    const upperRoomCode = roomCode.toUpperCase();

    const handleRoomJoined = ({ roomCode: code }: { roomCode: string }) => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("error", handleError);
      router.push(`/play/${code}?name=${encodeURIComponent(trimmedName)}`);
    };

    const handleError = ({ message }: { message: string }) => {
      socket.off("roomJoined", handleRoomJoined);
      socket.off("error", handleError);
      setError(message);
      setIsJoining(false);
    };

    socket.on("roomJoined", handleRoomJoined);
    socket.on("error", handleError);

    const doJoin = () => {
      socket.emit("joinRoom", {
        roomCode: upperRoomCode,
        playerName: trimmedName,
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once("connect", doJoin);
      connectSocket();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center bg-gradient-hero p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-hot-pink/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-electric-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className={`relative z-10 w-full max-w-md ${mounted ? "animate-fade-in" : "opacity-0"}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-hot-pink to-electric-blue animate-gradient">
            JOIN GAME
          </h1>
          <div className="mt-4">
            <p className="text-white/60 text-sm mb-1">Room Code</p>
            <p className="room-code text-electric-blue text-3xl">{roomCode.toUpperCase()}</p>
          </div>
        </div>

        {/* Join Form */}
        <div className="bg-slate-surface/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
          <div className="space-y-5" onKeyDown={handleKeyDown}>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="w-full h-14 px-4 text-lg bg-white/5 border border-white/10 rounded-xl
                           text-white placeholder-white/30
                           focus:outline-none focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20
                           transition-all duration-200"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-fade-in">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-electric-blue to-hot-pink text-white
                         shadow-lg shadow-electric-blue/20 hover:shadow-electric-blue/40
                         transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 disabled:hover:scale-100"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                "Join Game"
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-sm mt-8">
          Get ready to buzz!
        </p>
      </div>
    </div>
  );
}
