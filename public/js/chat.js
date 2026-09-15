// chat.js — shared by both manager-chat.html and employee-chat.html.
// Every other page in this app has its own dedicated JS file even when two
// role pages look similar (see manager-profile.js / employee-profile.js),
// but the chat behaviour here is genuinely identical for both roles — same
// events, same workplace room, same rendering — so one shared file is used
// instead of two copies that would only drift apart. The two HTML pages
// still differ in their sidebar/shell markup; this file only touches the
// bits that are the same either way (sidebar user info, logout, and the
// chat panel itself).

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rosterup_token');
  if (!token) {
    window.location.href = 'sign-in.html';
    return;
  }

  const userJson = localStorage.getItem('rosterup_user');
  const user = userJson ? JSON.parse(userJson) : null;
  if (user) {
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = `${user.first_name} ${user.last_name}`;
    if (avatarEl) {
      const initials = `${user.first_name[0] || ''}${user.last_name[0] || ''}`.toUpperCase();
      avatarEl.textContent = initials || '--';
    }
  }

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) logoutLink.addEventListener('click', handleLogout);

  initChat(token, user);
});

async function handleLogout(e) {
  e.preventDefault();
  const token = localStorage.getItem('rosterup_token');

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch (err) {
    console.error('Logout request failed (signing out locally anyway):', err);
  }

  localStorage.removeItem('rosterup_token');
  localStorage.removeItem('rosterup_user');
  window.location.href = 'sign-in.html';
}

