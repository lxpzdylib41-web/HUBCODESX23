export const STATUS_PAGE = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>X23 Hub — Estado del servicio</title>
  <style>
    :root { color-scheme: dark; --bg:#080b12; --card:#111827; --line:#263247; --text:#f4f7fb; --muted:#9aa7ba; --cyan:#35d5ff; --green:#5be39b; --red:#ff6f7d; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; font-family:Inter,ui-sans-serif,system-ui,sans-serif; color:var(--text); background:radial-gradient(circle at 15% 0,#133349 0,transparent 42%),var(--bg); }
    .card { width:min(620px,100%); padding:34px; border:1px solid var(--line); border-radius:24px; background:rgba(17,24,39,.9); box-shadow:0 24px 70px rgba(0,0,0,.28); }
    .eyebrow { color:var(--cyan); font-size:12px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
    h1 { margin:10px 0 8px; font-size:clamp(30px,7vw,50px); letter-spacing:-.05em; }
    p { color:var(--muted); line-height:1.5; margin:0; }
    .status { display:flex; align-items:center; gap:12px; margin:28px 0 22px; font-weight:800; font-size:18px; }
    .dot { width:13px; height:13px; border-radius:50%; background:var(--muted); box-shadow:0 0 0 6px rgba(154,167,186,.12); }
    .dot.on { background:var(--green); box-shadow:0 0 0 6px rgba(91,227,155,.12); }
    .dot.off { background:var(--red); box-shadow:0 0 0 6px rgba(255,111,125,.12); }
    dl { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:0; }
    .item { padding:16px; border:1px solid var(--line); border-radius:14px; background:rgba(8,11,18,.42); }
    dt { color:var(--muted); font-size:12px; margin-bottom:7px; }
    dd { margin:0; font-weight:800; }
    .foot { border-top:1px solid var(--line); margin-top:22px; padding-top:16px; font-size:12px; }
    @media (max-width:520px) { .card { padding:24px; } dl { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">X23 Hub / Operations</div>
    <h1>Servicio en línea</h1>
    <p>Esta página confirma que el Web Service está disponible. UptimeRobot debe consultar <strong>/api/healthz</strong>.</p>
    <div class="status"><span id="dot" class="dot"></span><span id="status">Comprobando estado…</span></div>
    <dl>
      <div class="item"><dt>API de validación</dt><dd id="api">—</dd></div>
      <div class="item"><dt>Bot de Discord</dt><dd id="bot">—</dd></div>
      <div class="item"><dt>Último heartbeat</dt><dd id="heartbeat">—</dd></div>
      <div class="item"><dt>Actualización</dt><dd id="updated">—</dd></div>
    </dl>
    <p class="foot">Actualización automática cada 30 segundos. Esta página no contiene tokens ni credenciales.</p>
  </main>
  <script>
    const dot = document.getElementById("dot");
    const status = document.getElementById("status");
    const api = document.getElementById("api");
    const bot = document.getElementById("bot");
    const heartbeat = document.getElementById("heartbeat");
    const updated = document.getElementById("updated");
    function text(value) { return value ? new Date(value).toLocaleString() : "Sin registro"; }
    async function refresh() {
      try {
        const response = await fetch("/api/healthz", { cache: "no-store" });
        const data = await response.json();
        const online = response.ok && data.botOnline;
        dot.className = "dot " + (online ? "on" : "off");
        status.textContent = online ? "API y bot operativos" : "API disponible; bot sin heartbeat reciente";
        api.textContent = data.apiEnabled ? "Activo" : "Pausado";
        bot.textContent = data.botOnline ? "Conectado" : (data.botEnabled ? "Sin heartbeat" : "Desconectado");
        heartbeat.textContent = text(data.botHeartbeatAt);
        updated.textContent = new Date().toLocaleTimeString();
      } catch (error) {
        dot.className = "dot off";
        status.textContent = "No se pudo consultar el estado";
        api.textContent = "Sin respuesta";
        bot.textContent = "Sin respuesta";
      }
    }
    refresh();
    setInterval(refresh, 30000);
  </script>
</body>
</html>`;