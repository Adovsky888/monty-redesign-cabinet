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

  // Demo run state: lives in this tab (sessionStorage) so a reload does not break the path. Timers are derived from timestamps.
  var KEY = "monty_demo_v1";
  var blank = function () { return {seq: 0, jobs: {}, projects: [], deleted: [], scen: {}, mints: {}, pub: {}, meta: {}, balance: 12, tier: null, ledger: []}; };
  var clearStale = function () {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("monty:scenario:") === 0) localStorage.removeItem(k); }); } catch (e) {}
  };
  var state = null;
  try { state = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
  if (/[?&]demo=start/.test(location.search)) {
    state = null;
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }
  if (!state) { state = blank(); clearStale(); }
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  save();
  var nextId = function (p) { state.seq += 1; return p + "-" + state.seq + "-" + Date.now().toString(36); };
  var CHAIN = [["ingest", 2000, "plan"], ["coarse_transcribe", 3800, "plan"], ["take_cut", 3200, "plan"], ["resolve", 2600, "plan"], ["fetch_broll", 2800, "render_preview"], ["head_segments", 2200, "render_preview"], ["render_base", 3400, "render_preview"]];
  var FINAL = [["render_base", 3200], ["assemble_master", 2500], ["check_master", 1800], ["stamp_deliverables", 900], ["deliver", 1100]];
  var CACHED = ["ingest", "coarse_transcribe", "take_cut", "resolve", "fetch_broll", "head_segments"];
  var LISTS = {chain: CHAIN, final: FINAL, scenario: [["scenario", 6000]], aux: [["publish_meta", 2500]]};
  var total = function (l) { return l.reduce(function (a, s) { return a + s[1]; }, 0); };
  var COVER = BASE + "/mock/0.jpg", MASTER = BASE + "/mock/0.mp4";
  var jobView = function (id) {
    var j = state.jobs[id];
    if (!j) return null;
    var list = LISTS[j.kind], now = j.cancelled || Date.now(), e = now - j.t0, sum = total(list), done = !j.cancelled && e >= sum;
    var stages = [], t = 0, type = j.kind === "final" ? "render_final" : j.kind === "scenario" ? "scenario" : j.kind === "aux" ? "publish_meta" : "plan";
    if (j.kind === "final") CACHED.forEach(function (s) { stages.push({stage: s, status: "done"}); });
    list.forEach(function (s) {
      if (e >= t + s[1]) stages.push({stage: s[0], status: "done"});
      else if (e >= t) stages.push({stage: s[0], status: j.cancelled ? "failed" : "running", pct: Math.round(100 * (e - t) / s[1])});
      if (e >= t && s[2]) type = s[2];
      t += s[1];
    });
    if (j.kind === "chain" && done) type = "palette";
    var out = {job_id: id, slug: j.title, status: j.cancelled ? "failed" : done ? "done" : "running", type: type, created_at: new Date(j.t0).toISOString(), updated_at: new Date(now).toISOString(), stages: stages, artifacts: []};
    if (j.cancelled) out.cancelled = true;
    if ((j.kind === "chain" && e > 5000 || j.kind === "final" && !done) && !j.cancelled) out.artifacts = [{kind: "cover", key: "demo/cover.jpg", bytes: 40000, url: COVER}];
    if (j.kind === "final" && done) {
      var src = j.src || 89;
      out.report = {source_s: Math.round(src), final_s: Math.round(src * 0.62), kept_until: future(30), cuts: ["соцсеть, в которую, ой, давай заново", "ну и вот, короче"]};
      out.artifacts = [
        {kind: "master", key: "demo/video.mp4", bytes: 14000000, duration_s: Math.round(src * 0.62), url: MASTER, download_url: MASTER},
        {kind: "cover", key: "demo/cover.jpg", bytes: 40000, url: COVER, download_url: COVER}];
    }
    return out;
  };
  // Publication rows are layered onto any job, demo or static.
  var withPub = function (job) {
    var pub = job && state.pub[job.job_id];
    if (!pub) return job;
    var e = Date.now() - pub.t0, stages = (job.stages || []).slice(), rows = [];
    pub.platforms.forEach(function (p, i) {
      var settled = e >= 3500 + i * 1500;
      stages.push({stage: "publish:" + p, status: settled ? "done" : "running"});
      rows.push({id: "pub-" + p, platform: p, job_id: job.job_id, status: settled ? "live" : "running", mode: "direct", applied_visibility: settled ? (p === "youtube" ? pub.privacy || "public" : p === "instagram" ? "public" : null) : null, created_at: new Date(pub.t0).toISOString(), published_at: settled ? new Date(pub.t0 + 3500 + i * 1500).toISOString() : null, warnings: []});
    });
    return Object.assign({}, job, {stages: stages, publications: rows, updated_at: new Date().toISOString()});
  };
  var isDemoId = function (id) { return /^[urms]-/.test(id); };
  var viewJob = function (id) { return withPub(isDemoId(id) ? jobView(id) : jobOf(id)); };
  var ledgerAdd = function (delta, reason, title) { state.ledger.unshift({id: "d" + state.seq + "-" + state.ledger.length, delta: delta, reason: reason, job_id: null, project_id: null, project_title: title || null, created_at: new Date().toISOString()}); };
  var parse = function (b) { try { return typeof b === "string" && b ? JSON.parse(b) : {}; } catch (e) { return {}; } };
  var cleanName = function (n) { return String(n || "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " ").trim() || "Новый ролик"; };
  var findProject = function (s) { return state.projects.filter(function (p) { return p.slug === s || p.title === s; })[0]; };
  var ensureProject = function (slug, title, flow) {
    var p = findProject(slug);
    if (p) return p;
    var st = projects.filter(function (x) { return x.slug === slug || x.title === slug; })[0];
    p = {slug: st ? st.slug : slug, title: st ? st.title : title, entry_flow: flow, created_at: new Date().toISOString(), committed: null, bound: false, jobId: null};
    state.projects.unshift(p);
    return p;
  };
  var startJob = function (kind, p, extra) {
    var id = nextId(kind === "final" ? "r" : kind === "scenario" ? "s" : kind === "aux" ? "m" : "u");
    state.jobs[id] = Object.assign({kind: kind, t0: Date.now(), title: p ? p.title : "Новый ролик", slug: p ? p.slug : null}, extra || {});
    if (p && kind !== "aux") { p.jobId = id; p.committed = null; }
    save();
    return id;
  };
  var viewProject = function (p) {
    var j = p.jobId ? jobView(p.jobId) : null;
    var status = !j ? "draft" : j.status === "failed" ? "failed" : j.status !== "done" ? "running" : j.type === "render_final" ? "done" : "draft";
    return {slug: p.slug, title: p.title, status: status, entry_flow: p.entry_flow, created_at: p.created_at, committed_at: p.committed, has_bound_source: !!p.bound, run_open: !!p.bound, source_name: p.source || undefined,
      poster_url: p.bound ? COVER : undefined, last_job: j ? {job_id: j.job_id, status: j.status, type: j.type, created_at: j.created_at} : null};
  };
  var allProjects = function () {
    var mine = state.projects.map(viewProject), slugs = {};
    mine.forEach(function (p) { slugs[p.slug] = 1; });
    return mine.concat(projects.filter(function (p) { return !slugs[p.slug]; })).filter(function (p) { return state.deleted.indexOf(p.slug) < 0; });
  };
  var scenarioOf = function (slug) {
    var s = state.scen[slug];
    if (!s) return null;
    if (s.job) {
      var j = state.jobs[s.job];
      if (j && Date.now() - j.t0 < total(LISTS[j.kind])) return null;
      s.version = (s.version || 0) + 1; s.status = "draft"; delete s.job;
      var first = String(s.dump || "Мой ролик").trim().split(/\r?\n/)[0].slice(0, 70);
      s.title = first;
      s.body = first + ".\n\nПервые три секунды: главная мысль и зачем это смотреть.\n\nДальше один пример из жизни, короткими фразами, по одной мысли на кадр.\n\nПотом результат и цифра, которую легко запомнить.\n\nВ конце одна просьба: подпишись, если хочешь продолжение.";
      s.music_mood = "calm neutral";
      var p = findProject(slug); if (p) p.title = first;
      save();
    }
    return {version: s.version, status: s.status, title: s.title, body: s.body, music_mood: s.music_mood};
  };
  var brand = {logo_key: null, logo_url: null, colors: {bg: null, fg: null, accent: "#FFD21E"}, font_key: null, caption_style: "pop", links: {telegram: "https://t.me/montyfastnews", cta: "telegram"}};
  var META = {title: "6 из 8 приёмов за смену", description: "Демо-описание ролика.", source: "transcript",
    youtube: {title: "6 из 8 приёмов за смену", description: "Демо-описание для YouTube.", tags: ["монтаж", "reels"]},
    instagram: {caption: "Демо-подпись для Instagram #монтаж"}, tiktok: {title: "Демо-подпись для TikTok #монтаж"}};
  var json = function (code, body) { return new Response(JSON.stringify(body), {status: code, headers: {"content-type": "application/json"}}); };
  var toastEl;
  var toast = function (msg) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:99999;background:#FFD21E;color:#161512;padding:10px 18px;border-radius:999px;font:600 14px system-ui;max-width:90vw;text-align:center";
      toastEl.textContent = "Это макет: действие не выполняется";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = typeof msg === "string" ? msg : "Это макет: действие не выполняется";
    toastEl.style.display = "block";
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.style.display = "none"; }, 2600);
  };

  // Purchases: no redirect to a payment page in the demo. The sheet credits the balance, then returns to the account.
  var paySheet = function (title, text, cta, onOk) {
    return new Promise(function () {
      var w = document.createElement("div");
      w.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:20px;font:15px/1.45 system-ui";
      var c = document.createElement("div");
      c.style.cssText = "max-width:400px;width:100%;background:#1b1a18;color:#f4f1e9;border-radius:22px;padding:26px";
      var h = document.createElement("div"); h.textContent = title; h.style.cssText = "font:700 20px/1.2 system-ui;margin-bottom:10px";
      var p = document.createElement("div"); p.textContent = text; p.style.cssText = "color:#bcb8ae;margin-bottom:20px";
      var row = document.createElement("div"); row.style.cssText = "display:flex;gap:10px;flex-wrap:wrap";
      var mk = function (t, primary, fn) { var b = document.createElement("button"); b.type = "button"; b.textContent = t; b.style.cssText = "cursor:pointer;border-radius:999px;padding:11px 20px;font:700 14px system-ui;border:1px solid " + (primary ? "#FFD21E" : "#55524b") + ";background:" + (primary ? "#FFD21E" : "transparent") + ";color:" + (primary ? "#161512" : "#f4f1e9"); b.onclick = fn; return b; };
      if (cta) row.appendChild(mk(cta, true, onOk));
      row.appendChild(mk(cta ? "Отмена" : "Понятно", !cta, function () { location.reload(); }));
      c.appendChild(h); c.appendChild(p); c.appendChild(row); w.appendChild(c); document.body.appendChild(w);
    });
  };
  var PLAN_VIDEOS = {creator: 15, pro: 30, studio: 100};
  var billing = function (p, b) {
    var n = b.pack || b.bananas || PLAN_VIDEOS[b.tier] || 0;
    if (/\/(checkout|change-plan)$/.test(p) && n) {
      return paySheet("Здесь откроется оплата", "Это демо, платёж не проводится. Начислим " + n + " роликов на баланс, чтобы было видно результат.", "Начислить и вернуться", function () {
        state.balance += n;
        if (b.tier) state.tier = b.tier;
        ledgerAdd(n, "purchase", null);
        save();
        if (b.tier) { location.href = BASE + "/account?paid=1"; return; }
        state.flash = "Начислено роликов: " + n; save();
        location.href = BASE + "/account";
      });
    }
    return paySheet("Управление подпиской", "В демо этот шаг только показывается, настоящей подписки здесь нет.", null);
  };
  var route = function (p, method, body) {
    var b = parse(body), mm;
    if (p === "/api/client-events" || p === "/auth/refresh" || p === "/api/release") return json(200, {});
    if (p === "/auth/logout") { toast(); return json(200, {}); }
    if (p === "/api/brand") return json(200, brand);
    if (method === "GET") {
      if (p === "/api/me") return json(200, {id: "demo", email: "demo@example.com", name: "Демо", auth_provider: "google", plan_tier: empty ? "free" : state.tier || "creator", can_publish: true});
      if (p === "/api/admin/me") return json(200, {email: "demo@example.com", is_admin: false});
      if (p === "/api/account") return json(200, {balance: empty ? 0 : state.balance, billing: {enabled: true, packs: [{bananas: 3, price_cents: 900}, {bananas: 5, price_cents: 1400}, {bananas: 10, price_cents: 2500}, {bananas: 30, price_cents: 6500}, {bananas: 100, price_cents: 19000}]}, free_balance: empty ? 0 : 3, free_cap: 3});
      if (p === "/api/account/ledger") return json(200, {entries: state.ledger.concat([
        {id: "l1", delta: -1, reason: "run", job_id: null, project_id: null, project_title: "Как считать калории по фото", created_at: day(1)},
        {id: "l2", delta: 3, reason: "welcome", job_id: null, project_id: null, project_title: null, created_at: day(9)}])});
      if (p === "/api/account/payments") return json(200, {payments: []});
      if (p === "/api/projects") return json(200, {projects: allProjects()});
      if (p === "/api/connections") return json(200, {publishing_enabled: true, youtube_audited: true, platforms_enabled: {youtube: true, instagram: true, tiktok: true}, connections: [
        {platform: "youtube", status: "connected", handle: "Демо-канал"}, {platform: "instagram", status: "connected", handle: "demo"}, {platform: "tiktok", status: "revoked"}]});
      var m = p.match(/^\/api\/jobs\/([^/]+)$/);
      if (m) { var jv = viewJob(m[1]); return jv ? json(200, jv) : json(404, {error: "not_found", error_code: "not_found", error_id: "E-DEMO"}); }
      if ((m = p.match(/^\/api\/jobs\/([^/]+)\/publish-meta$/))) return json(200, state.meta[m[1]] || META);
    }
    if (method === "POST" && /^\/api\/billing\//.test(p)) return billing(p, b);
    if (method === "POST" && p === "/api/uploads") {
      if (b.sha256) {
        var mintId = nextId("mint");
        state.mints[mintId] = {name: b.filename, slug: b.slug}; save();
        return json(200, {upload_id: mintId, upload_url: "https://upload.demo.invalid/" + mintId, headers: {"content-md5": "demo", "if-none-match": "*", "x-amz-meta-source-sha256": "demo"}});
      }
      return json(200, {upload_url: "https://upload.demo.invalid/legacy", key: "demo/" + (b.slug || "source")});
    }
    if (method === "POST" && /^\/api\/uploads\/[^/]+\/complete$/.test(p)) return json(200, {});
    if (method === "POST" && p === "/api/jobs") {
      if (b.type === "scenario") {
        var sp = ensureProject(b.slug, "Новый сценарий", "scenario"), sj = startJob("scenario", sp);
        state.scen[b.slug] = {job: sj, dump: (b.params && b.params.dump) || "", version: 0};
        if (state.balance > 0) { state.balance -= 1; ledgerAdd(-1, "run", sp.title); sp.charged = true; }
        save();
        return json(202, {job_id: sj});
      }
      if (b.type === "plan") return json(202, {job_id: startJob("aux", null)});
      if (b.type === "render_final") {
        var from = (location.search.match(/[?&]job=([^&]+)/) || [])[1];
        var fj = from && state.jobs[from];
        var rp = ensureProject(fj ? fj.slug : (b.slug || "p1"), "Соцсеть, куда пускают только ИИ", "upload");
        rp.bound = true;
        var rj = startJob("final", rp, {from: from || null, src: fj && fj.src});
        return json(202, {job_id: rj});
      }
      var chk = findProject(b.slug); if (state.balance <= 0 && !(chk && chk.charged)) return json(402, {error: "insufficient_credits", error_code: "insufficient_credits", error_id: "E-DEMO"});
      var mint = b.upload_id && state.mints[b.upload_id];
      var cp = ensureProject(b.slug, cleanName(mint && mint.name), "upload");
      cp.bound = true;
      if (mint) cp.source = mint.name;
      if (cp.charged) cp.charged = false;
      else { state.balance -= 1; ledgerAdd(-1, "run", cp.title); }
      return json(202, {job_id: startJob("chain", cp, {src: b.params && b.params.duration_s})});
    }
    if ((mm = p.match(/^\/api\/jobs\/([^/]+)\/cancel$/)) && method === "POST") {
      var cj = state.jobs[mm[1]];
      if (cj && !cj.cancelled) {
        cj.cancelled = Date.now();
        if (cj.kind === "chain") { state.balance += 1; ledgerAdd(1, "refund", cj.title); }
        save();
      }
      return json(202, {});
    }
    if ((mm = p.match(/^\/api\/jobs\/([^/]+)\/commit$/)) && method === "POST") {
      var tp = state.jobs[mm[1]] && findProject(state.jobs[mm[1]].slug);
      if (tp) { tp.committed = tp.committed || new Date().toISOString(); save(); }
      return json(200, {});
    }
    if (/^\/api\/jobs\/[^/]+\/plan-edits$/.test(p) && method === "POST") return json(200, {client_seq: b.client_seq || 1});
    if ((mm = p.match(/^\/api\/jobs\/([^/]+)\/publish$/)) && method === "POST") {
      var platforms = b.platforms || [];
      state.pub[mm[1]] = {t0: Date.now(), platforms: platforms, privacy: b.youtube && b.youtube.privacyStatus}; save();
      return json(202, Object.assign({}, viewJob(mm[1]), {platforms: platforms, refusals: [], idempotent: false}));
    }
    if ((mm = p.match(/^\/api\/jobs\/([^/]+)\/publish-meta$/)) && method === "PUT") {
      state.meta[mm[1]] = Object.assign({}, state.meta[mm[1]] || META, b); save();
      return json(200, state.meta[mm[1]]);
    }
    if (/\/publish-meta\/regenerate$/.test(p) && method === "POST") return json(202, {job_id: startJob("aux", null), status: "queued"});
    if (/^\/api\/jobs\/[^/]+\/thumbnail$/.test(p) && method === "POST") return json(200, {upload_url: "https://upload.demo.invalid/thumb", key: "demo/thumb.jpg"});
    if (/\/poster(\/complete)?$/.test(p) && method === "POST") return json(200, {});
    if ((mm = p.match(/^\/api\/projects\/([^/]+)$/)) && method === "DELETE") {
      var dslug = decodeURIComponent(mm[1]);
      state.deleted.push(dslug);
      state.projects = state.projects.filter(function (x) { return x.slug !== dslug; }); save();
      return json(200, {});
    }
    if ((mm = p.match(/^\/api\/projects\/([^/]+)\/prompter-link$/)) && method === "POST") return json(200, {token: "demo", url_path: "/record?slug=" + mm[1], expires_at: future(1)});
    if ((mm = p.match(/^\/api\/projects\/([^/]+)\/scenario(?:\/([a-z-]+))?$/))) {
      var ss = decodeURIComponent(mm[1]), act = mm[2];
      if (method === "GET" && !act) { var rec = scenarioOf(ss); return rec ? json(200, rec) : json(404, {error: "not_found"}); }
      if (method === "POST" && act === "revise") {
        var cur = state.scen[ss] || {version: 0};
        cur.version = (cur.version || 0) + 1; cur.status = "draft"; delete cur.job;
        cur.title = b.title; cur.body = b.body; cur.music_mood = b.music_mood;
        state.scen[ss] = cur;
        var rvp = ensureProject(ss, b.title, "scenario"); rvp.title = b.title; save();
        return json(200, scenarioOf(ss));
      }
      if (method === "POST" && act === "approve") { scenarioOf(ss); if (state.scen[ss]) state.scen[ss].status = "approved"; save(); return json(200, scenarioOf(ss)); }
      if (method === "POST" && (act === "regenerate" || act === "ai-revise")) {
        scenarioOf(ss);
        var ap = ensureProject(ss, "Новый сценарий", "scenario"), aj = startJob("scenario", ap);
        state.scen[ss].job = aj;
        if (b.instruction) state.scen[ss].dump = state.scen[ss].title;
        save();
        return json(202, {job_id: aj});
      }
    }
    if (/^\/api\/jobs\/[^/]+\/plan$/.test(p) && method === "GET") return realFetch(BASE + "/fixtures/ai-network/plan.json", {cache: "no-store"});
    if (method !== "GET") { toast(); return json(400, {error: "demo_mock", error_code: "demo_mock", error_id: "E-DEMO"}); }
    return json(404, {error: "not_found", error_code: "not_found", error_id: "E-DEMO"});
  };
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = new URL(typeof input === "string" ? input : input.url || String(input), location.href);
    var p = url.pathname.indexOf(BASE) === 0 ? url.pathname.slice(BASE.length) : url.pathname;
    if (url.origin === location.origin && /^\/(api|auth|v1)\//.test(p)) {
      var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
      return Promise.resolve(route(p, method, (init && init.body) || null));
    }
    return realFetch(input, init);
  };
  window.EventSource = function (u) {
    var self = this, id = (String(u).match(/jobs\/([^/]+)\/events/) || [0, "pic-0"])[1];
    id = decodeURIComponent(id);
    var timer = null, last = "", ended = false;
    this.readyState = 1;
    this.close = function () { this.readyState = 2; ended = true; clearInterval(timer); };
    this._l = {};
    this.addEventListener = function (type, fn) { (this._l[type] = this._l[type] || []).push(fn); if (type === "message") this._m = fn; };
    this.removeEventListener = function () {};
    var open = function (s) {
      return (s.stages || []).some(function (x) { return /^publish(:|$)/.test(x.stage) && (x.status === "running" || x.status === "queued"); });
    };
    var pulse = function () {
      if (ended) return;
      var v = viewJob(id);
      if (!v) return;
      var key = JSON.stringify(Object.assign({}, v, {updated_at: 0}));
      if (key !== last) {
        last = key;
        var ev = {data: JSON.stringify(v)};
        (self._l.job || []).forEach(function (f) { f(ev); });
        (self._l.snapshot || []).forEach(function (f) { f(ev); });
        if (self._m) self._m(ev);
        if (self.onmessage) self.onmessage(ev);
      }
      if ((v.status === "done" || v.status === "failed") && !open(v)) clearInterval(timer);
    };
    setTimeout(function () {
      if (ended) return;
      if (self.onopen) self.onopen({});
      (self._l.open || []).forEach(function (f) { f({}); });
      pulse();
      timer = setInterval(pulse, 700);
    }, 60);
  };
  // Upload PUTs: the file is never sent anywhere, the browser just plays the progress.
  var RealXHR = window.XMLHttpRequest;
  var demoHost = /upload\.demo\.invalid/;
  window.XMLHttpRequest = class extends RealXHR {
    open(m, u) { this.__demo = demoHost.test(String(u)); if (this.__demo) return; return super.open.apply(this, arguments); }
    setRequestHeader() { if (this.__demo) return; return super.setRequestHeader.apply(this, arguments); }
    getResponseHeader(n) { if (this.__demo) return String(n).toLowerCase() === "etag" ? '"demo-etag"' : null; return super.getResponseHeader(n); }
    get status() { return this.__demo ? (this.__done ? 200 : 0) : super.status; }
    get responseText() { return this.__demo ? "" : super.responseText; }
    send(body) {
      if (!this.__demo) return super.send(body);
      var self = this, size = (body && body.size) || 1, dur = 3000 + Math.random() * 1500, t0 = Date.now();
      var up = this.upload;
      this.__timer = setInterval(function () {
        var f = Math.min(1, (Date.now() - t0) / dur);
        if (up.onprogress) up.onprogress({lengthComputable: true, loaded: Math.round(size * f), total: size});
        if (f >= 1) {
          clearInterval(self.__timer);
          if (up.onload) up.onload({});
          if (up.onloadend) up.onloadend({});
          setTimeout(function () { self.__done = true; if (self.onload) self.onload({}); }, 350);
        }
      }, 120);
    }
    abort() { if (!this.__demo) return super.abort(); clearInterval(this.__timer); if (this.onabort) this.onabort({}); }
  };
  (function(){var L="https://adovsky888.github.io/monty-redesign-landing/ru/";
    function fix(a){var h=a.getAttribute("href")||"";if(/^https:\/\/monty\.fast(\/((ru|en|ko|zh|es)\/?)?)?(\?.*)?$/.test(h)){a.href=L;a.removeAttribute("target");}}
    document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(a)fix(a);},true);})();
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/\/mock\/\d\.mp4(\?|$)/.test(h)) a.setAttribute("download", "monty-rolik.mp4");
    if (h.indexOf("/preview?job=ai-network&fixtures=1") >= 0) {
      var cur = (location.search.match(/[?&]job=([^&]+)/) || [])[1], j = cur && state.jobs[cur];
      if (j && j.from) a.setAttribute("href", BASE + "/preview?job=" + encodeURIComponent(j.from));
    }
  }, true);
  document.addEventListener("DOMContentLoaded", function () {
    if (state.flash) { var fl = state.flash; delete state.flash; save(); setTimeout(function () { toast(fl); }, 400); }
    if (/\/(upload|preview)(\.html)?$/.test(location.pathname)) return; // these screens have a fixed bottom bar with the main button
    var pill = document.createElement("a");
    pill.textContent = "Макет · все экраны";
    pill.href = BASE + "/ekrany.html";
    pill.style.cssText = "position:fixed;right:84px;bottom:22px;z-index:99998;background:rgba(255,255,255,.1);color:#fff;padding:5px 12px;border-radius:999px;font:600 11px system-ui;text-decoration:none";
    document.body.appendChild(pill);
    var pill2 = pill.cloneNode(); pill2.textContent = "Лендинг"; pill2.href = "https://adovsky888.github.io/monty-redesign-landing/ru/"; pill2.style.right = "215px"; document.body.appendChild(pill2);
    if (empty) setTimeout(function () { var a = [].slice.call(document.querySelectorAll('a[href$="#packs"]')).filter(function (x) { return x.offsetParent; })[0]; if (a) a.click(); }, 1200);
  });
})();
