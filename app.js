const express = require("express");
const socket = require("socket.io");
const http = require("http");
const {Chess} = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();

let players = {
    white: null,
    black: null
};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", {title: "Chess"});
});

io.on("connection", function(socket) {
    console.log("Client connected:", socket.id);

    // Send current board state to new connections
    socket.emit("boardState", chess.fen());

    // Assign roles
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
        console.log("White player assigned:", socket.id);
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
        console.log("Black player assigned:", socket.id);
    } else {
        socket.emit("spectatorRole");
        console.log("Spectator assigned:", socket.id);
    }

    // Handle disconnection
    socket.on("disconnect", function() {
        console.log("Client disconnected:", socket.id);
        if (socket.id === players.white) {
            players.white = null;
            io.emit("playerLeft", "white");
        } else if (socket.id === players.black) {
            players.black = null;
            io.emit("playerLeft", "black");
        }
    });

    // Handle moves
    socket.on("move", (move) => {
        console.log("Move received:", move, "from player:", socket.id);
        
        try {
            // Verify it's the correct player's turn
            if (chess.turn() === "w" && socket.id !== players.white) {
                socket.emit("error", "Not white player's turn");
                return;
            }
            if (chess.turn() === "b" && socket.id !== players.black) {
                socket.emit("error", "Not black player's turn");
                return;
            }

            // Attempt the move
            const result = chess.move(move);
            
            if (result) {
                console.log("Valid move, broadcasting to all clients");
                // Broadcast the move to all clients
                io.emit("moveMade", {
                    move: move,
                    fen: chess.fen(),
                    turn: chess.turn()
                });
                
                // Check for game end conditions
                if (chess.isGameOver()) {
                    let gameOverReason = "";
                    if (chess.isCheckmate()) gameOverReason = "checkmate";
                    else if (chess.isDraw()) gameOverReason = "draw";
                    else if (chess.isStalemate()) gameOverReason = "stalemate";
                    
                    io.emit("gameOver", {
                        reason: gameOverReason,
                        winner: chess.turn() === 'w' ? 'black' : 'white'
                    });
                }
            } else {
                console.log("Invalid move attempted:", move);
                socket.emit("invalidMove", move);
            }
        } catch (err) {
            console.error("Error processing move:", err);
            socket.emit("error", "Invalid move");
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});