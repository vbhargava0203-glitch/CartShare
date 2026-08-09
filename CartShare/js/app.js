/**
 * CartShare — app.js
 * Drives room.html: renders the shared cart, activity log and
 * participants, wires up the add/remove/print actions, and keeps
 * every open tab in sync by listening for the "storage" event that
 * fires whenever another tab writes to this room's localStorage key.
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get("code") || "").toUpperCase();
  const identity = CartShare.getIdentity();

  // ---- guard: must have a name + be in this exact room ----
  if (!code || !CartShare.roomExists(code)) {
    window.location.href = "index.html";
    return;
  }
  if (!identity || !identity.name || identity.roomCode !== code) {
    window.location.href = `index.html?code=${code}`;
    return;
  }

  const me = identity.name;

  // make sure we're registered as a participant (idempotent — safe on reload)
  CartShare.joinRoom(code, me);

  // ---- element refs ----
  const el = {
    roomCodeDisplay: document.getElementById("room-code-display"),
    copyCodeBtn: document.getElementById("copy-code-btn"),
    meAvatar: document.getElementById("me-avatar"),
    meName: document.getElementById("me-name"),
    leaveBtn: document.getElementById("leave-room-btn"),

    addItemForm: document.getElementById("add-item-form"),
    itemName: document.getElementById("item-name"),
    itemQty: document.getElementById("item-qty"),
    itemPrice: document.getElementById("item-price"),
    addItemError: document.getElementById("add-item-error"),

    thresholdCurrent: document.getElementById("threshold-current"),
    thresholdFill: document.getElementById("threshold-fill"),
    thresholdMsg: document.getElementById("threshold-msg"),

    cartList: document.getElementById("cart-list"),
    cartEmpty: document.getElementById("cart-empty"),
    cartCount: document.getElementById("cart-count"),
    cartSubtotal: document.getElementById("cart-subtotal"),

    participantsList: document.getElementById("participants-list"),
    participantsCount: document.getElementById("participants-count"),

    activityList: document.getElementById("activity-list"),

    printBtn: document.getElementById("print-receipt-btn"),
    toast: document.getElementById("toast"),
  };

  el.roomCodeDisplay.textContent = code;
  el.meName.textContent = me;
  el.meAvatar.textContent = initials(me);
  el.meAvatar.style.background = CartShare.colorForName(me);

  function initials(name) {
    return name.trim().slice(0, 2).toUpperCase();
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  // ---- render ----
  function render() {
    const room = CartShare.getRoom(code);
    if (!room) {
      window.location.href = "index.html";
      return;
    }

    renderCart(room);
    renderThreshold(room);
    renderParticipants(room);
    renderActivity(room);
  }

  function renderCart(room) {
    el.cartList.innerHTML = "";
    el.cartCount.textContent = `${room.items.length} item${room.items.length === 1 ? "" : "s"}`;
    el.cartEmpty.hidden = room.items.length > 0;

    room.items
      .slice()
      .sort((a, b) => b.addedAt - a.addedAt)
      .forEach((item) => {
        const li = document.createElement("li");
        li.className = "cart-row";
        li.innerHTML = `
          <span class="initials" style="background:${CartShare.colorForName(item.addedBy)}">${initials(item.addedBy)}</span>
          <span class="item-name">
            <span class="name">${escapeHtml(item.name)}</span>
            <span class="meta">added by ${escapeHtml(item.addedBy)} · ${CartShare.timeAgo(item.addedAt)}</span>
          </span>
          <span class="qty">×${item.qty}</span>
          <span class="line-total">${CartShare.fmt(item.qty * item.price)}</span>
          <button class="btn btn-danger" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">✕</button>
        `;
        el.cartList.appendChild(li);
      });

    el.cartSubtotal.textContent = CartShare.fmt(CartShare.subtotal(room));
  }

  function renderThreshold(room) {
    const sub = CartShare.subtotal(room);
    const pct = Math.min(100, (sub / CartShare.FREE_SHIP_THRESHOLD) * 100);
    el.thresholdCurrent.textContent = `${CartShare.fmt(sub)} of ${CartShare.fmt(CartShare.FREE_SHIP_THRESHOLD)}`;
    el.thresholdFill.style.width = pct + "%";

    if (sub >= CartShare.FREE_SHIP_THRESHOLD) {
      el.thresholdFill.classList.add("met");
      el.thresholdMsg.classList.add("met");
      el.thresholdMsg.textContent = "🎉 Free delivery unlocked!";
    } else {
      el.thresholdFill.classList.remove("met");
      el.thresholdMsg.classList.remove("met");
      const remaining = CartShare.FREE_SHIP_THRESHOLD - sub;
      el.thresholdMsg.textContent = `Add ${CartShare.fmt(remaining)} more to unlock free delivery.`;
    }
  }

  function renderParticipants(room) {
    el.participantsList.innerHTML = "";
    el.participantsCount.textContent = room.participants.length;

    room.participants.forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="avatar-dot" style="background:${p.color}">${initials(p.name)}</span>
        <span>${escapeHtml(p.name)}</span>
        ${p.name === me ? '<span class="you-tag">YOU</span>' : ""}
      `;
      el.participantsList.appendChild(li);
    });
  }

  function renderActivity(room) {
    el.activityList.innerHTML = "";
    room.activity.forEach((a) => {
      const li = document.createElement("li");
      li.className = `activity-item ${a.type}`;
      li.innerHTML = `
        <span class="rail"></span>
        <span>
          <span class="msg">${escapeHtml(a.message)}</span>
          <span class="time">${CartShare.timeAgo(a.timestamp)}</span>
        </span>
      `;
      el.activityList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---- actions ----
  el.addItemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    el.addItemError.textContent = "";

    const name = el.itemName.value.trim();
    const qty = Number(el.itemQty.value);
    const price = Number(el.itemPrice.value);

    if (!name) {
      el.addItemError.textContent = "Give the item a name.";
      el.itemName.focus();
      return;
    }
    if (!qty || qty < 1) {
      el.addItemError.textContent = "Quantity must be at least 1.";
      el.itemQty.focus();
      return;
    }
    if (price < 0 || Number.isNaN(price)) {
      el.addItemError.textContent = "Enter a valid price.";
      el.itemPrice.focus();
      return;
    }

    CartShare.addItem(code, { name, qty, price }, me);
    el.addItemForm.reset();
    el.itemQty.value = 1;
    el.itemName.focus();
    render();
  });

  el.cartList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    CartShare.removeItem(code, btn.getAttribute("data-remove"), me);
    render();
  });

  el.copyCodeBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast("Room code copied");
    } catch {
      showToast(`Room code: ${code}`);
    }
  });

  el.leaveBtn.addEventListener("click", () => {
    CartShare.leaveRoom(code, me);
    CartShare.clearIdentity();
    window.location.href = "index.html";
  });

  // ---- cross-tab live sync ----
  // Fires in every OTHER tab on this origin when localStorage changes here.
  window.addEventListener("storage", (e) => {
    if (e.key === CartShare.roomKey(code)) {
      render();
    }
  });

  // ---- receipt ----
  el.printBtn.addEventListener("click", () => {
    const room = CartShare.getRoom(code);
    buildReceipt(room);
    window.print();
  });

  function buildReceipt(room) {
    document.getElementById("r-code").textContent = room.code;
    document.getElementById("r-datetime").textContent = new Date().toLocaleString();

    const itemsEl = document.getElementById("r-items");
    itemsEl.innerHTML = "";
    room.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "receipt-row";
      row.innerHTML = `
        <span class="r-name">${escapeHtml(item.qty + "× " + item.name)}</span>
        <span>${CartShare.fmt(item.qty * item.price)}</span>
      `;
      itemsEl.appendChild(row);
    });
    if (room.items.length === 0) {
      itemsEl.innerHTML = '<div class="receipt-row"><span>No items added.</span></div>';
    }

    const sub = CartShare.subtotal(room);
    document.getElementById("r-subtotal").textContent = CartShare.fmt(sub);

    const statusEl = document.getElementById("r-status");
    if (sub >= CartShare.FREE_SHIP_THRESHOLD) {
      statusEl.textContent = "✓ FREE DELIVERY THRESHOLD MET";
    } else {
      statusEl.textContent = `${CartShare.fmt(CartShare.FREE_SHIP_THRESHOLD - sub)} SHORT OF FREE DELIVERY`;
    }

    document.getElementById("r-participant-count").textContent = room.participants.length || 1;
    document.getElementById("r-split-equal").textContent = CartShare.fmt(CartShare.splitEqually(room));

    const byPerson = CartShare.contributionByPerson(room);
    const byPersonEl = document.getElementById("r-by-person");
    byPersonEl.innerHTML = "";
    Object.keys(byPerson).forEach((name) => {
      const row = document.createElement("div");
      row.className = "receipt-row";
      row.innerHTML = `<span>${escapeHtml(name)}</span><span>${CartShare.fmt(byPerson[name])}</span>`;
      byPersonEl.appendChild(row);
    });

    document.getElementById("r-audit-id").textContent =
      `${room.code}-${Date.now().toString(36).toUpperCase()}`;
  }

  // initial paint
  render();
})();