function initChat(token, user) {
  const statusEl = document.getElementById('chatStatus');
  const activeTitleEl = document.getElementById('chatActiveTitle');
  const messagesEl = document.getElementById('chatMessages');
  const formEl = document.getElementById('chatForm');
  const inputEl = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const clearBtn = document.getElementById('chatClearBtn');
  const contactWorkplaceBtn = document.getElementById('chatContactWorkplace');
  const contactsListEl = document.getElementById('chatContactsList');
  const contactsEmptyEl = document.getElementById('chatContactsEmpty');

  // Which conversation is currently open. 'workplace' is the group chat
  // (always available as a tab); a DM conversation is identified by the
  // other person's user id. conversations caches messages per conversation
  // key so switching back and forth doesn't re-fetch or lose anything.
  let activeScope = 'workplace';
  let activeTargetId = null;
  const conversations = {
    workplace: { messages: [], loaded: false, unread: 0 },
  };

  setStatus('connecting', 'Connecting to chat…');
  setInputEnabled(false);

  // socket.io's server serves its own matching client script at this path
  // (no npm package/bundler needed on the frontend for a vanilla-JS page
  // like this one — same "no build step" approach as the rest of the app).
  const socket = io({ auth: { token }, reconnection: true });

  socket.on('connect', () => {
    setStatus('connecting', 'Connected — setting up your chat…');
  });

  socket.on('connect_error', (err) => {
    setStatus('error', err.message || 'Could not connect to chat.');
    setInputEnabled(false);

    // The socket-auth middleware rejects an invalid/expired token exactly
    // like the REST API's requireAuth does — treat it the same way (clear
    // the stale session, send them back to sign in) rather than retrying
    // forever with a token that will never become valid.
    if (err.message === 'Invalid or expired session.' || err.message === 'Authentication required.') {
      localStorage.removeItem('rosterup_token');
      localStorage.removeItem('rosterup_user');
      window.location.href = 'sign-in.html';
    }
  });

  socket.on('chat:error', (payload) => {
    setStatus('error', payload?.message || 'Chat is unavailable.');
    setInputEnabled(false);
  });

  socket.on('chat:ready', (payload) => {
    if (payload.workplaceChatAvailable) {
      setStatus('connected', 'Connected');
      setInputEnabled(true);
      // Don't clear the "no messages yet" placeholder here — chat:history
      // (sent right after chat:ready when a workplace is available) is
      // what decides whether there's actually anything to show.
    } else {
      // A manager with no workplace yet, or an employee whose join
      // request hasn't been approved yet — same "explain, don't just
      // hide" pattern used for the workplace-setup banner elsewhere.
      const reason = user && user.role === 'manager'
        ? 'Set up your workplace to start chatting with your team.'
        : 'Your workplace join request needs to be approved before you can use chat.';
      setStatus('error', reason);
      setInputEnabled(false);
    }
  });

  socket.on('chat:history', (messages) => {
    conversations.workplace.messages = Array.isArray(messages) ? messages : [];
    conversations.workplace.loaded = true;
    if (isActiveConversation('workplace')) {
      renderConversationMessages('workplace');
    }
  });

  // The list of people in this user's workplace they can start a direct
  // message with — a manager (for an employee) plus every approved
  // colleague, excluding themselves. Rebuilt whenever the socket
  // (re)connects, so a newly-approved colleague shows up on reload.
  socket.on('chat:contacts', (contacts) => {
    renderContacts(Array.isArray(contacts) ? contacts : []);
  });

  socket.on('chat:message', (message) => {
    const key = conversationKeyFor(message);
    if (!conversations[key]) conversations[key] = { messages: [], loaded: true, unread: 0 };
    conversations[key].messages.push(message);

    if (isActiveConversation(key)) {
      clearEmptyState();
      renderMessage(message, user);
    } else {
      // Not looking at this conversation right now — leave a marker on
      // its entry in the sidebar instead of interrupting whatever the
      // person is currently reading.
      conversations[key].unread = (conversations[key].unread || 0) + 1;
      updateContactBadge(key);
    }
  });

  // Broadcast to everyone in the room, including whoever clicked the
  // button — so this is the single place the view actually gets wiped,
  // rather than the click handler clearing it locally and hoping the
  // broadcast agrees. Only the group chat can be cleared (see the button
  // itself, hidden while a DM is open), so this only ever touches the
  // 'workplace' conversation, regardless of what's on screen right now.
  socket.on('chat:cleared', (payload) => {
    conversations.workplace.messages = [];
    conversations.workplace.unread = 0;
    updateContactBadge('workplace');

    if (isActiveConversation('workplace')) {
      messagesEl.innerHTML = '';
      showEmptyState('No messages yet — say hello to your team.');
    }

    const byName = payload?.by && String(payload.by.id) === String(user?.id)
      ? 'You'
      : (payload?.by ? `${payload.by.first_name} ${payload.by.last_name}` : 'Someone');
    setStatus('connected', `${byName} cleared the chat`);
    setTimeout(() => setStatus('connected', 'Connected'), 3000);
  });

  contactWorkplaceBtn.addEventListener('click', () => openConversation('workplace'));

  clearBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Clear the chat for everyone in your workplace? This can\'t be undone.');
    if (!confirmed) return;

    clearBtn.disabled = true;
    socket.emit('chat:clear', {}, (response) => {
      clearBtn.disabled = false;
      if (!response || !response.success) {
        setStatus('error', (response && response.error) || 'Could not clear the chat.');
        setTimeout(() => setStatus('connected', 'Connected'), 3000);
      }
      // On success, chat:cleared (above) does the actual clearing — for
      // everyone, sender included — once the server confirms it broadcast.
    });
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    const payload = activeScope === 'dm'
      ? { scope: 'dm', text, targetUserId: activeTargetId }
      : { scope: 'workplace', text };

    sendBtn.disabled = true;
    socket.emit('chat:send', payload, (response) => {
      sendBtn.disabled = false;
      if (response && response.success) {
        inputEl.value = '';
        inputEl.focus();
      } else {
        setStatus('error', (response && response.error) || 'Could not send that message.');
        setTimeout(() => setStatus('connected', 'Connected'), 3000);
      }
    });
  });

  // Switches which conversation is showing. Direct-message history isn't
  // pushed proactively like the workplace history is — it's fetched the
  // first time someone opens that thread, then cached for the rest of the
  // session (see `conversations`).
  async function openConversation(scope, targetId, targetName) {
    if (scope === activeScope && String(targetId || '') === String(activeTargetId || '')) return;

    activeScope = scope;
    activeTargetId = scope === 'dm' ? targetId : null;
    const key = scope === 'workplace' ? 'workplace' : String(targetId);

    updateActiveHighlight();
    clearBtn.classList.toggle('hidden', scope !== 'workplace');

    activeTitleEl.innerHTML = scope === 'workplace'
      ? '<span class="material-icons">groups</span> Team Chat'
      : `<span class="material-icons">person</span> ${escapeHtml(targetName || 'Direct message')}`;

    if (!conversations[key]) {
      conversations[key] = { messages: [], loaded: false, unread: 0 };
    }
    conversations[key].unread = 0;
    updateContactBadge(key);

    if (!conversations[key].loaded && scope === 'dm') {
      messagesEl.innerHTML = '<p class="chat-empty">Loading…</p>';
      const response = await requestDmHistory(targetId);
      if (response && response.success) {
        conversations[key].messages = response.messages || [];
      } else if (response) {
        setStatus('error', response.error || 'Could not load that conversation.');
        setTimeout(() => setStatus('connected', 'Connected'), 3000);
      }
      conversations[key].loaded = true;
    }

    // A second click can switch the active conversation again before the
    // await above resolves — only render if this is still what's open.
    if (isActiveConversation(key)) {
      renderConversationMessages(key);
    }
  }

  function requestDmHistory(targetId) {
    return new Promise((resolve) => {
      socket.emit('chat:dmHistory', { targetUserId: targetId }, (response) => resolve(response));
    });
  }

  function isActiveConversation(key) {
    return activeScope === 'workplace' ? key === 'workplace' : key === String(activeTargetId);
  }

  // A DM message's conversation key is always "the other person's id" —
  // whichever side of the pair is currently signed in, so the sender's own
  // copy of the message lands in the same cache slot as the copy the
  // recipient receives.
  function conversationKeyFor(message) {
    if (message.scope !== 'dm') return 'workplace';
    const otherId = String(message.from.id) === String(user?.id) ? message.targetUserId : message.from.id;
    return String(otherId);
  }

  function renderContacts(contacts) {
    contactsListEl.querySelectorAll('.chat-contact-item').forEach((item) => item.remove());
    contactsEmptyEl.classList.toggle('hidden', contacts.length > 0);

    contacts.forEach((contact) => {
      const name = `${contact.first_name} ${contact.last_name}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-contact-item';
      btn.dataset.contactId = String(contact.id);

      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = contact.role === 'manager' ? 'security' : 'person';

      const nameEl = document.createElement('span');
      nameEl.className = 'chat-contact-name';
      nameEl.textContent = name;

      btn.appendChild(icon);
      btn.appendChild(nameEl);
      btn.addEventListener('click', () => openConversation('dm', contact.id, name));

      contactsListEl.appendChild(btn);
    });

    updateActiveHighlight();
    updateContactBadge('workplace');
    Object.keys(conversations).forEach((key) => updateContactBadge(key));
  }

  function updateActiveHighlight() {
    const activeKey = activeScope === 'workplace' ? 'workplace' : String(activeTargetId);
    document.querySelectorAll('#chatContacts .chat-contact-item').forEach((item) => {
      item.classList.toggle('chat-contact-item--active', item.dataset.contactId === activeKey);
    });
  }

  function updateContactBadge(key) {
    const item = document.querySelector(`#chatContacts .chat-contact-item[data-contact-id="${key}"]`);
    if (!item) return;

    const unread = conversations[key] ? conversations[key].unread : 0;
    const existingBadge = item.querySelector('.chat-contact-badge');

    if (unread > 0 && !existingBadge) {
      const badge = document.createElement('span');
      badge.className = 'chat-contact-badge';
      item.appendChild(badge);
    } else if (unread === 0 && existingBadge) {
      existingBadge.remove();
    }
  }

  function renderConversationMessages(key) {
    messagesEl.innerHTML = '';
    const convo = conversations[key];
    const messages = convo ? convo.messages : [];

    if (!messages || messages.length === 0) {
      showEmptyState(key === 'workplace'
        ? 'No messages yet — say hello to your team.'
        : 'No messages yet — say hi!');
      return;
    }

    messages.forEach((message) => renderMessage(message, user));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(kind, text) {
    statusEl.className = `chat-status chat-status--${kind}`;
    const icon = kind === 'connected' ? 'check_circle' : kind === 'error' ? 'error_outline' : 'sync';
    statusEl.innerHTML = `<span class="material-icons">${icon}</span> ${escapeHtml(text)}`;
  }

  function setInputEnabled(enabled) {
    inputEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
    clearBtn.disabled = !enabled;
  }

  function clearEmptyState() {
    const empty = document.getElementById('chatEmptyState');
    if (empty) empty.remove();
  }

  function showEmptyState(message) {
    if (document.getElementById('chatEmptyState')) return;
    const empty = document.createElement('div');
    empty.id = 'chatEmptyState';
    empty.className = 'chat-empty';
    empty.innerHTML = `<span class="material-icons">forum</span><p>${escapeHtml(message || 'No messages yet.')}</p>`;
    messagesEl.appendChild(empty);
  }

  function renderMessage(message, currentUser) {
    const isOwn = currentUser && String(message.from.id) === String(currentUser.id);

    const row = document.createElement('div');
    row.className = `chat-bubble-row ${isOwn ? 'chat-bubble-row--own' : 'chat-bubble-row--other'}`;

    const meta = document.createElement('p');
    meta.className = 'chat-bubble-meta';
    const senderName = isOwn ? 'You' : `${message.from.first_name} ${message.from.last_name}`;
    meta.textContent = `${senderName} · ${formatTime(message.at)}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message.text;

    row.appendChild(meta);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatTime(isoString) {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return '';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
}
