// api/index.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let chatRooms = {};

function generateToken() {
  return Math.random().toString(36).substring(2, 14);
}

app.use(express.static('public'));

app.post('/api/create-token', (req, res) => {
  const token = generateToken();
  chatRooms[token] = { users: [] };
  res.json({ token });
});

app.post('/api/join-chat', (req, res) => {
  const { token } = req.body;

  if (chatRooms[token]) {
    if (chatRooms[token].users.length < 2) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Room is full' });
    }
  } else {
    res.json({ success: false, message: 'Invalid token' });
  }
});

io.on('connection', (socket) => {
  let currentToken = null;

  socket.on('joinRoom', (token) => {
    if (chatRooms[token]) {
      currentToken = token;
      chatRooms[token].users.push(socket.id);

      if (chatRooms[token].users.length === 2) {
        io.to(chatRooms[token].users[0]).emit('readyToChat');
        io.to(chatRooms[token].users[1]).emit('readyToChat');
      }
    } else {
      socket.emit('error', 'Invalid token');
    }
  });

  socket.on('sendMessage', (message) => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users.forEach((userId) => {
        if (userId !== socket.id) {
          io.to(userId).emit('receiveMessage', message);
        }
      });
    }
  });

  socket.on('typing', () => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users.forEach((userId) => {
        if (userId !== socket.id) {
          io.to(userId).emit('typing');
        }
      });
    }
  });

  socket.on('leaveChat', () => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users.forEach((userId) => {
        io.to(userId).emit('chatClosed');
        io.sockets.sockets.get(userId)?.disconnect();
      });
      delete chatRooms[currentToken];
    }
  });

  socket.on('disconnect', () => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users = chatRooms[currentToken].users.filter(
        (userId) => userId !== socket.id
      );

      if (chatRooms[currentToken].users.length === 0) {
        delete chatRooms[currentToken];
      }
    }
  });
});

module.exports = (req, res) => {
  server(req, res);
};
