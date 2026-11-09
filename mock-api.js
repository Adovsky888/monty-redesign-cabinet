// Clickable mockup: there is no backend here. Every API call is answered in the browser with demo data.
(function () {
  var BASE = "/monty-redesign-cabinet";
  try {
    document.cookie = "monty_lang=ru;path=/";
    localStorage.setItem("monty_lang", "ru");
    if (!localStorage.getItem("monty_theme")) localStorage.setItem("monty_theme", "dark");
  } catch (e) {}
  var empty = /[?&]buy=1/.test(location.search);
  var day = function (n) { return new Date(Date.now() - n * 864e5).toISOString(); };
  var future = function (n) { return new Date(Date.now() + n * 864e5).toISOString(); };
  var row = function (slug, title, status, n, job, jobStatus, poster) {
    return {slug: slug, title: title, status: status, entry_flow: "upload", created_at: day(n), committed_at: job ? day(n) : null, has_bound_source: !!job, poster_url: poster != null ? BASE + "/mock/" + poster + ".jpg" : undefined,
      last_job: job ? {job_id: job, status: jobStatus || "done", type: "render_final", created_at: day(n)} : null};
  };
  var projects = [
    Object.assign(row("p1", "Соцсеть, куда пускают только ИИ", "draft", 0, "ai-network", "done", 0), {committed_at: null, last_job: {job_id: "ai-network", status: "done", type: "render_preview", created_at: day(0)}}),
    row("p3", "Рассталась и начала бизнес", "running", 0, "pic-2", "running", 2),
    row("p2", "Как считать калории по фото", "done", 1, "pic-1", "done", 1),
    row("p8", "Цена айфона в кредит", "failed", 1, "pic-f", "failed", 3),
    row("p4", "Анализ тарелки за 5 секунд", "done", 3, "pic-3", "done", 3),
    row("p6", "Три ошибки в первых секундах", "done", 6, "pic-1", "done", 1),
    row("p7", "Старый ролик про дедлайны", "done", 9, "pic-0", "done", 0)
  ];
  var report = {source_s: 89, final_s: 54, kept_until: future(30), cuts: ["так, стоп, давай ещё раз сначала", "ну в общем, как бы это сказать"]};
  var jobOf = function (id) {
    if (id === "ai-network") return {job_id: id, slug: "p1", status: "done", type: "render_preview", created_at: day(0), updated_at: day(0), stages: [{stage: "render_preview", status: "done"}],
      artifacts: [{kind: "cover", key: "c", bytes: 1, url: BASE + "/fixtures/ai-network/t0.jpg"}]};
    if (id === "pic-f") return {job_id: id, slug: "Цена айфона в кредит", status: "failed", type: "render_final", created_at: day(1), updated_at: day(1), error_code: "demo_mock", error_id: "E-DEMO",
      stages: [{stage: "proxy", status: "failed", error_code: "demo_mock", error_id: "E-DEMO", step: "Обрабатываем медиа"}], artifacts: []};
    var n = (id.match(/pic-(\d)/) || [0, "0"])[1], running = n === "2";
    var title = {0: "Старый ролик про дедлайны", 1: "Как считать калории по фото", 2: "Рассталась и начала бизнес", 3: "Анализ тарелки за 5 секунд"}[n];
    return {job_id: id, slug: title, status: running ? "running" : "done", type: "render_final", created_at: day(0), updated_at: day(0), report: running ? undefined : report,
      stages: running ? [{stage: "ingest", status: "done"}, {stage: "coarse_transcribe", status: "done"}, {stage: "take_cut", status: "done"}, {stage: "resolve", status: "done"}, {stage: "render_base", status: "running", pct: 40}] : [{stage: "render_final", status: "done"}],
      artifacts: running ? [{kind: "cover", key: "c", bytes: 1, url: BASE + "/mock/" + n + ".jpg"}] : [
        {kind: "master", key: "demo/video-" + n + ".mp4", bytes: 14000000, duration_s: 54, url: BASE + "/mock/" + n + ".mp4", download_url: BASE + "/mock/" + n + ".mp4"},
        {kind: "cover", key: "demo/cover-" + n + ".jpg", bytes: 40000, url: BASE + "/mock/" + n + ".jpg", download_url: BASE + "/mock/" + n + ".jpg"}]};
  };
  var brand = {logo_key: null, logo_url: null, colors: {bg: null, fg: null, accent: "#FFD21E"}, font_key: null, caption_style: "pop", links: {telegram: "https://t.me/montyfastnews", cta: "telegram"}};
  var META = {title: "6 из 8 приёмов за смену", description: "Демо-описание ролика.", source: "transcript",
    youtube: {title: "6 из 8 приёмов за смену", description: "Демо-описание для YouTube.", tags: ["монтаж", "reels"]},
    instagram: {caption: "Демо-подпись для Instagram #монтаж"}, tiktok: {title: "Демо-подпись для TikTok #монтаж"}};
  var json = function (code, body) { return new Response(JSON.stringify(body), {status: code, headers: {"content-type": "application/json"}}); };
  var toastEl;
  var toast = function () {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;background:#FFD21E;color:#161512;padding:10px 18px;border-radius:999px;font:600 14px system-ui;max-width:90vw;text-align:center";
      toastEl.textContent = "Это макет: действие не выполняется";
      document.body.appendChild(toastEl);
    }
    toastEl.style.display = "block";
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.style.display = "none"; }, 2600);
  };
  var route = function (p, method) {
    if (p === "/api/client-events" || p === "/auth/refresh" || p === "/api/release") return json(200, {});
    if (p === "/auth/logout") { toast(); return json(200, {}); }
    if (p === "/api/brand") return json(200, brand);
    if (method === "GET") {
      if (p === "/api/me") return json(200, {id: "demo", email: "demo@example.com", name: "Демо", auth_provider: "google", plan_tier: empty ? "free" : "creator", can_publish: true});
      if (p === "/api/admin/me") return json(200, {email: "demo@example.com", is_admin: false});
      if (p === "/api/account") return json(200, {balance: empty ? 0 : 12, billing: {enabled: true, packs: [{bananas: 10, price_cents: 2500}, {bananas: 30, price_cents: 6500}, {bananas: 100, price_cents: 19000}]}, free_balance: empty ? 0 : 3, free_cap: 3});
      if (p === "/api/account/ledger") return json(200, {entries: [
        {id: "l1", delta: -1, reason: "run", job_id: null, project_id: null, project_title: "Как считать калории по фото", created_at: day(1)},
        {id: "l2", delta: 3, reason: "welcome", job_id: null, project_id: null, project_title: null, created_at: day(9)}]});
      if (p === "/api/account/payments") return json(200, {payments: []});
      if (p === "/api/projects") return json(200, {projects: projects});
      if (p === "/api/connections") return json(200, {publishing_enabled: true, youtube_audited: true, platforms_enabled: {youtube: true, instagram: true, tiktok: true}, connections: [
        {platform: "youtube", status: "connected", handle: "Демо-канал"}, {platform: "instagram", status: "connected", handle: "demo"}, {platform: "tiktok", status: "revoked"}]});
      var m = p.match(/^\/api\/jobs\/([^/]+)$/);
      if (m) return json(200, jobOf(m[1]));
      if (/^\/api\/jobs\/[^/]+\/publish-meta$/.test(p)) return json(200, META);
    }
    if (method !== "GET") { toast(); return json(400, {error: "demo_mock", error_code: "demo_mock", error_id: "E-DEMO"}); }
    return json(404, {error: "not_found", error_code: "not_found", error_id: "E-DEMO"});
  };
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = new URL(typeof input === "string" ? input : input.url || String(input), location.href);
    var p = url.pathname.indexOf(BASE) === 0 ? url.pathname.slice(BASE.length) : url.pathname;
    if (url.origin === location.origin && /^\/(api|auth|v1)\//.test(p)) {
      var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
      return Promise.resolve(route(p, method));
    }
    return realFetch(input, init);
  };
  window.EventSource = function (u) {
    var self = this, id = (String(u).match(/jobs\/([^/]+)\/events/) || [0, "pic-0"])[1];
    this.readyState = 1; this.close = function () { this.readyState = 2; };
    this.addEventListener = function (type, fn) { if (type === "message") this._m = fn; };
    this.removeEventListener = function () {};
    setTimeout(function () {
      var ev = {data: JSON.stringify(jobOf(id))};
      if (self.onopen) self.onopen({});
      if (self._m) self._m(ev);
      if (self.onmessage) self.onmessage(ev);
    }, 60);
  };
  document.addEventListener("DOMContentLoaded", function () {
    var pill = document.createElement("a");
    pill.textContent = "Макет · все экраны";
    pill.href = BASE + "/ekrany.html";
    pill.style.cssText = "position:fixed;right:14px;top:14px;z-index:99998;background:rgba(255,255,255,.1);color:#fff;padding:5px 12px;border-radius:999px;font:600 11px system-ui;text-decoration:none";
    document.body.appendChild(pill);
    if (empty) setTimeout(function () { var a = [].slice.call(document.querySelectorAll('a[href$="#packs"]')).filter(function (x) { return x.offsetParent; })[0]; if (a) a.click(); }, 1200);
  });
})();
