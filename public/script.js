const socket = io();
let token;

// Auto-scroll chat to the bottom
function scrollToBottom() {
  const messages = document.getElementById('messages');
  messages.scrollTop = messages.scrollHeight;
}

function createToken() {
  fetch('/api/create-token', { method: 'POST' })
    .then((response) => response.json())
    .then((data) => {
      token = data.token;
      document.getElementById('generatedToken').innerText = `Your Token: ${token}`;
      document.getElementById('generatedToken').style.display = 'block';
      alert(`Your Token: ${token}`);
    });
}

function joinChat() {
  const inputToken = document.getElementById('token').value;

  fetch('/api/join-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: inputToken }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        token = inputToken;
        document.getElementById('join').style.display = 'none';
        document.getElementById('create').style.display = 'none';
        document.getElementById('chat').style.display = 'block';
        socket.emit('joinRoom', token);
      } else {
        alert(data.message || 'Failed to join chat');
      }
    });
}

socket.on('readyToChat', () => {
  alert('You are now connected with a partner!');
});

socket.on('receiveMessage', (message) => {
  const messageBox = document.getElementById('messages');
  const timestamp = new Date().toLocaleTimeString();
  messageBox.innerHTML += `<div><strong>Partner:</strong> ${message} <span style="font-size: 12px; color: #999;">(${timestamp})</span></div>`;
  scrollToBottom();
});

function sendMessage() {
  const message = document.getElementById('message').value;
  if (message) {
    socket.emit('sendMessage', message);
    const messageBox = document.getElementById('messages');
    const timestamp = new Date().toLocaleTimeString();
    messageBox.innerHTML += `<div><strong>You:</strong> ${message} <span style="font-size: 12px; color: #999;">(${timestamp})</span></div>`;
    document.getElementById('message').value = '';
    scrollToBottom();
  }
}

// Notify the other user when typing
function notifyTyping() {
  socket.emit('typing');
}

socket.on('typing', () => {
  const messageBox = document.getElementById('messages');
  messageBox.innerHTML += `<div id="typingNotice" style="color: #999;">Partner is typing...</div>`;
  setTimeout(() => {
    const notice = document.getElementById('typingNotice');
    if (notice) notice.remove();
  }, 1500);
});

// Emit typing event when typing
document.getElementById('message').addEventListener('input', notifyTyping);

function leaveChat() {
  socket.emit('leaveChat');
}

socket.on('chatClosed', () => {
  alert('Chat has been closed.');
  document.getElementById('chat').style.display = 'none';
  document.getElementById('join').style.display = 'block';
});
