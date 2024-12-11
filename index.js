const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// Configure CORS for Express
app.use(cors({
	origin: process.env.ALLOWED_ORIGINS?.split(",") || [
		"http://localhost:3000",
		"https://fps-lite.vercel.app"
	],
	methods: ["GET", "POST"],
	credentials: true
}));

const httpServer = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(httpServer, {
	cors: {
		origin: process.env.ALLOWED_ORIGINS?.split(",") || [
			"http://localhost:3000",
			"https://fps-lite.vercel.app"
		],
		methods: ["GET", "POST"],
		credentials: true,
		allowedHeaders: ["Content-Type", "Authorization"],
		transports: ['websocket', 'polling']
	},
	pingTimeout: 60000,
	pingInterval: 25000
});

const players = new Map();

io.on("connection", (socket) => {
	const playerId = socket.id;
	const playerColor = Math.random() * 0xffffff;

	// Add player to players map
	players.set(playerId, {
		id: playerId,
		color: playerColor,
		position: { x: 0, y: 1, z: 0 },
		rotation: { yaw: 0, pitch: 0 },
	});

	// Send initial player data
	socket.emit("playerInit", {
		playerId,
		players: Array.from(players.values()),
	});

	// Broadcast new player to others
	socket.broadcast.emit("playerJoined", {
		id: playerId,
		color: playerColor,
		position: { x: 0, y: 1, z: 0 },
		rotation: { yaw: 0, pitch: 0 },
	});

	socket.on("playerMove", ({ position, rotation }) => {
		const player = players.get(playerId);
		if (player) {
			player.position = position;
			player.rotation = rotation;
			socket.broadcast.emit("playerMoved", {
				playerId,
				position,
				rotation,
			});
		}
	});

	socket.on("playerShoot", ({ position, direction }) => {
		socket.broadcast.emit("bulletFired", {
			playerId,
			position,
			direction,
		});
	});

	socket.on("disconnect", () => {
		players.delete(playerId);
		io.emit("playerLeft", playerId);
	});
});

// Health check endpoint
app.get("/", (req, res) => {
	res.send("Server is running");
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});