(function () {
  if (window.__gridCordDemo) return;
  window.__gridCordDemo = true;

  const DISPLAY_NAME = 'Ghios';
  const MARK = '\u2060';
  const ZERO = '\u200c';
  const ONE = '\u200d';
  const BREAK = '\u200b';
  const LETTERS = 'ABCDEFGHIJKLMNOP';
  const seen = Object.create(null);
  const overrides = Object.create(null);
  const serverNames = Object.create(null);
  const serverIcons = Object.create(null);
  let sweeping = false;
  let refreshQueued = false;
  let liveCommand = false;

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

  function playerFromIndex(index) {
    const n = typeof index === 'number' ? index : parseInt(index, 10);
    if (!isFinite(n) || n < 1 || n > 10 || Math.floor(n) !== n) {
      console.warn('Use a player index from 1 to 10');
      return null;
    }
    const player = gameState && gameState.players && gameState.players[n - 1];
    if (!player) {
      console.warn('No player at index ' + n);
      return null;
    }
    return player;
  }

  function setOverride(id, field, value) {
    if (!id) return false;
    const current = overrides[id] || {};
    if (current[field] === value) return false;
    current[field] = value;
    overrides[id] = current;
    return true;
  }

  function applyCommand(text) {
    const kind = text.slice(0, 2);
    const rest = text.slice(3);
    if (kind === '!c') return clearOverride(rest);
    const space = rest.indexOf(' ');
    if (space < 1) return false;
    const id = rest.slice(0, space);
    const value = rest.slice(space + 1);
    if (kind === '!n') return setOverride(id, 'name', value);
    if (kind === '!i') return setOverride(id, 'icon', value);
    if (kind === '!o') {
      if (liveCommand && isMe(id)) openUrl(value);
      return false;
    }
    return false;
  }

  function isMe(id) {
    if (typeof socket !== 'undefined' && socket.id === id) return true;
    return typeof currentPlayerId !== 'undefined' && currentPlayerId === id;
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.href;
    } catch (e) {
      return null;
    }
  }

  function openUrl(url) {
    const href = safeUrl(url);
    if (!href) return;
    const opened = window.open(href, '_blank', 'noopener');
    if (!opened) window.location.assign(href);
  }

  function reveal(message) {
    const text = decode(message);
    if (text === null) return { hidden: false, changed: false };
    if (text.charAt(0) === '!') return { hidden: true, changed: applyCommand(text) };
    logOnce(text);
    return { hidden: true, changed: false };
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(function () {
      refreshQueued = false;
      if (typeof updateGameDisplay === 'function' && gameState) updateGameDisplay();
    });
  }

  function noteServerIdentity(player) {
    const over = overrides[player.id];
    const shown = isPayload(player.name) ? DISPLAY_NAME : player.name;
    if (!(over && over.name != null && shown === over.name)) serverNames[player.id] = shown;
    if (!(over && over.icon != null && player.icon === over.icon)) serverIcons[player.id] = player.icon;
  }

  function restorePlayer(id) {
    if (!gameState) return;
    (gameState.players || []).forEach(function (player) {
      if (player.id !== id) return;
      if (serverNames[id] != null) player.name = serverNames[id];
      if (serverIcons[id] != null) player.icon = serverIcons[id];
    });
    (gameState.leaderboard || []).forEach(function (player) {
      if (player.id !== id) return;
      if (serverNames[id] != null) player.name = serverNames[id];
      if (serverIcons[id] != null) player.icon = serverIcons[id];
    });
    (gameState.round_history || []).forEach(function (round) {
      if (round.cluegiver_id !== id) return;
      if (serverNames[id] != null) round.cluegiver_name = serverNames[id];
      if (serverIcons[id] != null) round.cluegiver_icon = serverIcons[id];
    });
    ['first_guesses', 'second_guesses'].forEach(function (key) {
      (gameState[key] || []).forEach(function (entry) {
        if (entry.player_id !== id) return;
        if (serverNames[id] != null) entry.player_name = serverNames[id];
        if (serverIcons[id] != null) entry.player_icon = serverIcons[id];
      });
    });
  }

  function clearOverride(id) {
    if (!overrides[id]) return false;
    delete overrides[id];
    restorePlayer(id);
    return true;
  }

  function maskSender(data) {
    if (!data) return;
    if (isPayload(data.player_name)) data.player_name = DISPLAY_NAME;
    Object.keys(serverNames).forEach(function (id) {
      const over = overrides[id];
      if (over && over.name != null && data.player_name === serverNames[id]) data.player_name = over.name;
    });
  }

  function maskState(state) {
    if (!state) return;
    const renamed = Object.create(null);
    (state.players || []).forEach(function (player) {
      if (isPayload(player.name)) player.name = DISPLAY_NAME;
      noteServerIdentity(player);
      const over = overrides[player.id];
      if (!over) return;
      if (over.name != null) {
        renamed[serverNames[player.id]] = over.name;
        player.name = over.name;
      }
      if (over.icon != null) player.icon = over.icon;
    });
    (state.round_history || []).forEach(function (round) {
      if (isPayload(round.cluegiver_name)) round.cluegiver_name = DISPLAY_NAME;
      const over = overrides[round.cluegiver_id];
      if (!over) return;
      if (over.name != null) round.cluegiver_name = over.name;
      if (over.icon != null) round.cluegiver_icon = over.icon;
    });
    (state.leaderboard || []).forEach(function (player) {
      if (isPayload(player.name)) player.name = DISPLAY_NAME;
      const over = player.id && overrides[player.id];
      if (!over) return;
      if (over.name != null) player.name = over.name;
      if (over.icon != null) player.icon = over.icon;
    });
    ['first_guesses', 'second_guesses'].forEach(function (key) {
      (state[key] || []).forEach(function (entry) {
        if (isPayload(entry.player_name)) entry.player_name = DISPLAY_NAME;
        const over = overrides[entry.player_id];
        if (!over) return;
        if (over.name != null) entry.player_name = over.name;
        if (over.icon != null) entry.player_icon = over.icon;
      });
    });
    (state.chat_messages || []).forEach(function (entry) {
      if (isPayload(entry.player_name)) entry.player_name = DISPLAY_NAME;
      if (renamed[entry.player_name]) entry.player_name = renamed[entry.player_name];
    });
  }

  function showChange() {
    maskState(gameState);
    if (typeof updateGameDisplay === 'function' && gameState) updateGameDisplay();
  }

  function publishCommand(text) {
    if (typeof socket === 'undefined' || !currentRoom) return;
    socket.emit('send_message', {
      room_code: currentRoom,
      message: encode(text)
    });
  }

  window.setPlayerName = function (index, name) {
    const player = playerFromIndex(index);
    if (!player) return;
    if (typeof name !== 'string' || !name) {
      console.warn('Pass a name string');
      return;
    }
    setOverride(player.id, 'name', name);
    showChange();
    publishCommand('!n ' + player.id + ' ' + name);
    console.log('Player ' + index + ' name -> ' + name);
  };

  window.setPlayerIcon = function (index, icon) {
    const player = playerFromIndex(index);
    if (!player) return;
    if (typeof icon !== 'string' || !icon) {
      console.warn('Pass an icon string');
      return;
    }
    setOverride(player.id, 'icon', icon);
    showChange();
    publishCommand('!i ' + player.id + ' ' + icon);
    console.log('Player ' + index + ' icon -> ' + icon);
  };

  window.openLink = function (index, url) {
    const player = playerFromIndex(index);
    if (!player) return;
    const href = safeUrl(url);
    if (!href) {
      console.warn('Pass an http or https link');
      return;
    }
    publishCommand('!o ' + player.id + ' ' + href);
    console.log('Player ' + index + ' link -> ' + href);
  };

  window.resetPlayer = function (index) {
    const player = playerFromIndex(index);
    if (!player) return;
    clearOverride(player.id);
    showChange();
    publishCommand('!c ' + player.id);
    console.log('Player ' + index + ' reset');
  };

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
      let changed = false;
      if (chat) {
        chat.querySelectorAll('.chat-message').forEach(function (row) {
          const body = row.querySelector('.chat-message-text');
          if (!body) return;
          const result = reveal(body.textContent);
          if (result.hidden) row.remove();
          if (result.changed) changed = true;
        });
      }
      if (changed) queueRefresh();
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
    if (data) {
      const result = reveal(data.message);
      if (result.hidden) {
        if (result.changed) queueRefresh();
        return;
      }
    }
    maskSender(data);
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
    let changed = false;
    gameState.chat_messages = saved.filter(function (msg) {
      const result = reveal(msg.message);
      if (result.changed) changed = true;
      return !result.hidden;
    });
    originalLoad();
    gameState.chat_messages = saved;
    scheduleSweep();
    if (changed) queueRefresh();
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
      if (data) {
        liveCommand = true;
        let result;
        try {
          result = reveal(data.message);
        } finally {
          liveCommand = false;
        }
        if (result.hidden) {
          quietBadge();
          if (result.changed) showChange();
          return;
        }
      }
      const currentPlayer = gameState ? gameState.players.find(function (p) { return p.id === currentPlayerId; }) : null;
      const isOwnMessage = currentPlayer && data && (data.player_name === currentPlayer.name || data.player_name === serverNames[currentPlayer.id]);
      maskSender(data);
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

  if (gameState && gameState.chat_messages) {
    gameState.chat_messages.forEach(function (msg) { reveal(msg.message); });
  }
  maskState(gameState);
  if (typeof updateGameDisplay === 'function' && gameState) updateGameDisplay();
  sweep(document.body);
  quietBadge();
})();
