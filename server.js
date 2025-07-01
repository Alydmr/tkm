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
    rooms[room][socket.id] = { choice: null };
  });

  socket.on("makeChoice", ({ room, choice }) => {
    if (!rooms[room]) return;
    rooms[room][socket.id].choice = choice;

    const players = Object.entries(rooms[room]);
    if (players.length < 2) return;

    const choices = players.map(([id, data]) => ({ id, choice: data.choice }));
    if (choices.every(p => p.choice)) {
      const [p1, p2] = choices;
      const result = decideWinner(p1.choice, p2.choice);

      io.to(room).emit("result", resultText(p1.choice, p2.choice, result));
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

function resultText(c1, c2, result) {
  if (result === "draw") return `Berabere! Her iki oyuncu da ${c1} seçti.`;
  return `Kazanan: ${result === "player1" ? "Oyuncu 1" : "Oyuncu 2"}! Seçimler: ${c1} - ${c2}`;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Sunucu çalışıyor: " + PORT);
});
