// Runs in each browser that loads it.
// When this player confirms a grid guess, or the cluegiver picks a target cell,
// the coordinate is sent in chat as invisible characters. This page does not
// draw that chat row or the unread badge. The text is printed with console.log.
(function () {
  if (window.__gridCordDemo) return;
  window.__gridCordDemo = true;

  const MARK = '\u2060';
  const ZERO = '\u200c';
  const ONE = '\u200d';
  const BREAK = '\u200b';
  const LETTERS = 'ABCDEFGHIJKLMNOP';

  function encode(text) {
    let out = MARK;
    for (let i = 0; i < text.length; i++) {
      const bits = text.charCodeAt(i).toString(2).padStart(16, '0');
      for (let b = 0; b < bits.length; b++) {
        out += bits[b] === '1' ? ONE : ZERO;
      }
      out += BREAK;
    }
    return out;
  }

  function decode(message) {
    if (typeof message !== 'string' || message.charAt(0) !== MARK) return null;
    let i = 1;
    let text = '';
    while (i < message.length) {
      let bits = '';
      for (let b = 0; b < 16; b++, i++) {
        const ch = message.charAt(i);
        if (ch === ONE) bits += '1';
        else if (ch === ZERO) bits += '0';
        else return null;
      }
      if (message.charAt(i) !== BREAK) return null;
      i++;
      text += String.fromCharCode(parseInt(bits, 2));
    }
    return text;
  }

  function publish(kind, position) {
    const text = kind + ' ' + position;
    console.log(text);
    if (typeof socket === 'undefined' || !currentRoom) return;
    socket.emit('send_message', {
      room_code: currentRoom,
      message: encode(text)
    });
  }

  function reveal(message) {
    const text = decode(message);
    if (text === null) return false;
    console.log(text);
    return true;
  }

  const originalAdd = addChatMessage;
  addChatMessage = function (data) {
    if (data && reveal(data.message)) return;
    return originalAdd(data);
  };

  const originalLoad = loadChatMessages;
  loadChatMessages = function () {
    if (!gameState || !gameState.chat_messages) {
      originalLoad();
      return;
    }
    const saved = gameState.chat_messages;
    const visible = [];
    saved.forEach(function (msg) {
      if (!reveal(msg.message)) visible.push(msg);
    });
    gameState.chat_messages = visible;
    originalLoad();
    gameState.chat_messages = saved;
  };

  if (typeof socket !== 'undefined' && socket.off) {
    socket.off('new_message');
    socket.on('new_message', function (data) {
      if (data && reveal(data.message)) return;
      addChatMessage(data);
      const currentPlayer = gameState ? gameState.players.find(function (p) { return p.id === currentPlayerId; }) : null;
      const isOwnMessage = currentPlayer && data.player_name === currentPlayer.name;
      if (!chatIsOpen && !isOwnMessage) {
        unreadMessageCount++;
        const badge = document.getElementById('chatNotificationBadge');
        if (!badge) return;
        badge.textContent = unreadMessageCount > 99 ? '99+' : unreadMessageCount;
        badge.style.display = 'flex';
      }
    });
  }

  const originalConfirm = confirmGuess;
  confirmGuess = function (row, col, guessType) {
    const position = LETTERS.charAt(row) + (col + 1);
    const kind = guessType === 'first' ? 'guess1' : 'guess2';
    publish(kind, position);
    return originalConfirm(row, col, guessType);
  };

  const originalSelect = selectColor;
  selectColor = function (colorIndex) {
    const option = gameState && gameState.color_options && gameState.color_options[colorIndex];
    if (option) {
      publish('target', LETTERS.charAt(option.row) + (option.col + 1));
    }
    return originalSelect(colorIndex);
  };
})();
