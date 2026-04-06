const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Syncpad Backend is running!');
});

const rooms = {}; // Store room data
const roomCode = {}; // Store code for each room
const roomProfiles = {}; // Store profiles for each room
const roomCursors = {}; // Store cursor positions for each room

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining a room
  socket.on("joinRoom", (data) => {
    try {
      if (!data || typeof data !== "object" || !data.roomId || !data.name) {
        console.error("Invalid joinRoom payload:", data);
        return;
      }

      const { roomId, name } = data;
      console.log(`${name} attempting to join room ${roomId}`);

      if (!rooms[roomId]) {
        rooms[roomId] = [];
        roomCode[roomId] = ""; // Initialize room code as empty
        roomProfiles[roomId] = {}; // Initialize profiles for the room
        console.log(`Created new room: ${roomId}`);
      }

      // Join the socket.io room
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      // Check if the user is already in the room
      const isUserInRoom = rooms[roomId].some((user) => user.name === name);
      if (!isUserInRoom) {
        const peopleId = (rooms[roomId].length % 4) + 1;
        const newUser = { id: socket.id, name, peopleId };

        rooms[roomId].push(newUser);
        roomProfiles[roomId][socket.id] = { name, peopleId };

        // Send updates to all clients in the room
        io.to(roomId).emit("updateRoom", rooms[roomId]);
        io.to(roomId).emit("updateProfiles", roomProfiles[roomId]);

        // Send current code to the new user
        socket.emit("codeUpdate", roomCode[roomId]);
        console.log(`${name} successfully joined room ${roomId}`);
      } else {
        socket.emit("updateRoom", rooms[roomId]);
        socket.emit("updateProfiles", roomProfiles[roomId]);
        socket.emit("codeUpdate", roomCode[roomId]);
        console.log(`${name} rejoined room ${roomId}`);
      }
    } catch (error) {
      console.error("Error in joinRoom:", error);
    }
  });

  // Handle code changes
  socket.on("codeChange", ({ roomId, code }) => {
    try {
      if (roomCode[roomId] !== undefined) {
        console.log(`Code updated in room ${roomId}`);
        roomCode[roomId] = code;
        socket.to(roomId).emit("codeUpdate", code);
      } else {
        console.error(`Room ${roomId} not found for code change`);
      }
    } catch (error) {
      console.error("Error in codeChange:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    try {
      for (const roomId in rooms) {
        const userIndex = rooms[roomId].findIndex((user) => user.id === socket.id);
        if (userIndex !== -1) {
          const user = rooms[roomId][userIndex];
          console.log(`${user.name} disconnected from room ${roomId}`);
          rooms[roomId].splice(userIndex, 1);
          delete roomProfiles[roomId][socket.id];
          delete roomCursors[roomId]?.[socket.id];

          io.to(roomId).emit("updateRoom", rooms[roomId]);
          io.to(roomId).emit("updateProfiles", roomProfiles[roomId]);
          io.to(roomId).emit("cursorRemoved", socket.id);
        }
      }
    } catch (error) {
      console.error("Error in disconnect:", error);
    }
    console.log("A user disconnected:", socket.id);
  });

   // Handle user typing
  socket.on("userTyping", ({ roomId, name }) => {
    try {
      if (!roomId || !name) {
        console.error("Invalid userTyping payload:", { roomId, name });
        return;
      }
      console.log(`${name} is typing in room ${roomId}`);
      socket.to(roomId).emit("userTyping", { name });
    } catch (error) {
      console.error("Error in userTyping:", error);
    }
  });

  // Handle user stopped typing
  socket.on("userStoppedTyping", ({ roomId, name }) => {
    try {
      if (!roomId || !name) {
        console.error("Invalid userStoppedTyping payload:", { roomId, name });
        return;
      }
      console.log(`${name} stopped typing in room ${roomId}`);
      socket.to(roomId).emit("userStoppedTyping", { name });
    } catch (error) {
      console.error("Error in userStoppedTyping:", error);
    }
  });

  // Handle cursor position changes
  socket.on("cursorChange", ({ roomId, name, line, column }) => {
    try {
      if (!roomId || !name || line === undefined || column === undefined) {
        console.error("❌ Invalid cursorChange payload:", { roomId, name, line, column });
        return;
      }

      // Store cursor position for this specific user
      if (!roomCursors[roomId]) {
        roomCursors[roomId] = {};
      }

      const cursorData = { name, line, column };
      roomCursors[roomId][socket.id] = cursorData;

      console.log(`📍 Cursor update from ${name} in room ${roomId}:`, cursorData);

      // Broadcast to ALL users in the room INCLUDING the sender (they filtered it on client)
      io.to(roomId).emit("cursorUpdate", {
        userId: socket.id,
        name,
        line,
        column
      });
    } catch (error) {
      console.error("Error in cursorChange:", error);
    }
  });

  // Send current cursors to new user
  socket.on("requestCursors", ({ roomId }) => {
    try {
      const cursors = roomCursors[roomId] || {};
      const cursorsArray = Object.entries(cursors)
        .filter(([userId]) => userId !== socket.id)
        .map(([userId, data]) => ({
          userId,
          ...data
        }));
      socket.emit("cursorSync", cursorsArray);
    } catch (error) {
      console.error("Error in requestCursors:", error);
    }
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});