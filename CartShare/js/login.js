/**
 * CartShare — login.js
 * Handles the two tabs on index.html: Create Room / Join Room.
 */
(function () {
  const tabCreate = document.getElementById("tab-create");
  const tabJoin = document.getElementById("tab-join");
  const panelCreate = document.getElementById("panel-create");
  const panelJoin = document.getElementById("panel-join");

  function activate(tab) {
    const showCreate = tab === "create";
    tabCreate.setAttribute("aria-selected", String(showCreate));
    tabJoin.setAttribute("aria-selected", String(!showCreate));
    panelCreate.hidden = !showCreate;
    panelJoin.hidden = showCreate;
  }

  tabCreate.addEventListener("click", () => activate("create"));
  tabJoin.addEventListener("click", () => activate("join"));

  // ---- Create Room ----
  const createNameInput = document.getElementById("create-name");
  const createNameError = document.getElementById("create-name-error");

  panelCreate.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = createNameInput.value.trim();
    createNameError.textContent = "";

    if (!name) {
      createNameError.textContent = "Enter your name to create a room.";
      createNameInput.focus();
      return;
    }

    const room = CartShare.createRoom(name);
    CartShare.setIdentity({ name, roomCode: room.code });
    window.location.href = `room.html?code=${room.code}`;
  });

  // ---- Join Room ----
  const joinNameInput = document.getElementById("join-name");
  const joinCodeInput = document.getElementById("join-code");
  const joinError = document.getElementById("join-error");

  joinCodeInput.addEventListener("input", () => {
    joinCodeInput.value = joinCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });

  panelJoin.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = joinNameInput.value.trim();
    const code = joinCodeInput.value.trim().toUpperCase();
    joinError.textContent = "";

    if (!name) {
      joinError.textContent = "Enter your name.";
      joinNameInput.focus();
      return;
    }
    if (!code) {
      joinError.textContent = "Enter the room code.";
      joinCodeInput.focus();
      return;
    }
    if (!CartShare.roomExists(code)) {
      joinError.textContent = `No room found with code "${code}". Double-check with your roommate.`;
      joinCodeInput.focus();
      return;
    }

    CartShare.setIdentity({ name, roomCode: code });
    CartShare.joinRoom(code, name);
    window.location.href = `room.html?code=${code}`;
  });

  // Pre-fill code from a shared link like room.html?code=ABC123 -> index.html?code=ABC123
  const params = new URLSearchParams(window.location.search);
  if (params.get("code")) {
    activate("join");
    joinCodeInput.value = params.get("code").toUpperCase();
  }
})();
