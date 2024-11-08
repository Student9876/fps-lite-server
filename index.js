// // backend/index.js
// const express = require("express");
// const app = express();
// const PORT = process.env.PORT || 5000;
// const http = require("http");
// const {Server} = require("socket.io");
// const server = http.createServer(app);
// const io = new Server(server);
// const cors = require("cors");
// app.use(cors());

// app.use(express.json());

// app.get("/api/game-data", (req, res) => {
// 	res.json({message: "Game data here"});
// });

// const players = {};

// // When a player connects

// server.listen(3001, () => {
// 	console.log("Server running on port 3001");
// });

// app.listen(PORT, () => {
// 	console.log(`Server is running on http://localhost:${PORT}`);
// });
// server.js
const express = require("express");
const {createServer} = require("http");
const {Server} = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
		methods: ["GET", "POST"],
	},
});

const players = new Map();

io.on("connection", (socket) => {
	const playerId = socket.id;
	const playerColor = Math.random() * 0xffffff;

	// Add player to players map
	players.set(playerId, {
		id: playerId,
		color: playerColor,
		position: {x: 0, y: 1, z: 0},
		rotation: {yaw: 0, pitch: 0},
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
		position: {x: 0, y: 1, z: 0},
		rotation: {yaw: 0, pitch: 0},
	});

	socket.on("playerMove", ({position, rotation}) => {
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

	socket.on("playerShoot", ({position, direction}) => {
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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
