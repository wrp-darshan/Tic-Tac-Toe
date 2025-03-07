import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingPlayers = [];
let playingPairs = [];
const users = {};

const checkWinner = (board) => {
  const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (let combo of winningCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

io.on("connection", (socket) => {
  console.log(`Player Connected: ${socket.id}`);
  users[socket.id] = socket;

  socket.on("find", ({ name }) => {
    if (!name) return;

    waitingPlayers.push({ id: socket.id, name });

    if (waitingPlayers.length >= 2) {
      let player1 = waitingPlayers.shift();
      let player2 = waitingPlayers.shift();

      let gameSession = {
        gameId: `${player1.id}-${player2.id}`,
        turn: "X",
        board: Array(9).fill(""),
        winner: null,
        p1: { id: player1.id, name: player1.name, value: "X" },
        p2: { id: player2.id, name: player2.name, value: "O" },
      };

      playingPairs.push(gameSession);

      io.to(player1.id).emit("find", { gameSession });
      io.to(player2.id).emit("find", { gameSession });
    }
  });

  socket.on("playing", ({ gameId, index, playerId }) => {
    let game = playingPairs.find((g) => g.gameId === gameId);
    if (!game || game.board[index] || game.winner) return;

    let currentPlayer = game.turn === "X" ? game.p1 : game.p2;
    if (currentPlayer.id !== playerId) return;

    game.board[index] = game.turn;
    let winner = checkWinner(game.board);

    if (winner) {
      game.winner = winner;
      io.to(game.p1.id).emit("gameOver", { game, showExit: true });
      io.to(game.p2.id).emit("gameOver", { game, showExit: true });
    } else {
      game.turn = game.turn === "X" ? "O" : "X";
    }

    io.to(game.p1.id).emit("updateGame", game);
    io.to(game.p2.id).emit("updateGame", game);
  });

  socket.on("chatMessage", ({ gameId, playerName, message }) => {
    let game = playingPairs.find((g) => g.gameId === gameId);
    if (!game) return;

    let opponentId = socket.id === game.p1.id ? game.p2.id : game.p1.id;

    if (!users[opponentId] || !playingPairs.find((g) => g.gameId === gameId)) {
      io.to(socket.id).emit("chatMessage", { playerName: "System", message: "Opponent is not available" });
      return;
    }

    io.to(game.p1.id).emit("chatMessage", { playerName, message });
    io.to(game.p2.id).emit("chatMessage", { playerName, message });
  });


  socket.on("sendMessage", ({ name, message }) => {
    console.log(`${name}: ${message}`);
    io.emit("receiveMessage", { name, message });
  });


  socket.on("exitGame", ({ gameId, playerId }) => {
    playingPairs = playingPairs.filter((g) => g.gameId !== gameId);
    console.log(`Player ${playerId} left the game`);
  });

  socket.on("restartGame", ({ gameId }) => {
    let game = playingPairs.find((g) => g.gameId === gameId);
    if (!game) return;

    game.board = Array(9).fill("");
    game.turn = "X";
    game.winner = null;

    io.to(game.p1.id).emit("gameRestarted", { game, showExit: false });
    io.to(game.p2.id).emit("gameRestarted", { game, showExit: false });
  });

  socket.on("disconnect", () => {
    console.log(`Player Disconnected: ${socket.id}`);
    delete users[socket.id];
    waitingPlayers = waitingPlayers.filter((p) => p.id !== socket.id);
    playingPairs = playingPairs.filter((g) => g.p1.id !== socket.id && g.p2.id !== socket.id);
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));