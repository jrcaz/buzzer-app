"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket";
import { playSound, initSound } from "@/lib/sounds";
import type { RoomState } from "@/types/game";

interface PlayPageProps {
  params: Promise<{ roomCode: string }>;
}

type BuzzerState = "waiting" | "ready" | "buzzed" | "winner" | "loser";

export default function PlayPage({ params }: PlayPageProps) {
  const { roomCode } = use(params);
  const searchParams = useSearchParams();
  const playerName = searchParams.get("name") || "Player";

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [buzzerState, setBuzzerState] = useState<BuzzerState>("waiting");
  const [showPressAnimation, setShowPressAnimation] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasInitializedSound = useRef(false);

  // Initialize sound on first user interaction
  const handleFirstInteraction = useCallback(() => {
    if (!hasInitializedSound.current) {
      initSound();
      hasInitializedSound.current = true;
    }
  }, []);

  // Update buzzer state based on room state
  useEffect(() => {
    if (!roomState?.isActive) {
      setBuzzerState("waiting");
    } else if (hasBuzzed) {
      setBuzzerState(myPosition === 1 ? "winner" : "loser");
    } else {
      setBuzzerState("ready");
    }
  }, [roomState?.isActive, hasBuzzed, myPosition]);

  useEffect(() => {
    const socket = getSocket();
    let hasJoined = false;

    const handleConnect = () => {
      setIsConnected(true);
      if (!hasJoined) {
        hasJoined = true;
        socket.emit("joinRoom", { roomCode, playerName });
      }
    };

    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
      const myBuzz = state.buzzOrder.findIndex((p) => p.name === playerName);
      if (myBuzz !== -1) {
        setHasBuzzed(true);
        setMyPosition(myBuzz + 1);
      }
    };

    const handleRoundStarted = () => {
      setHasBuzzed(false);
      setMyPosition(null);
    };

    const handleRoundStopped = () => {
      socket.emit("getRoomState");
    };

    const handleRoundReset = () => {
      setHasBuzzed(false);
      setMyPosition(null);
      playSound("reset");
    };

    const handleBuzzerPressed = ({
      player,
      position,
    }: {
      player: { name: string };
      position: number;
    }) => {
      if (player.name === playerName) {
        setHasBuzzed(true);
        setMyPosition(position);
        setShowPressAnimation(true);

        // Play sound and trigger haptic feedback
        playSound(position === 1 ? "winner" : "buzz");
        if (navigator.vibrate) {
          navigator.vibrate(position === 1 ? [100, 50, 100] : [50]);
        }

        setTimeout(() => setShowPressAnimation(false), 100);
      }
    };

    const handleError = ({ message }: { message: string }) => {
      console.error("Socket error:", message);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("roomState", handleRoomState);
    socket.on("roundStarted", handleRoundStarted);
    socket.on("roundStopped", handleRoundStopped);
    socket.on("roundReset", handleRoundReset);
    socket.on("buzzerPressed", handleBuzzerPressed);
    socket.on("error", handleError);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      if (!hasJoined) {
        hasJoined = true;
        socket.emit("joinRoom", { roomCode, playerName });
      }
    } else {
      connectSocket();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("roomState", handleRoomState);
      socket.off("roundStarted", handleRoundStarted);
      socket.off("roundStopped", handleRoundStopped);
      socket.off("roundReset", handleRoundReset);
      socket.off("buzzerPressed", handleBuzzerPressed);
      socket.off("error", handleError);
      socket.off("disconnect", handleDisconnect);
    };
  }, [roomCode, playerName]);

  const handleBuzz = () => {
    handleFirstInteraction();
    if (hasBuzzed || !roomState?.isActive) return;

    const socket = getSocket();
    socket.emit("pressBuzzer");
  };

  const getBuzzerContent = () => {
    switch (buzzerState) {
      case "waiting":
        return {
          text: "WAIT",
          subtext: "Host will start the round",
        };
      case "ready":
        return {
          text: "BUZZ!",
          subtext: "TAP NOW!",
        };
      case "winner":
        return {
          text: "1ST!",
          subtext: "YOU WON!",
        };
      case "loser":
        return {
          text: `#${myPosition}`,
          subtext: "Nice try!",
        };
      default:
        return {
          text: "BUZZ!",
          subtext: "",
        };
    }
  };

  const getBuzzerClasses = () => {
    const base =
      "buzzer-button flex flex-col items-center justify-center select-none touch-manipulation";
    const size = "w-[70vmin] h-[70vmin] max-w-[320px] max-h-[320px]";

    switch (buzzerState) {
      case "waiting":
        return `${base} ${size} disabled bg-slate-600`;
      case "ready":
        return `${base} ${size} ready animate-pulse-glow`;
      case "winner":
        return `${base} ${size} winner ${showPressAnimation ? "" : "animate-winner"}`;
      case "loser":
        return `${base} ${size} buzzed`;
      default:
        return `${base} ${size}`;
    }
  };

  const content = getBuzzerContent();

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
    <div
      className="min-h-screen-safe flex flex-col bg-gradient-hero overflow-hidden"
      onTouchStart={handleFirstInteraction}
      onClick={handleFirstInteraction}
    >
      {/* Header - Minimal */}
      <header className="flex items-center justify-between p-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-neon-green" : "bg-red-500"
            }`}
          />
          <span className="text-white/60 text-sm font-medium">{roomCode}</span>
        </div>
        <span className="text-white font-semibold truncate max-w-[150px]">
          {playerName}
        </span>
      </header>

      {/* Main Buzzer Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Buzzer Button */}
        <button
          ref={buttonRef}
          onClick={handleBuzz}
          disabled={buzzerState === "waiting" || hasBuzzed}
          className={getBuzzerClasses()}
          aria-label={buzzerState === "ready" ? "Press to buzz" : content.text}
        >
          <span
            className={`font-black tracking-tight leading-none ${
              buzzerState === "winner"
                ? "text-6xl md:text-7xl"
                : buzzerState === "loser"
                  ? "text-5xl md:text-6xl"
                  : "text-5xl md:text-6xl"
            } text-white drop-shadow-lg`}
          >
            {content.text}
          </span>
          {content.subtext && (
            <span className="text-white/90 text-lg md:text-xl font-semibold mt-2">
              {content.subtext}
            </span>
          )}
        </button>

        {/* Status Message */}
        <div className="mt-8 h-8">
          {buzzerState === "ready" && (
            <p className="text-electric-orange font-bold text-lg animate-pulse">
              ROUND ACTIVE
            </p>
          )}
          {buzzerState === "waiting" && roomState && (
            <p className="text-white/60 text-sm">
              {roomState.players.length} player
              {roomState.players.length !== 1 ? "s" : ""} connected
            </p>
          )}
        </div>
      </main>

      {/* Footer - Position indicator */}
      {hasBuzzed && myPosition && (
        <footer className="p-4 animate-slide-in-up">
          <div className="bg-slate-surface/80 backdrop-blur rounded-2xl p-4 text-center">
            {myPosition === 1 ? (
              <div className="space-y-1">
                <p className="text-neon-green font-bold text-xl">
                  You were FIRST!
                </p>
                <p className="text-white/60 text-sm">
                  Waiting for next round...
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-hot-pink font-semibold text-lg">
                  Position #{myPosition}
                </p>
                <p className="text-white/60 text-sm">
                  Waiting for next round...
                </p>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
