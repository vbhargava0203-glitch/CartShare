/**
 * CartShare — storage.js
 * ------------------------------------------------------------
 * Data layer for the app. Everything lives in localStorage so a
 * "Room" is shared by every browser tab on this machine — that's
 * what makes multi-tab collaboration possible without a backend.
 *
 * Identity (who *this tab* is) lives in sessionStorage instead,
 * since sessionStorage is per-tab. That's what lets two tabs act
 * as two different roommates inside the same room.
 * ------------------------------------------------------------
 */
const CartShare = (() => {
  const ROOM_PREFIX = "cartshare_room_";
  const IDENTITY_KEY = "cartshare_identity";
  const FREE_SHIP_THRESHOLD = 75;
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const AVATAR_COLORS = ["#2F6B4F", "#C1483C", "#3B6EA5", "#B5651D", "#8A4FA3", "#1E7A73"];

  function roomKey(code) {
    return ROOM_PREFIX + String(code).toUpperCase().trim();
  }

  function shortId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function generateRoomCode() {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  }

  function roomExists(code) {
    return code ? localStorage.getItem(roomKey(code)) !== null : false;
  }

  function getRoom(code) {
    const raw = localStorage.getItem(roomKey(code));
    return raw ? JSON.parse(raw) : null;
  }

  function saveRoom(room) {
    room.updatedAt = Date.now();
    localStorage.setItem(roomKey(room.code), JSON.stringify(room));
  }

  function logActivity(room, type, message, user) {
    room.activity.unshift({
      id: shortId(),
      type,
      message,
      user: user || null,
      timestamp: Date.now(),
    });
    room.activity = room.activity.slice(0, 60);
  }

  function createRoom(hostName) {
    let code;
    do {
      code = generateRoomCode();
    } while (roomExists(code));

    const room = {
      code,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      activity: [],
      participants: [],
    };
    saveRoom(room);
    return joinRoom(code, hostName);
  }

  function joinRoom(code, name) {
    const room = getRoom(code);
    if (!room) return null;

    const cleanName = String(name).trim();
    const already = room.participants.some(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!already) {
      room.participants.push({
        name: cleanName,
        color: colorForName(cleanName),
        joinedAt: Date.now(),
      });
      logActivity(room, "join", `${cleanName} joined the room`, cleanName);
      saveRoom(room);
    }
    return room;
  }

  function leaveRoom(code, name) {
    const room = getRoom(code);
    if (!room) return null;
    room.participants = room.participants.filter(
      (p) => p.name.toLowerCase() !== String(name).toLowerCase()
    );
    logActivity(room, "leave", `${name} left the room`, name);
    saveRoom(room);
    return room;
  }

  function addItem(code, { name, qty, price }, user) {
    const room = getRoom(code);
    if (!room) return null;
    const item = {
      id: shortId(),
      name: String(name).trim(),
      qty: Math.max(1, Number(qty) || 1),
      price: Math.max(0, Number(price) || 0),
      addedBy: user,
      addedAt: Date.now(),
    };
    room.items.push(item);
    logActivity(
      room,
      "add",
      `${user} added ${item.qty} × ${item.name}`,
      user
    );
    saveRoom(room);
    return room;
  }

  function removeItem(code, itemId, user) {
    const room = getRoom(code);
    if (!room) return null;
    const idx = room.items.findIndex((i) => i.id === itemId);
    if (idx > -1) {
      const [removed] = room.items.splice(idx, 1);
      logActivity(room, "remove", `${user} removed ${removed.name}`, user);
      saveRoom(room);
    }
    return room;
  }

  function subtotal(room) {
    return room.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  function splitEqually(room) {
    const count = room.participants.length || 1;
    return subtotal(room) / count;
  }

  function contributionByPerson(room) {
    const map = {};
    room.participants.forEach((p) => (map[p.name] = 0));
    room.items.forEach((i) => {
      map[i.addedBy] = (map[i.addedBy] || 0) + i.qty * i.price;
    });
    return map;
  }

  // ---- identity (per browser tab) ----
  function setIdentity(identity) {
    sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  }
  function getIdentity() {
    const raw = sessionStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function clearIdentity() {
    sessionStorage.removeItem(IDENTITY_KEY);
  }

  function fmt(n) {
    return "$" + Number(n).toFixed(2);
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const s = Math.floor(diff / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  return {
    FREE_SHIP_THRESHOLD,
    ROOM_PREFIX,
    roomKey,
    roomExists,
    createRoom,
    getRoom,
    saveRoom,
    joinRoom,
    leaveRoom,
    addItem,
    removeItem,
    subtotal,
    splitEqually,
    contributionByPerson,
    setIdentity,
    getIdentity,
    clearIdentity,
    colorForName,
    fmt,
    timeAgo,
  };
})();
