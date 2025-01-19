const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

let lobbies = {}; // Stores active lobbies and players

app.use(cors());
app.use(express.json());

// Create a lobby
app.post("/create-lobby", (req, res) => {
    const lobbyId = Math.random().toString(36).substring(2, 8); // Generate a short random ID
    lobbies[lobbyId] = { players: [], host: null };
    res.json({ lobbyId });
});

// WebSocket logic
io.on("connection", (socket) => {
    console.log("A player connected:", socket.id);

    socket.on("join-lobby", ({ lobbyId, playerName }) => {
        if (!lobbies[lobbyId]) {
            socket.emit("error", { message: "Lobby does not exist" });
            return;
        }

        lobbies[lobbyId].players.push({ id: socket.id, name: playerName });
        if (!lobbies[lobbyId].host) {
            lobbies[lobbyId].host = socket.id; // First player becomes host
        }

        socket.join(lobbyId);
        io.to(lobbyId).emit("update-lobby", lobbies[lobbyId]); // Send updated lobby info
    });

    socket.on("start-game", (lobbyId) => {
        if (lobbies[lobbyId] && lobbies[lobbyId].host === socket.id) {
            io.to(lobbyId).emit("game-started", { message: "Game is starting!" });
        }
    });

    socket.on("disconnect", () => {
        console.log("A player disconnected:", socket.id);
        for (let lobbyId in lobbies) {
            lobbies[lobbyId].players = lobbies[lobbyId].players.filter(p => p.id !== socket.id);
            if (lobbies[lobbyId].players.length === 0) {
                delete lobbies[lobbyId]; // Remove empty lobby
            }
        }
        io.emit("update-lobbies", lobbies);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
