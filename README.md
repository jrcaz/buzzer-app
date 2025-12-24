# Buzzer App

A real-time multiplayer buzzer app where contestants race to tap a button first, managed by a host. Perfect for game shows, trivia nights, and competitive events.

## Tech Stack

- **Next.js 16** with App Router and React 19
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** for modern UI components
- **Socket.io** for real-time WebSocket communication
- **Turbopack** for fast development builds

## Features

- **Host Mode**: Create rooms with 6-digit codes and QR codes
- **Contestant Mode**: Join via code or QR scan
- **Real-time Buzzing**: WebSocket-powered instant responses
- **Leaderboard**: Track scores across multiple rounds
- **Mobile-First**: Optimized for phones and tablets

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server with Socket.io:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

### Production

Build and start the production server:

```bash
npm run build
npm start
```

## Project Structure

```
/
  server.ts              # Custom server with Socket.io
  /src
    /app                 # Next.js App Router pages
    /components          # React components + shadcn/ui
    /lib                 # Utilities and Socket.io client
    /types               # TypeScript type definitions
```

## How It Works

1. **Host** creates a room and shares the code/QR with contestants
2. **Contestants** join the room using their phones
3. **Host** activates the buzzer when ready
4. **First contestant** to tap wins that round
5. **Host** can reset for the next question

## Socket.io Events

- `create-room` - Host creates a new game room
- `join-room` - Contestant joins with code and name
- `activate-buzzer` - Host enables buzzing
- `buzz` - Contestant presses the buzzer
- `buzzer-result` - Server announces the winner
- `reset-buzzer` - Host resets for next round

## Development Notes

This project uses Next.js 16 with a custom server to integrate Socket.io for real-time communication. The app leverages:

- **Turbopack** (default in Next.js 16) for faster builds
- **React 19** features and Server Components
- **shadcn/ui** for accessible, customizable components
- **In-memory storage** for ephemeral game sessions

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Socket.io Documentation](https://socket.io/docs/)
- [shadcn/ui](https://ui.shadcn.com/)
