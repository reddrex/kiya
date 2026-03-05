'use strict';

const engine = new AIMLEngine();
let busy = false;

document.addEventListener('DOMContentLoaded', async () => {
  const status  = document.getElementById('status');
  const input   = document.getElementById('input');
  const sendBtn = document.getElementById('send');
  const form    = document.getElementById('form');

  try {
    await engine.load(msg => { status.textContent = msg; });
    status.style.display = 'none';
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    // Opening greeting
    await showBotSegments([{ delay: 800, html: '¡Hola! Soy <strong>Kiya</strong>, tu asistente para el móvil. ¿En qué puedo ayudarte?' }]);
  } catch (e) {
    status.textContent = 'Error al cargar. Recarga la página.';
    console.error(e);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    appendMessage('user', text);
    const segments = engine.respond(text);
    await showBotSegments(segments);
  });
});

async function showBotSegments(segments) {
  const input   = document.getElementById('input');
  const sendBtn = document.getElementById('send');

  busy = true;
  input.disabled = true;
  sendBtn.disabled = true;

  for (const seg of segments) {
    const delay = Math.max(seg.delay ?? 0, 800); // always show typing indicator briefly
    const indicator = showTypingIndicator();
    await wait(delay);
    indicator.remove();
    if (seg.html && seg.html.trim()) {
      appendMessage('bot', seg.html);
    }
  }

  busy = false;
  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

function appendMessage(role, content) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  if (role === 'bot') {
    div.innerHTML = content;
  } else {
    div.textContent = content;
  }
  chat.appendChild(div);
  scrollToBottom();
}

function showTypingIndicator() {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = 'message bot typing-indicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  const chat = document.getElementById('chat');
  chat.scrollTop = chat.scrollHeight;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
