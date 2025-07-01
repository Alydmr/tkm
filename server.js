const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

const rooms = {};

io.on("connection", socket => {
  socket.on("joinRoom", room => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = {};
    rooms[room][socket.id] = { choice: null, username: null };
  });

  socket.on("makeChoice", ({ room, choice, username }) => {
    if (!rooms[room]) return;
    rooms[room][socket.id].choice = choice;
    rooms[room][socket.id].username = username;

    const players = Object.entries(rooms[room]);
    if (players.length < 2) return;

    const [p1, p2] = players;
    const p1Data = p1[1];
    const p2Data = p2[1];

    if (p1Data.choice && p2Data.choice) {
      const result = decideWinner(p1Data.choice, p2Data.choice);

      const winnerName =
        result === "draw" ? "draw" :
        result === "player1" ? p1Data.username : p2Data.username;

      const text = resultText(p1Data.choice, p2Data.choice, result, p1Data.username, p2Data.username);

      io.to(room).emit("result", { text, winner: winnerName });

      delete rooms[room];
    }
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      if (rooms[room][socket.id]) {
        delete rooms[room][socket.id];
        if (Object.keys(rooms[room]).length === 0) delete rooms[room];
      }
    }
  });
});

function decideWinner(c1, c2) {
  if (c1 === c2) return "draw";
  if (
    (c1 === "Taş" && c2 === "Makas") ||
    (c1 === "Kağıt" && c2 === "Taş") ||
    (c1 === "Makas" && c2 === "Kağıt")
  ) return "player1";
  return "player2";
}

function resultText(c1, c2, result, p1Name, p2Name) {
  if (result === "draw") return `Berabere! Her iki oyuncu da ${c1} seçti.`;
  const winner = result === "player1" ? p1Name : p2Name;
  const loser = result === "player1" ? p2Name : p1Name;
  return `Kazanan: ${winner}! 🎉\n(${p1Name}: ${c1} - ${p2Name}: ${c2})`;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Sunucu çalışıyor: " + PORT);
});
