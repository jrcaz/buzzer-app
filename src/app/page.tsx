"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket";
import { initSound } from "@/lib/sounds";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initSound();
  }, []);

  const handleCreateRoom = () => {
    setIsCreating(true);
    setError("");
    connectSocket();
    const socket = getSocket();

    socket.emit("createRoom");

    socket.once("roomCreated", ({ roomCode }) => {
      router.push(`/host/${roomCode}`);
    });

    socket.once("error", ({ message }) => {
      setError(message);
      setIsCreating(false);
    });
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError("Please enter both room code and your name");
      return;
    }

    setIsJoining(true);
    setError("");
    connectSocket();
    const socket = getSocket();

    socket.emit("joinRoom", {
      roomCode: roomCode.toUpperCase(),
      playerName: playerName.trim(),
    });

    socket.once("roomJoined", ({ roomCode: code }) => {
      router.push(`/play/${code}?name=${encodeURIComponent(playerName.trim())}`);
    });

    socket.once("error", ({ message }) => {
      setError(message);
      setIsJoining(false);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && showJoinForm) {
      handleJoinRoom();
    }
  };

  return (
    <div className="min-h-screen-safe flex flex-col items-center justify-center bg-gradient-hero p-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-electric-blue/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-hot-pink/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className={`relative z-10 w-full max-w-md ${mounted ? "animate-fade-in" : "opacity-0"}`}>
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-hot-pink to-electric-blue animate-gradient">
            BUZZER
          </h1>
          <p className="text-white/60 mt-3 text-lg">
            Be the first to buzz in!
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-surface/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
          {!showJoinForm ? (
            /* Main Menu */
            <div className="space-y-4 animate-fade-in">
              <button
                className="w-full h-16 text-xl font-bold rounded-2xl bg-gradient-to-r from-electric-blue to-hot-pink text-white
                           shadow-lg shadow-electric-blue/20 hover:shadow-electric-blue/40
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-50 disabled:hover:scale-100"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Host a Game"
                )}
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 text-sm text-white/40 bg-slate-surface/50">
                    or
                  </span>
                </div>
              </div>

              <button
                className="w-full h-16 text-xl font-bold rounded-2xl bg-transparent text-white
                           border-2 border-white/20 hover:border-white/40 hover:bg-white/5
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setShowJoinForm(true)}
              >
                Join a Game
              </button>
            </div>
          ) : (
            /* Join Form */
            <div className="space-y-5 animate-fade-in" onKeyDown={handleKeyDown}>
              <button
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                onClick={() => {
                  setShowJoinForm(false);
                  setError("");
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

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

              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full h-14 px-4 text-2xl font-mono tracking-[0.2em] text-center bg-white/5 border border-white/10 rounded-xl
                             text-white placeholder-white/30 uppercase
                             focus:outline-none focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20
                             transition-all duration-200"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-fade-in">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-electric-blue to-hot-pink text-white
                           shadow-lg shadow-electric-blue/20 hover:shadow-electric-blue/40
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                           disabled:opacity-50 disabled:hover:scale-100"
                onClick={handleJoinRoom}
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
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-sm mt-8">
          Fast. Fun. First to buzz wins.
        </p>
      </div>
    </div>
  );
}
