export const ADMIN_PAGE = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>X23 Control Center</title>
  <style>
    :root { color-scheme: dark; --bg:#090b11; --card:#121722; --line:#273145; --muted:#8994a8; --text:#f5f7fb; --cyan:#27d3ff; --green:#5ce39b; --red:#ff6b7a; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:radial-gradient(circle at 20% 0%,#14283b 0,transparent 38%),var(--bg); color:var(--text); }
    .shell { width:min(960px,calc(100% - 32px)); margin:0 auto; padding:48px 0 64px; }
    .top { display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-bottom:28px; }
    .eyebrow { color:var(--cyan); font-size:12px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:8px 0 0; font-size:clamp(30px,6vw,52px); letter-spacing:-.04em; line-height:1; }
    .subtitle { color:var(--muted); margin:12px 0 0; max-width:620px; line-height:1.5; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    .card { background:rgba(18,23,34,.9); border:1px solid var(--line); border-radius:20px; padding:22px; box-shadow:0 18px 50px rgba(0,0,0,.22); }
    .card h2 { margin:0 0 8px; font-size:19px; }
    .card p { color:var(--muted); line-height:1.45; margin:0 0 20px; font-size:14px; }
    .status { display:flex; align-items:center; gap:10px; margin:18px 0 20px; font-weight:800; }
    .dot { width:11px; height:11px; border-radius:50%; background:var(--muted); box-shadow:0 0 0 5px rgba(137,148,168,.12); }
    .dot.on { background:var(--green); box-shadow:0 0 0 5px rgba(92,227,155,.12); }
    .dot.off { background:var(--red); box-shadow:0 0 0 5px rgba(255,107,122,.12); }
    .actions { display:flex; flex-wrap:wrap; gap:10px; }
    button { border:0; border-radius:11px; padding:11px 14px; color:#061017; background:var(--cyan); font-weight:800; cursor:pointer; }
    button.secondary { color:var(--text); background:#202a3c; border:1px solid #354158; }
    button.danger { color:white; background:#a9364c; }
    button:disabled { opacity:.55; cursor:wait; }
    .meta { border-top:1px solid var(--line); margin-top:18px; padding-top:14px; color:var(--muted); font-size:12px; line-height:1.7; }
    .full { grid-column:1/-1; }
    .login { max-width:430px; margin:12vh auto; }
    label { display:block; color:var(--muted); font-size:13px; margin-bottom:8px; }
    input { width:100%; border:1px solid var(--line); border-radius:11px; background:#0c111b; color:var(--text); padding:13px 14px; outline:none; margin-bottom:12px; }
    input:focus { border-color:var(--cyan); box-shadow:0 0 0 3px rgba(39,211,255,.12); }
    .notice { border-radius:12px; padding:12px 14px; margin-bottom:16px; font-size:13px; display:none; }
    .notice.error { display:block; color:#ffd5da; background:rgba(169,54,76,.25); border:1px solid #883247; }
    .notice.ok { display:block; color:#d5ffe7; background:rgba(47,128,86,.25); border:1px solid #32764f; }
    @media (max-width:680px) { .shell { padding-top:28px; } .top { display:block; } .grid { grid-template-columns:1fr; } .full { grid-column:auto; } }
  </style>
</head>
<body>
  <main class="shell">
    <section id="loginView" class="card login">
      <div class="eyebrow">X23 Hub</div>
      <h1>Control Center</h1>
      <p class="subtitle">Panel privado para revisar y controlar el API y el bot de Discord.</p>
      <div id="loginNotice" class="notice"></div>
      <form id="loginForm">
        <input name="username" autocomplete="username" value="admin" hidden>
        <label for="password">Contraseña administrativa</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">Entrar al panel</button>
      </form>
    </section>
    <section id="panelView" hidden>
      <div class="top">
        <div>
          <div class="eyebrow">X23 Hub / Operations</div>
          <h1>Control Center</h1>
          <p class="subtitle">Administra el estado del servicio sin exponer tokens ni secretos al navegador.</p>
        </div>
        <button id="logoutButton" class="secondary">Cerrar sesión</button>
      </div>
      <div id="panelNotice" class="notice"></div>
      <div class="grid">
        <article class="card">
          <h2>API de validación</h2>
          <p>Controla las validaciones de keys. El endpoint de salud y este panel permanecen disponibles aunque se pause.</p>
          <div class="status"><span id="apiDot" class="dot"></span><span id="apiStatus">Cargando…</span></div>
          <div class="actions">
            <button id="apiToggle">Cambiar estado</button>
          </div>
        </article>
        <article class="card">
          <h2>Bot de Discord</h2>
          <p>Desconecta o vuelve a conectar el bot desde el mismo proceso del hosting 24/7.</p>
          <div class="status"><span id="botDot" class="dot"></span><span id="botStatus">Cargando…</span></div>
          <div class="actions">
            <button id="botToggle">Cambiar estado</button>
          </div>
          <div id="botMeta" class="meta"></div>
        </article>
        <article class="card full">
          <h2>UptimeRobot</h2>
          <p>Configura un monitor HTTP GET con esta URL. Debe responder HTTP 200 mientras el proceso está vivo:</p>
          <code id="healthUrl"></code>
          <div class="meta">Intervalo recomendado: 5 minutos. El panel muestra el último heartbeat recibido del bot.</div>
        </article>
      </div>
    </section>
  </main>
  <script>
    const loginView = document.getElementById("loginView");
    const panelView = document.getElementById("panelView");
    const loginNotice = document.getElementById("loginNotice");
    const panelNotice = document.getElementById("panelNotice");
    const apiDot = document.getElementById("apiDot");
    const botDot = document.getElementById("botDot");
    const apiStatus = document.getElementById("apiStatus");
    const botStatus = document.getElementById("botStatus");
    const botMeta = document.getElementById("botMeta");
    const healthUrl = document.getElementById("healthUrl");
    healthUrl.textContent = location.origin + "/api/healthz";

    function showNotice(element, text, good) {
      element.textContent = text;
      element.className = "notice " + (good ? "ok" : "error");
    }
    function showPanel() { loginView.hidden = true; panelView.hidden = false; refresh(); }
    function showLogin() { loginView.hidden = false; panelView.hidden = true; }
    async function request(path, options) {
      const response = await fetch(path, options);
      if (response.status === 401) { showLogin(); throw new Error("Sesión expirada"); }
      const data = await response.json().catch(function() { return {}; });
      if (!response.ok) throw new Error(data.message || "La operación falló");
      return data;
    }
    function render(data) {
      const state = data.state;
      apiDot.className = "dot " + (state.apiEnabled ? "on" : "off");
      botDot.className = "dot " + (state.botOnline ? "on" : "off");
      apiStatus.textContent = state.apiEnabled ? "Activo" : "Pausado";
      botStatus.textContent = state.botOnline ? "Conectado / heartbeat reciente" : (state.botEnabled ? "Sin heartbeat reciente" : "Desconectado manualmente");
      document.getElementById("apiToggle").textContent = state.apiEnabled ? "Pausar validaciones" : "Activar validaciones";
      document.getElementById("botToggle").textContent = state.botEnabled ? "Desconectar bot" : "Reconectar bot";
      botMeta.textContent = "Heartbeat: " + (state.botHeartbeatAt ? new Date(state.botHeartbeatAt).toLocaleString() : "sin registro");
    }
    async function refresh() {
      try { render(await request("/api/admin/status")); } catch (error) { showNotice(panelNotice, error.message, false); }
    }
    document.getElementById("loginForm").addEventListener("submit", async function(event) {
      event.preventDefault();
      try {
        await request("/api/admin/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ password:document.getElementById("password").value }) });
        document.getElementById("password").value = "";
        showPanel();
      } catch (error) { showNotice(loginNotice, error.message, false); }
    });
    document.getElementById("apiToggle").addEventListener("click", async function() {
      try { const status = await request("/api/admin/control", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ apiEnabled:!apiDot.classList.contains("on") }) }); render(status); showNotice(panelNotice, "Estado del API actualizado.", true); } catch (error) { showNotice(panelNotice, error.message, false); }
    });
    document.getElementById("botToggle").addEventListener("click", async function() {
      try { const status = await request("/api/admin/control", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ botEnabled:!botDot.classList.contains("on") }) }); render(status); showNotice(panelNotice, "Estado del bot actualizado.", true); } catch (error) { showNotice(panelNotice, error.message, false); }
    });
    document.getElementById("logoutButton").addEventListener("click", async function() {
      await fetch("/api/admin/logout", { method:"POST" });
      showLogin();
    });
    request("/api/admin/status").then(showPanel).catch(function() {});
    setInterval(function() { if (!panelView.hidden) refresh(); }, 15000);
  </script>
</body>
</html>`;