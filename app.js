(() => {
  'use strict';

  // ── Config & fixtures ───────────────────────────────────────────────────────
  const CONFIG   = window.APP_CONFIG || {};
  const MATCHES  = (window.WC_MATCHES || []).slice().sort((a, b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc));
  const BY_ID    = new Map(MATCHES.map(m => [String(m.id), m]));
  const POINTS   = Object.assign({ exact: 3, outcome: 1 }, CONFIG.POINTS || {});
  const TZ       = CONFIG.TIMEZONE || 'Europe/Warsaw';
  const API_URL  = (CONFIG.API_URL || '').trim();
  const params   = new URLSearchParams(window.location.search);
  const groupCode = sanitizeCode(params.get('g') || params.get('group') || CONFIG.DEFAULT_GROUP || 'mundial2026');
  let inviteCode  = params.get('i') || params.get('invite') || lsGet(inviteKey()) || CONFIG.DEFAULT_INVITE || '';
  if (inviteCode) lsSet(inviteKey(), inviteCode);

  // Team flag emojis
  const FLAGS = {
    'Meksyk': '🇲🇽', 'RPA': '🇿🇦', 'Korea Płd.': '🇰🇷', 'Czechy': '🇨🇿',
    'Kanada': '🇨🇦', 'Bośnia i Hercegowina': '🇧🇦', 'USA': '🇺🇸', 'Paragwaj': '🇵🇾',
    'Katar': '🇶🇦', 'Szwajcaria': '🇨🇭', 'Brazylia': '🇧🇷', 'Maroko': '🇲🇦',
    'Haiti': '🇭🇹', 'Szkocja': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Australia': '🇦🇺', 'Turcja': '🇹🇷',
    'Niemcy': '🇩🇪', 'Curaçao': '🇨🇼', 'Holandia': '🇳🇱', 'Japonia': '🇯🇵',
    'Wybrzeże Kości Słoniowej': '🇨🇮', 'Ekwador': '🇪🇨', 'Szwecja': '🇸🇪', 'Tunezja': '🇹🇳',
    'Hiszpania': '🇪🇸', 'Republika Zielonego Przylądka': '🇨🇻', 'Belgia': '🇧🇪', 'Egipt': '🇪🇬',
    'Arabia Saudyjska': '🇸🇦', 'Urugwaj': '🇺🇾', 'Iran': '🇮🇷', 'Nowa Zelandia': '🇳🇿',
    'Francja': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Norwegia': '🇳🇴',
    'Argentyna': '🇦🇷', 'Algieria': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
    'Portugalia': '🇵🇹', 'DR Konga': '🇨🇩', 'Anglia': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Chorwacja': '🇭🇷',
    'Ghana': '🇬🇭', 'Panama': '🇵🇦', 'Uzbekistan': '🇺🇿', 'Kolumbia': '🇨🇴',
  };

  // ── State ───────────────────────────────────────────────────────────────────
  let currentPlayer  = readJson(lsGet(playerKey()), null);
  let activeTab      = lsGet('wc:activeTab') || 'matches';
  let matchFilter    = lsGet('wc:matchFilter') || 'open';
  let adminFilter    = lsGet('wc:adminFilter') || 'needs-result';
  let appState       = { players: [], predictions: [], results: [] };
  let loading        = false;
  let joinMode       = 'join'; // 'join' | 'recover'
  let refreshTimer   = null;
  let cdownTimer     = null;

  const app        = document.getElementById('app');
  const heroStatus = document.getElementById('heroStatus');
  const toast      = document.getElementById('toast');

  // ── Boot ────────────────────────────────────────────────────────────────────
  init();

  async function init() {
    applyTheme();
    wireEvents();
    renderShell();
    await loadState(false);
    renderShell();
    startCountdowns();
    if (API_URL) {
      refreshTimer = setInterval(() => loadState(true), 30_000);
      addEventListener('beforeunload', () => clearInterval(refreshTimer));
    }
  }

  // ── Countdowns ──────────────────────────────────────────────────────────────
  function startCountdowns() {
    if (cdownTimer) clearInterval(cdownTimer);
    cdownTimer = setInterval(tickCountdowns, 1000);
    tickCountdowns();
  }

  function tickCountdowns() {
    const now = Date.now();
    document.querySelectorAll('[data-cd]').forEach(el => {
      const ms = Number(el.dataset.cd) - now;
      if (ms <= 0) {
        el.textContent = 'zablokowany';
        el.className = 'countdown locked-badge';
      } else {
        el.textContent = fmtCd(ms);
        el.className = 'countdown' + (ms < 3_600_000 ? ' urgent' : ms < 21_600_000 ? ' soon' : '');
      }
    });
  }

  function fmtCd(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
          m = Math.floor((s % 3600) / 60), sc = s % 60;
    if (d > 0) return `${d}d ${h}g ${m}m`;
    if (h > 0) return `${h}g ${m}m ${sc}s`;
    return `${m}m ${sc}s`;
  }

  // ── Theme ────────────────────────────────────────────────────────────────────
  function applyTheme() {
    const saved = lsGet('wc:theme') || 'light';
    setTheme(saved, false);
  }

  function setTheme(theme, save = true) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : '';
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (save) lsSet('wc:theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // ── Events ──────────────────────────────────────────────────────────────────
  function wireEvents() {
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    document.addEventListener('submit', async e => {
      if (e.target.id === 'joinForm')    { e.preventDefault(); await handleJoin(); }
      if (e.target.id === 'recoverForm') { e.preventDefault(); await handleRecover(); }
    });

    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action],[data-tab]');
      if (!btn) return;
      const { tab, action, matchId, code, pick } = btn.dataset;

      if (tab) {
        activeTab = tab;
        lsSet('wc:activeTab', activeTab);
        renderShell();
        return;
      }

      switch (action) {
        case 'toggle-mode':
          joinMode = joinMode === 'join' ? 'recover' : 'join';
          renderShell(); break;

        case 'refresh':
          await loadState(false);
          showToast('Odświeżono.', 'ok'); break;

        case 'logout':
          localStorage.removeItem(playerKey());
          currentPlayer = null;
          joinMode = 'join';
          renderShell();
          showToast('Wylogowano z tej przeglądarki.', 'ok'); break;

        case 'copy-link': await copyInviteLink(); break;

        case 'save-prediction': await savePrediction(matchId); break;

        case 'save-result': await saveResult(matchId); break;

        case 'generate-invite': await generateInvite(); break;

        case 'copy-invite': {
          await copyText(buildInviteUrl(code));
          showToast('Link skopiowany!', 'ok'); break;
        }

        case 'quickpick':
          applyQuickPick(matchId, pick); break;
      }
    });

    document.addEventListener('change', e => {
      if (e.target.id === 'matchFilter') {
        matchFilter = e.target.value;
        lsSet('wc:matchFilter', matchFilter);
        renderShell();
      }
      if (e.target.id === 'adminFilter') {
        adminFilter = e.target.value;
        lsSet('wc:adminFilter', adminFilter);
        renderShell();
      }
    });
  }

  // ── Quick pick ──────────────────────────────────────────────────────────────
  function applyQuickPick(matchId, pick) {
    const h = document.getElementById(`pred-home-${matchId}`);
    const a = document.getElementById(`pred-away-${matchId}`);
    if (!h || !a) return;
    const hv = Number(h.value) || 0, av = Number(a.value) || 0;
    if (pick === '1')      { h.value = Math.max(hv, av + 1) || 1; a.value = Math.max(0, av); if (h.value <= a.value) a.value = Number(h.value) - 1; }
    else if (pick === 'X') { h.value = hv || 1; a.value = h.value; }
    else                   { a.value = Math.max(av, hv + 1) || 1; h.value = Math.max(0, hv); if (a.value <= h.value) h.value = Number(a.value) - 1; }
    // clamp
    h.value = Math.max(0, Number(h.value));
    a.value = Math.max(0, Number(a.value));
    // highlight
    document.querySelectorAll(`[data-match-id="${matchId}"][data-pick]`).forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-match-id="${matchId}"][data-pick="${pick}"]`)?.classList.add('active');
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  async function handleJoin() {
    const name     = v('joinName');
    const password = v('joinPassword');
    const invite   = v('joinInvite');
    if (!name)                     return showToast('Podaj nazwę gracza.', 'error');
    if (password.length < 4)       return showToast('Hasło musi mieć min. 4 znaki.', 'error');
    if (invite) { inviteCode = invite; lsSet(inviteKey(), invite); }

    await run(async () => {
      const res = await api('join', { name, password, inviteCode });
      currentPlayer = res.player;
      lsSet(playerKey(), JSON.stringify(currentPlayer));
      showToast(`Witaj, ${currentPlayer.name}! 🎉`, 'ok');
      await loadState(true);
    });
  }

  async function handleRecover() {
    const name     = v('recoverName');
    const password = v('recoverPassword');
    if (!name)     return showToast('Podaj nazwę gracza.', 'error');
    if (!password) return showToast('Podaj hasło.', 'error');

    await run(async () => {
      const res = await api('recover', { name, password });
      currentPlayer = res.player;
      lsSet(playerKey(), JSON.stringify(currentPlayer));
      showToast(`Witaj z powrotem, ${currentPlayer.name}!`, 'ok');
      await loadState(true);
    });
  }

  // ── Render shell ────────────────────────────────────────────────────────────
  function renderShell() {
    renderHero();
    app.innerHTML = [
      currentPlayer ? renderPlayerCard() : renderAuthCard(),
      renderTabs(),
      renderActiveTab(),
    ].join('');
    tickCountdowns();
  }

  function renderHero() {
    const next      = MATCHES.find(m => !isLocked(m));
    const completed = appState.results.length;
    heroStatus.innerHTML = `
      <div class="status-grid">
        <div class="status-row">
          <span class="status-label">Grupa</span>
          <span class="status-value">${esc(groupCode)}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Gracze</span>
          <span class="status-value">${appState.players.length}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Wpisane wyniki</span>
          <span class="status-value">${completed} / ${MATCHES.length}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Następny mecz</span>
          <span class="status-value">${next ? fmtDate(next.kickoffUtc, true) : '—'}</span>
        </div>
        <div class="status-row">
          <span class="status-label">Tryb</span>
          <span class="status-value">${API_URL ? '🟢 live' : '🟡 demo'}</span>
        </div>
      </div>`;
  }

  // ── Auth card ───────────────────────────────────────────────────────────────
  function renderAuthCard() {
    if (joinMode === 'recover') return `
      <section class="panel auth-card">
        <div class="auth-info">
          <h2>Wróć na swoje konto</h2>
          <p>Wpisz swoją nazwę i hasło, żeby zalogować się z nowego urządzenia.</p>
        </div>
        <form id="recoverForm" class="form-grid">
          <div class="form-row">
            <label for="recoverName">Twoja nazwa</label>
            <input id="recoverName" maxlength="36" autocomplete="nickname" placeholder="np. Bartek" />
          </div>
          <div class="form-row">
            <label for="recoverPassword">Hasło</label>
            <input id="recoverPassword" type="password" autocomplete="current-password" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary" type="submit">Zaloguj się</button>
          <button class="btn btn-ghost" type="button" data-action="toggle-mode">← Rejestracja nowego gracza</button>
        </form>
      </section>`;

    return `
      <section class="panel auth-card">
        <div class="auth-info">
          <h2>Dołącz do typowania</h2>
          <p>Ustaw nick i hasło (do odzyskania konta na innym urządzeniu), wklej kod zaproszenia od admina.</p>
          <div class="invite-hint">
            Link zaproszenia: <code>?g=${esc(groupCode)}&amp;i=KOD</code>
          </div>
        </div>
        <form id="joinForm" class="form-grid">
          <div class="form-row">
            <label for="joinName">Twoja nazwa</label>
            <input id="joinName" maxlength="36" autocomplete="nickname" placeholder="np. Bartek" />
          </div>
          <div class="form-row">
            <label for="joinPassword">Hasło (do odzyskania konta)</label>
            <input id="joinPassword" type="password" autocomplete="new-password" placeholder="min. 4 znaki" />
          </div>
          <div class="form-row">
            <label for="joinInvite">Kod zaproszenia</label>
            <input id="joinInvite" value="${escA(inviteCode)}" placeholder="wklej kod z linku od admina" />
          </div>
          <button class="btn btn-primary" type="submit">Dołącz do gry</button>
          <button class="btn btn-ghost" type="button" data-action="toggle-mode">Masz już konto? Zaloguj się →</button>
        </form>
      </section>`;
  }

  // ── Player card ─────────────────────────────────────────────────────────────
  function renderPlayerCard() {
    const lb   = computeLeaderboard();
    const rank = lb.findIndex(r => r.id === String(currentPlayer.id)) + 1;
    const row  = lb.find(r => r.id === String(currentPlayer.id));
    return `
      <section class="panel player-card">
        <div class="player-info">
          <div class="player-avatar">${esc(currentPlayer.name[0]?.toUpperCase() || '?')}</div>
          <div>
            <div class="player-name">${esc(currentPlayer.name)}</div>
            <div class="player-meta">${row ? `${rank}. miejsce · ${row.points} pkt · ${row.exact} dokładnych` : 'Brak typów'}</div>
          </div>
        </div>
        <div class="player-actions">
          <button class="btn btn-soft"   type="button" data-action="copy-link">Kopiuj link zaproszenia</button>
          <button class="btn"            type="button" data-action="refresh">Odśwież</button>
          <button class="btn btn-danger" type="button" data-action="logout">Zmień urządzenie</button>
        </div>
      </section>`;
  }

  // ── Tabs ────────────────────────────────────────────────────────────────────
  function renderTabs() {
    const tabs = [['matches','⚽ Mecze'],['leaderboard','🏆 Tabela'],['admin','🔧 Admin'],['rules','ℹ️ Zasady']];
    return `
      <nav class="panel tabs" aria-label="Zakładki aplikacji">
        ${tabs.map(([id, label]) =>
          `<button type="button" class="tab${activeTab === id ? ' active' : ''}" data-tab="${id}">${label}</button>`
        ).join('')}
      </nav>`;
  }

  function renderActiveTab() {
    if (activeTab === 'leaderboard') return renderLeaderboard();
    if (activeTab === 'admin')       return renderAdmin();
    if (activeTab === 'rules')       return renderRules();
    return renderMatches();
  }

  // ── Matches ─────────────────────────────────────────────────────────────────
  function renderMatches() {
    const filtered = filterMatches(MATCHES, matchFilter);
    return `
      <section class="panel toolbar">
        <div>
          <h2>Terminarz i obstawianie</h2>
          <p>Godziny w strefie Europe/Warsaw. Typ możesz zmienić do pierwszego gwizdka.</p>
        </div>
        <div class="form-row">
          <label for="matchFilter">Widok</label>
          <select id="matchFilter">
            ${opt('open',     'Do obstawienia',   matchFilter)}
            ${opt('group',    'Faza grupowa',      matchFilter)}
            ${opt('knockout', 'Faza pucharowa',    matchFilter)}
            ${opt('finished', 'Z wpisanym wynikiem', matchFilter)}
            ${opt('all',      'Wszystkie mecze',   matchFilter)}
          </select>
        </div>
        <button class="btn" type="button" data-action="refresh">Odśwież</button>
      </section>
      <section class="match-list" aria-label="Lista meczów">
        ${filtered.length
          ? filtered.map(renderMatchCard).join('')
          : '<div class="panel empty">Brak meczów w tym widoku.</div>'}
      </section>`;
  }

  function renderMatchCard(match) {
    const maps   = getMaps();
    const result = maps.results.get(String(match.id));
    const locked = isLocked(match);
    const myPred = currentPlayer ? maps.predictions.get(predKey(currentPlayer.id, match.id)) : null;
    const myPts  = myPred && result ? score(myPred, result) : null;
    const disabled = !currentPlayer || locked || loading;
    const kickMs = new Date(match.kickoffUtc).getTime();
    const reveal = locked || Boolean(result);
    const preds  = appState.predictions.filter(p => String(p.matchId) === String(match.id));
    const hFlag  = FLAGS[match.home] || '';
    const aFlag  = FLAGS[match.away] || '';

    // Current 1X2 pick from saved prediction
    let curPick = '';
    if (myPred) {
      const d = myPred.homeGoals - myPred.awayGoals;
      curPick = d > 0 ? '1' : d < 0 ? '2' : 'X';
    }

    return `
      <article class="match-card${locked ? ' is-locked' : ''}${result ? ' has-result' : ''}" id="match-${match.id}">

        <div class="match-header">
          <div class="match-meta-row">
            <span class="match-stage">${esc(match.stage)}</span>
            <span class="match-venue">📍 ${esc(match.venue)}</span>
          </div>
          <div class="match-time-row">
            <span class="match-kickoff">${fmtDate(match.kickoffUtc)}</span>
            ${!locked && !result
              ? `<span class="countdown" data-cd="${kickMs}">…</span>`
              : locked && !result
                ? `<span class="badge badge-warn">zablokowany</span>`
                : ''}
            ${result ? `<span class="badge badge-ok">✓ wynik</span>` : ''}
          </div>
        </div>

        <div class="match-main">
          <div class="team home">
            <span class="team-flag" aria-hidden="true">${hFlag}</span>
            <span class="team-name">${esc(match.home)}</span>
          </div>
          <div class="match-score-area">
            ${result
              ? `<div class="result-score">${result.homeGoals}<span class="colon">:</span>${result.awayGoals}</div>`
              : `<div class="vs-text">vs</div>`}
          </div>
          <div class="team away">
            <span class="team-name">${esc(match.away)}</span>
            <span class="team-flag" aria-hidden="true">${aFlag}</span>
          </div>
        </div>

        <div class="bet-section">
          <div>
            <span class="bet-label">Twój typ</span>
            <div class="quickpick-row">
              ${['1','X','2'].map(p => `
                <button type="button" class="btn-pick${curPick === p ? ' active' : ''}"
                  data-action="quickpick" data-match-id="${match.id}" data-pick="${p}"
                  ${disabled ? 'disabled' : ''}>${p}</button>
              `).join('')}
            </div>
            <div class="score-inputs">
              <input id="pred-home-${match.id}" type="number" min="0" max="30" inputmode="numeric"
                value="${myPred != null ? myPred.homeGoals : ''}" ${disabled ? 'disabled' : ''}
                aria-label="Bramki ${esc(match.home)}" />
              <span class="score-sep">:</span>
              <input id="pred-away-${match.id}" type="number" min="0" max="30" inputmode="numeric"
                value="${myPred != null ? myPred.awayGoals : ''}" ${disabled ? 'disabled' : ''}
                aria-label="Bramki ${esc(match.away)}" />
              ${myPts !== null ? `<span class="points-chip">${myPts} pkt</span>` : ''}
            </div>
            <div class="bet-hint">${
              !currentPlayer   ? 'Dołącz do gry, żeby obstawiać.' :
              locked           ? 'Typ zablokowany — mecz się rozpoczął.' :
              myPred != null   ? 'Typ zapisany. Możesz go zmienić do startu.' :
                                 'Wpisz wynik i kliknij Zapisz.'
            }</div>
          </div>
          <button class="btn btn-primary" type="button"
            data-action="save-prediction" data-match-id="${match.id}"
            ${disabled ? 'disabled' : ''}>Zapisz</button>
        </div>

        ${reveal
          ? renderPredStrip(preds, result, maps.players)
          : '<div class="preds-hidden">Typy innych pokażą się po rozpoczęciu meczu.</div>'}
      </article>`;
  }

  function renderPredStrip(preds, result, players) {
    if (!preds.length) return '<div class="preds-hidden">Brak typów dla tego meczu.</div>';
    const sorted = preds.slice().sort((a, b) =>
      (players.get(String(a.playerId))?.name || '').localeCompare(
        players.get(String(b.playerId))?.name || '', 'pl'));
    return `
      <div class="prediction-strip">
        ${sorted.map(p => {
          const player = players.get(String(p.playerId));
          const pts    = result ? score(p, result) : null;
          const cls    = pts === null ? '' : pts === POINTS.exact ? ' exact' : pts > 0 ? ' outcome' : ' miss';
          return `<span class="pred-chip${cls}">
            <strong>${esc(player?.name || '?')}</strong>
            ${p.homeGoals}:${p.awayGoals}
            ${pts !== null ? `<span class="pred-pts">${pts}p</span>` : ''}
          </span>`;
        }).join('')}
      </div>`;
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  function renderLeaderboard() {
    const rows   = computeLeaderboard();
    const maxPts = rows[0]?.points || 1;
    const medals = ['🥇','🥈','🥉'];
    return `
      <section class="panel section-title">
        <h2>Tabela grupy</h2>
        <p>${POINTS.exact} pkt za dokładny wynik · ${POINTS.outcome} pkt za poprawny rezultat 1/X/2</p>
      </section>
      <section class="panel leaderboard-wrap">
        ${rows.length ? `
          <div class="leaderboard" role="list">
            ${rows.map((row, i) => `
              <div class="lb-row${String(row.id) === String(currentPlayer?.id) ? ' lb-me' : ''}" role="listitem">
                <div class="lb-rank">${medals[i] ?? `${i+1}.`}</div>
                <div class="lb-avatar" aria-hidden="true">${esc(row.name[0]?.toUpperCase() || '?')}</div>
                <div class="lb-info">
                  <div class="lb-name">${esc(row.name)}</div>
                  <div class="lb-bar-wrap">
                    <div class="lb-bar" style="width:${maxPts ? Math.round(row.points / maxPts * 100) : 0}%"></div>
                  </div>
                </div>
                <div class="lb-stats">
                  <div class="lb-pts">${row.points}</div>
                  <div class="lb-sub">${row.exact}✓ &nbsp;${row.outcome}½ &nbsp;${row.predictions}⚽</div>
                </div>
              </div>`).join('')}
          </div>`
        : '<div class="empty">Jeszcze nikt nie dołączył.</div>'}
      </section>`;
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  function renderAdmin() {
    const maps     = getMaps();
    const invites  = readJson(lsGet(invitesKey()), []);
    const filtered = MATCHES.filter(m => {
      const has = maps.results.has(String(m.id));
      if (adminFilter === 'needs-result') return !has && isLocked(m);
      if (adminFilter === 'with-result')  return has;
      return true;
    });

    return `
      <section class="panel admin-section">
        <h2>Kody zaproszenia</h2>
        <p>Wygeneruj unikalny link dla każdego znajomego. Gracz wkleja link i rejestruje swoje konto.</p>
        <div class="invite-gen-row">
          <div class="form-row">
            <label for="newInviteName">Opis / imię gracza (opcjonalnie)</label>
            <input id="newInviteName" placeholder="np. Bartek" maxlength="36" />
          </div>
          <div class="form-row">
            <label for="inviteAdminPin">PIN admina</label>
            <input id="inviteAdminPin" type="password" placeholder="PIN" autocomplete="current-password" />
          </div>
          <button class="btn btn-green" type="button" data-action="generate-invite">Generuj kod</button>
        </div>
        ${invites.length ? `
          <div class="invites-list">
            ${invites.map(inv => `
              <div class="invite-row">
                <div class="invite-info">
                  <strong>${esc(inv.label || 'Bez opisu')}</strong>
                  <code>${esc(inv.code)}</code>
                </div>
                <button class="btn btn-soft" type="button" data-action="copy-invite" data-code="${escA(inv.code)}">Kopiuj link</button>
              </div>`).join('')}
          </div>` : ''}
      </section>

      <section class="panel toolbar">
        <div>
          <h2>Wpisz wyniki meczów</h2>
          <p>Po zapisaniu tabela przelicza się natychmiast. PIN sprawdzany przez backend.</p>
        </div>
        <div class="form-row">
          <label for="adminFilter">Widok</label>
          <select id="adminFilter">
            ${opt('needs-result', 'Zablokowane bez wyniku', adminFilter)}
            ${opt('with-result',  'Z wpisanym wynikiem',   adminFilter)}
            ${opt('all',          'Wszystkie mecze',        adminFilter)}
          </select>
        </div>
        <div class="form-row">
          <label for="adminPin">PIN admina</label>
          <input id="adminPin" type="password" autocomplete="current-password" placeholder="PIN" />
        </div>
      </section>

      <section class="admin-grid" aria-label="Lista meczów do wpisania wyników">
        ${filtered.length
          ? filtered.map(m => renderAdminMatch(m, maps.results.get(String(m.id)))).join('')
          : '<div class="panel empty">Brak meczów w tym widoku.</div>'}
      </section>`;
  }

  function renderAdminMatch(match, result) {
    const hf = FLAGS[match.home] || '';
    const af = FLAGS[match.away] || '';
    return `
      <div class="admin-match">
        <div>
          <div class="admin-match-title">${hf} ${esc(match.home)} – ${esc(match.away)} ${af}</div>
          <div class="admin-match-meta">${esc(match.stage)} · ${fmtDate(match.kickoffUtc)}</div>
        </div>
        <div class="score-inputs">
          <input id="result-home-${match.id}" type="number" min="0" max="30" inputmode="numeric"
            value="${result != null ? result.homeGoals : ''}" aria-label="Wynik ${esc(match.home)}" />
          <span class="score-sep">:</span>
          <input id="result-away-${match.id}" type="number" min="0" max="30" inputmode="numeric"
            value="${result != null ? result.awayGoals : ''}" aria-label="Wynik ${esc(match.away)}" />
        </div>
        <button class="btn btn-primary" type="button" data-action="save-result" data-match-id="${match.id}">Zapisz</button>
      </div>`;
  }

  // ── Rules ────────────────────────────────────────────────────────────────────
  function renderRules() {
    return `
      <section class="cards-grid">
        <article class="info-card">
          <h3>⚽ Punktacja</h3>
          <ul>
            <li><strong>${POINTS.exact} pkt</strong> za dokładny wynik (np. 2:1 = 2:1)</li>
            <li><strong>${POINTS.outcome} pkt</strong> za poprawny rezultat 1/X/2</li>
            <li><strong>0 pkt</strong> za chybiony rezultat</li>
          </ul>
        </article>
        <article class="info-card">
          <h3>🔒 Blokada typów</h3>
          <p>Typy zamykają się automatycznie przy kickoffie. Przy meczach jednoczesnych oba blokują się razem. Zmiana możliwa do startu.</p>
        </article>
        <article class="info-card">
          <h3>🔗 Zaproszenia</h3>
          <p>Admin generuje unikalne kody w zakładce Admin. Każdy gracz dostaje swój link <code>?g=${esc(groupCode)}&amp;i=KOD</code> i zakłada konto z hasłem.</p>
        </article>
        <article class="info-card">
          <h3>🌐 Hosting live</h3>
          <p>Ustaw <code>API_URL</code> w <code>config.js</code> na adres Google Apps Script Web App. PIN admina trzymaj tylko w Script Properties — nie w kodzie.</p>
        </article>
      </section>`;
  }

  // ── Data / API ───────────────────────────────────────────────────────────────
  async function loadState(silent) {
    await run(async () => {
      const payload = currentPlayer
        ? { playerId: currentPlayer.id, playerToken: currentPlayer.token }
        : {};
      const res  = await api('state', payload);
      appState   = normalize(res.state || res);
      renderShell();
    }, silent);
  }

  async function savePrediction(matchId) {
    if (!currentPlayer) return showToast('Najpierw dołącz do gry.', 'error');
    const match = BY_ID.get(String(matchId));
    if (!match) return showToast('Nie znaleziono meczu.', 'error');
    if (isLocked(match)) return showToast('Ten mecz jest już zablokowany.', 'error');
    let hg, ag;
    try { hg = readScore(`pred-home-${matchId}`); ag = readScore(`pred-away-${matchId}`); }
    catch (e) { return showToast(e.message, 'error'); }
    await run(async () => {
      await api('savePrediction', {
        playerId: currentPlayer.id, playerToken: currentPlayer.token,
        matchId: Number(matchId), homeGoals: hg, awayGoals: ag,
      });
      showToast('Typ zapisany ✓', 'ok');
      await loadState(true);
    });
  }

  async function saveResult(matchId) {
    let hg, ag;
    try { hg = readScore(`result-home-${matchId}`); ag = readScore(`result-away-${matchId}`); }
    catch (e) { return showToast(e.message, 'error'); }
    const pin = document.getElementById('adminPin')?.value || '';
    if (!pin) return showToast('Podaj PIN admina.', 'error');
    await run(async () => {
      await api('saveResult', { adminPin: pin, matchId: Number(matchId), homeGoals: hg, awayGoals: ag });
      showToast('Wynik zapisany ✓', 'ok');
      await loadState(true);
    });
  }

  async function generateInvite() {
    const label = document.getElementById('newInviteName')?.value.trim() || '';
    const pin   = document.getElementById('inviteAdminPin')?.value || '';
    if (!pin) return showToast('Podaj PIN admina.', 'error');
    await run(async () => {
      const res     = await api('generateInvite', { adminPin: pin, label });
      const invites = readJson(lsGet(invitesKey()), []);
      invites.unshift({ code: res.code, label, createdAt: new Date().toISOString() });
      lsSet(invitesKey(), JSON.stringify(invites));
      showToast(`Kod: ${res.code}`, 'ok');
      renderShell();
    });
  }

  async function run(fn, silent = false) {
    try {
      loading = true;
      await fn();
    } catch (e) {
      console.error(e);
      if (!silent) showToast(e.message || 'Wystąpił błąd.', 'error');
    } finally {
      loading = false;
    }
  }

  async function api(action, payload = {}) {
    if (!API_URL) return localApi(action, payload);
    const body = Object.assign({ action, group: groupCode, inviteCode }, payload);
    const res  = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Błąd backendu.');
    return data;
  }

  // ── Local demo API ──────────────────────────────────────────────────────────
  function localApi(action, payload) {
    const db  = readDb();
    const now = new Date().toISOString();

    if (action === 'state') return { ok: true, state: db };

    if (action === 'join') {
      const name = String(payload.name || '').trim().slice(0, 36);
      if (!name) throw new Error('Podaj nazwę gracza.');
      const pw = String(payload.password || '');
      if (pw.length < 4) throw new Error('Hasło musi mieć min. 4 znaki.');
      if (db.players.some(p => p.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl')))
        throw new Error('Ta nazwa jest już zajęta. Zaloguj się zamiast rejestrować.');
      const player = { id: uid(), token: uid() + uid(), name, createdAt: now };
      db.players.push({ id: player.id, name: player.name, createdAt: player.createdAt });
      writeDb(db);
      return { ok: true, player };
    }

    if (action === 'recover') {
      const name = String(payload.name || '').trim();
      const p    = db.players.find(p => p.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'));
      if (!p) throw new Error('Nie znaleziono gracza o tej nazwie. Sprawdź pisownię.');
      // In demo mode there's no server to verify the password — treat as trusted device
      const player = { id: p.id, token: uid() + uid(), name: p.name, createdAt: p.createdAt };
      return { ok: true, player };
    }

    if (action === 'savePrediction') {
      const match = BY_ID.get(String(payload.matchId));
      if (!match) throw new Error('Nie znaleziono meczu.');
      if (isLocked(match)) throw new Error('Typ jest zablokowany po kickoffie.');
      if (!db.players.find(p => String(p.id) === String(payload.playerId)))
        throw new Error('Nie znaleziono gracza.');
      const hg  = valScore(payload.homeGoals), ag = valScore(payload.awayGoals);
      const row = { playerId: payload.playerId, matchId: Number(payload.matchId), homeGoals: hg, awayGoals: ag, updatedAt: now };
      const idx = db.predictions.findIndex(p =>
        String(p.playerId) === String(payload.playerId) && String(p.matchId) === String(payload.matchId));
      if (idx >= 0) db.predictions[idx] = row; else db.predictions.push(row);
      writeDb(db);
      return { ok: true };
    }

    if (action === 'saveResult') {
      const demoPin = String(CONFIG.DEMO_ADMIN_PIN || 'admin');
      if (String(payload.adminPin || '') !== demoPin)
        throw new Error(`Nieprawidłowy PIN. Demo PIN: "${demoPin}"`);
      const hg  = valScore(payload.homeGoals), ag = valScore(payload.awayGoals);
      const row = { matchId: Number(payload.matchId), homeGoals: hg, awayGoals: ag, updatedAt: now };
      const idx = db.results.findIndex(r => String(r.matchId) === String(payload.matchId));
      if (idx >= 0) db.results[idx] = row; else db.results.push(row);
      writeDb(db);
      return { ok: true };
    }

    if (action === 'generateInvite') {
      const demoPin = String(CONFIG.DEMO_ADMIN_PIN || 'admin');
      if (String(payload.adminPin || '') !== demoPin)
        throw new Error(`Nieprawidłowy PIN. Demo PIN: "${demoPin}"`);
      const code = (uid().split('-')[0] + uid().split('-')[0]).toUpperCase().slice(0, 12);
      return { ok: true, code };
    }

    throw new Error(`Nieznana akcja: ${action}`);
  }

  // ── Compute ──────────────────────────────────────────────────────────────────
  function computeLeaderboard() {
    const maps = getMaps();
    const rows = appState.players.map(p => ({
      id: String(p.id), name: p.name, points: 0, exact: 0, outcome: 0, predictions: 0,
    }));
    const byId = new Map(rows.map(r => [r.id, r]));
    for (const pred of appState.predictions) {
      const row = byId.get(String(pred.playerId));
      if (!row) continue;
      row.predictions++;
      const res = maps.results.get(String(pred.matchId));
      if (!res) continue;
      const s = score(pred, res);
      row.points += s;
      if (s === POINTS.exact) row.exact++;
      else if (s === POINTS.outcome) row.outcome++;
    }
    return rows.sort((a, b) =>
      b.points - a.points || b.exact - a.exact || b.outcome - a.outcome ||
      a.name.localeCompare(b.name, 'pl'));
  }

  function score(pred, result) {
    const [ph, pa, rh, ra] = [pred.homeGoals, pred.awayGoals, result.homeGoals, result.awayGoals].map(Number);
    if (ph === rh && pa === ra) return POINTS.exact;
    if (Math.sign(ph - pa) === Math.sign(rh - ra)) return POINTS.outcome;
    return 0;
  }

  function getMaps() {
    return {
      players:     new Map(appState.players.map(p => [String(p.id), p])),
      predictions: new Map(appState.predictions.map(p => [predKey(p.playerId, p.matchId), p])),
      results:     new Map(appState.results.map(r => [String(r.matchId), r])),
    };
  }

  function filterMatches(matches, filter) {
    const maps = getMaps();
    if (filter === 'all')      return matches;
    if (filter === 'group')    return matches.filter(m => Boolean(m.group));
    if (filter === 'knockout') return matches.filter(m => !m.group);
    if (filter === 'finished') return matches.filter(m => maps.results.has(String(m.id)));
    return matches.filter(m => !isLocked(m));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function normalize(state) {
    return {
      players:     Array.isArray(state.players)     ? state.players : [],
      predictions: Array.isArray(state.predictions) ? state.predictions.map(nr) : [],
      results:     Array.isArray(state.results)     ? state.results.map(nr) : [],
    };
  }
  function nr(row) {
    return Object.assign({}, row, {
      matchId: Number(row.matchId), homeGoals: Number(row.homeGoals), awayGoals: Number(row.awayGoals),
    });
  }

  function isLocked(match) { return Date.now() >= new Date(match.kickoffUtc).getTime(); }

  function fmtDate(iso, short = false) {
    return new Intl.DateTimeFormat('pl-PL', {
      ...(short ? {} : { weekday: 'short' }),
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: TZ,
    }).format(new Date(iso));
  }

  function readScore(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error('Nie znaleziono pola wyniku.');
    return valScore(el.value);
  }

  function valScore(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 30) throw new Error('Wynik musi być liczbą całkowitą 0–30.');
    return n;
  }

  function opt(value, label, current) {
    return `<option value="${escA(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
  }

  async function copyInviteLink() {
    await copyText(buildInviteUrl(inviteCode));
    showToast('Link skopiowany.', 'ok');
  }

  function buildInviteUrl(code) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('g', groupCode);
    if (code) url.searchParams.set('i', code);
    return url.toString();
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { showToast(text, 'ok'); }
  }

  function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3500);
  }

  function readDb() {
    return readJson(lsGet(dbKey()), { players: [], predictions: [], results: [] });
  }
  function writeDb(db) {
    lsSet(dbKey(), JSON.stringify(normalize(db)));
  }

  function dbKey()      { return `wc:db:${groupCode}`; }
  function playerKey()  { return `wc:player:${groupCode}`; }
  function inviteKey()  { return `wc:invite:${groupCode}`; }
  function invitesKey() { return `wc:invites:${groupCode}`; }
  function predKey(pid, mid) { return `${pid}:${mid}`; }

  function lsGet(key)       { return localStorage.getItem(key); }
  function lsSet(key, val)  { localStorage.setItem(key, val); }

  function readJson(v, fb) { try { return v ? JSON.parse(v) : fb; } catch { return fb; } }

  function uid() {
    return window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function sanitizeCode(v) {
    return String(v || 'mundial2026').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'mundial2026';
  }

  function esc(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
  function escA(v) { return esc(v); }
  function v(id)   { return document.getElementById(id)?.value?.trim() ?? ''; }
})();
