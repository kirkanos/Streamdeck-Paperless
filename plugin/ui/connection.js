/**
 * Shared "paperless-ngx connection" section of the property inspectors.
 *
 * The plugin owns the connection: this page sends URL and API token once
 * ({ event: "connect" }); the plugin checks them, stores them in the global
 * settings and reports the status back ({ event: "status" }).
 */
(function () {
  const client = SDPIComponents.streamDeckClient;
  const $ = (id) => document.getElementById(id);

  const STATE_TEXT = {
    connected: "Connected",
    connecting: "Connecting…",
    error: "Connection problem",
    unconfigured: "Not connected",
  };

  function send(payload) {
    client.send("sendToPlugin", payload);
  }

  function showMessage(text, kind) {
    const box = $("paperless-message");
    box.textContent = text || "";
    box.className = `message ${kind || ""}`;
    box.hidden = !text;
  }

  function renderStatus(status) {
    const badge = $("paperless-status");
    badge.className = `status ${status.state}`;
    $("paperless-status-text").textContent = STATE_TEXT[status.state] || status.state;
    $("paperless-status-detail").textContent = status.error
      ? status.error
      : status.state === "connected"
        ? `${status.url} · ${status.inboxTagCount} inbox tag${status.inboxTagCount === 1 ? "" : "s"}`
        : status.url;

    $("paperless-login").hidden = status.connected;
    $("paperless-logout").hidden = !status.connected;
    for (const el of document.querySelectorAll(".requires-connection")) {
      el.hidden = !status.connected;
    }
    if (!status.connected && status.url && !$("paperless-url").value) {
      $("paperless-url").value = status.url;
    }
  }

  client.sendToPropertyInspector.subscribe((message) => {
    const payload = message.payload || {};
    if (payload.event === "status") {
      renderStatus(payload);
    } else if (payload.event === "connect") {
      $("paperless-connect").disabled = false;
      if (payload.ok) {
        showMessage(payload.username ? `Connected as ${payload.username}` : "Connected", "success");
        $("paperless-token").value = "";
      } else {
        showMessage(payload.error, "error");
      }
    }
  });

  const TEMPLATE = `
    <sdpi-item label="paperless-ngx">
      <div id="paperless-status" class="status unconfigured">
        <div><strong id="paperless-status-text">…</strong><span id="paperless-status-detail"></span></div>
      </div>
    </sdpi-item>
    <div id="paperless-message" class="message" hidden></div>
    <div id="paperless-login" hidden>
      <sdpi-item label="URL"><sdpi-textfield id="paperless-url" placeholder="https://paperless.example.com"></sdpi-textfield></sdpi-item>
      <sdpi-item label="API token"><sdpi-password id="paperless-token"></sdpi-password></sdpi-item>
      <sdpi-item><sdpi-button id="paperless-connect">Connect</sdpi-button></sdpi-item>
      <p class="hint">Create the token in paperless under your profile (top right) › API auth token.</p>
    </div>
    <div id="paperless-logout" hidden>
      <sdpi-item><sdpi-button id="paperless-disconnect">Disconnect</sdpi-button></sdpi-item>
    </div>`;

  window.addEventListener("DOMContentLoaded", () => {
    $("paperless-connection").innerHTML = TEMPLATE;

    $("paperless-connect").addEventListener("click", () => {
      const url = ($("paperless-url").value || "").trim();
      const token = ($("paperless-token").value || "").trim();
      if (!url || !token) {
        showMessage("Please enter URL and API token", "error");
        return;
      }
      showMessage("Connecting…", "");
      $("paperless-connect").disabled = true;
      send({ event: "connect", url, token });
    });

    $("paperless-disconnect").addEventListener("click", () => {
      showMessage("", "");
      send({ event: "disconnect" });
    });

    send({ event: "getStatus" });
  });
})();
