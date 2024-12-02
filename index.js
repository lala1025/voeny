const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

// Хранилище для токенов и подключений
let chatRooms = {};

// Генерация уникального токена
function generateToken() {
  return Math.random().toString(36).substring(2, 14); // Генерация уникального 12-символьного токена
}

// Настройка статических файлов и парсера JSON
app.use(express.static('public'));
app.use(bodyParser.json());

// Маршрут для создания токена
app.post('/api/create-token', (req, res) => {
  const token = generateToken();
  chatRooms[token] = { users: [] }; // Создаем новую комнату
  console.log(`Chat room created with token: ${token}`);
  res.json({ token });
});

// Маршрут для подключения к комнате
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

// Подключение через Socket.io
io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  let currentToken = null;

  // Регистрация пользователя в комнате
  socket.on('joinRoom', (token) => {
    if (chatRooms[token]) {
      currentToken = token;
      chatRooms[token].users.push(socket.id);

      // Уведомляем пользователей, что они готовы к общению
      if (chatRooms[token].users.length === 2) {
        io.to(chatRooms[token].users[0]).emit('readyToChat');
        io.to(chatRooms[token].users[1]).emit('readyToChat');
      }
    } else {
      socket.emit('error', 'Invalid token');
    }
  });

  // Отправка сообщения
  socket.on('sendMessage', (message) => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users.forEach((userId) => {
        if (userId !== socket.id) {
          io.to(userId).emit('receiveMessage', message);
        }
      });
    }
  });

  // Покидание комнаты и удаление чата
  socket.on('leaveChat', () => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users.forEach((userId) => {
        io.to(userId).emit('chatClosed');
        io.sockets.sockets.get(userId)?.disconnect();
      });
      delete chatRooms[currentToken]; // Удаляем комнату
      console.log(`Chat room with token ${currentToken} deleted`);
    }
  });

  // Удаление пользователя из комнаты при отключении
  socket.on('disconnect', () => {
    if (currentToken && chatRooms[currentToken]) {
      chatRooms[currentToken].users = chatRooms[currentToken].users.filter(
        (userId) => userId !== socket.id
      );

      // Если все пользователи покинули комнату, удаляем ее
      if (chatRooms[currentToken].users.length === 0) {
        delete chatRooms[currentToken];
        console.log(`Chat room with token ${currentToken} deleted`);
      }
    }
  });
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
