const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let playerRole = null;
let draggedPiece = null;
let sourceSquare = null;

// Initialize the board
function renderBoard() {
    const board = chess.board();
    boardElement.innerHTML = "";
    
    board.forEach((row, rowIndex) => {
        row.forEach((square, colIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + colIndex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = colIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                
                // Only make pieces draggable if it's the player's turn and their piece
                const isPlayersTurn = chess.turn() === playerRole;
                const isPlayersColor = square.color === playerRole;
                pieceElement.draggable = isPlayersTurn && isPlayersColor;

                squareElement.appendChild(pieceElement);
            }

            // Add event listeners to squares (not pieces)
            squareElement.addEventListener("dragover", (e) => e.preventDefault());
            squareElement.addEventListener("drop", handleDrop);
            
            // Add dragstart to the square but check for piece
            squareElement.addEventListener("dragstart", (e) => {
                const pieceElement = e.target.closest('.piece');
                if (pieceElement && pieceElement.draggable) {
                    draggedPiece = pieceElement;
                    sourceSquare = {
                        row: rowIndex,
                        col: colIndex
                    };
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Flip board for black player
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

    updateStatus();
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedPiece) return;

    const targetSquare = e.target.closest('.square');
    if (!targetSquare) return;

    const targetRow = parseInt(targetSquare.dataset.row);
    const targetCol = parseInt(targetSquare.dataset.col);

    const move = {
        from: `${String.fromCharCode(97 + sourceSquare.col)}${8 - sourceSquare.row}`,
        to: `${String.fromCharCode(97 + targetCol)}${8 - targetRow}`,
        promotion: 'q' // Always promote to queen for simplicity
    };

    console.log("Attempting move:", move);
    socket.emit("move", move);

    draggedPiece = null;
    sourceSquare = null;
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    let status = '';
    if (chess.isCheckmate()) {
        status = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`;
    } else if (chess.isDraw()) {
        status = 'Game is a draw';
    } else {
        status = `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
        if (chess.isCheck()) {
            status += ' (CHECK)';
        }
    }

    statusElement.textContent = status;
}

// Socket event handlers
socket.on("playerRole", (role) => {
    console.log("Received role:", role);
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    console.log("Assigned as spectator");
    playerRole = null;
    renderBoard();
});

socket.on("moveMade", (data) => {
    console.log("Move made:", data);
    chess.load(data.fen);
    renderBoard();
});

socket.on("boardState", (fen) => {
    console.log("Received board state:", fen);
    chess.load(fen);
    renderBoard();
});

socket.on("invalidMove", (move) => {
    console.log("Invalid move:", move);
    renderBoard(); // Reset the board display
});

socket.on("error", (message) => {
    console.error("Error:", message);
    renderBoard();
});

socket.on("gameOver", (data) => {
    console.log("Game over:", data);
    alert(`Game Over! ${data.reason}${data.winner ? ` - ${data.winner} wins!` : ''}`);
});

socket.on("playerLeft", (color) => {
    console.log(`${color} player left the game`);
    alert(`${color} player has left the game`);
});

// Helper function to get Unicode chess pieces
function getPieceUnicode(piece) {
    const unicodePieces = {
        'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
        'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
    };
    return unicodePieces[piece.type.toUpperCase()] || '';
}

// Initial render
document.addEventListener("DOMContentLoaded", () => {
    renderBoard();
});