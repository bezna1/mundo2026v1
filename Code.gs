// Mundial Typer v2 — backend Google Apps Script
//
// Instrukcja wdrożenia:
//   1. Otwórz Google Sheet → Extensions → Apps Script → wklej ten plik
//   2. Uruchom setup() raz (tworzy arkusze i ustawia domyślne właściwości)
//   3. W Project Settings → Script Properties ustaw:
//        GROUP_CODE   — dowolny identyfikator grupy (np. mundial2026)
//        INVITE_CODE  — (opcjonalny) globalny kod dostępu zamiast indywidualnych
//        ADMIN_PIN    — PIN do wpisywania wyników i generowania kodów
//        FOOTBALL_DATA_KEY — klucz API z football-data.org (do auto-wyników)
//   4. Wdróż jako Web App: Execute as "Me", Who has access "Anyone"
//   5. Skopiuj URL Web App do config.js → API_URL

const SHEETS = {
  PLAYERS:     'Players',
  PREDICTIONS: 'Predictions',
  RESULTS:     'Results',
  INVITES:     'Invites',
};

const HEADERS = {
  Players:     ['group', 'playerId', 'playerTokenHash', 'passwordHash', 'name', 'createdAt'],
  Predictions: ['group', 'playerId', 'matchId', 'homeGoals', 'awayGoals', 'updatedAt'],
  Results:     ['group', 'matchId', 'homeGoals', 'awayGoals', 'updatedAt', 'source'],
  Invites:     ['group', 'code', 'label', 'createdAt', 'usedBy'],
};

// Czas kickoffu (UTC) dla każdego meczu — używany do blokady typów po stronie backendu.
const KICKOFFS = {
  "1":"2026-06-11T19:00:00Z","2":"2026-06-12T02:00:00Z","3":"2026-06-12T19:00:00Z",
  "4":"2026-06-13T01:00:00Z","5":"2026-06-13T19:00:00Z","6":"2026-06-13T22:00:00Z",
  "7":"2026-06-14T01:00:00Z","8":"2026-06-14T04:00:00Z","9":"2026-06-14T17:00:00Z",
  "10":"2026-06-14T20:00:00Z","11":"2026-06-14T23:00:00Z","12":"2026-06-15T02:00:00Z",
  "13":"2026-06-15T16:00:00Z","14":"2026-06-15T19:00:00Z","15":"2026-06-15T22:00:00Z",
  "16":"2026-06-16T01:00:00Z","17":"2026-06-16T19:00:00Z","18":"2026-06-16T22:00:00Z",
  "19":"2026-06-17T01:00:00Z","20":"2026-06-17T04:00:00Z","21":"2026-06-17T17:00:00Z",
  "22":"2026-06-17T20:00:00Z","23":"2026-06-17T23:00:00Z","24":"2026-06-18T02:00:00Z",
  "25":"2026-06-18T16:00:00Z","26":"2026-06-18T19:00:00Z","27":"2026-06-18T22:00:00Z",
  "28":"2026-06-19T01:00:00Z","29":"2026-06-19T19:00:00Z","30":"2026-06-19T22:00:00Z",
  "31":"2026-06-20T00:30:00Z","32":"2026-06-20T03:00:00Z","33":"2026-06-20T17:00:00Z",
  "34":"2026-06-20T20:00:00Z","35":"2026-06-21T00:00:00Z","36":"2026-06-21T04:00:00Z",
  "37":"2026-06-21T16:00:00Z","38":"2026-06-21T19:00:00Z","39":"2026-06-21T22:00:00Z",
  "40":"2026-06-22T01:00:00Z","41":"2026-06-22T17:00:00Z","42":"2026-06-22T21:00:00Z",
  "43":"2026-06-23T00:00:00Z","44":"2026-06-23T03:00:00Z","45":"2026-06-23T17:00:00Z",
  "46":"2026-06-23T20:00:00Z","47":"2026-06-23T23:00:00Z","48":"2026-06-24T02:00:00Z",
  "49":"2026-06-24T19:00:00Z","50":"2026-06-24T19:00:00Z","51":"2026-06-24T22:00:00Z",
  "52":"2026-06-24T22:00:00Z","53":"2026-06-25T01:00:00Z","54":"2026-06-25T01:00:00Z",
  "55":"2026-06-25T20:00:00Z","56":"2026-06-25T20:00:00Z","57":"2026-06-25T23:00:00Z",
  "58":"2026-06-25T23:00:00Z","59":"2026-06-26T02:00:00Z","60":"2026-06-26T02:00:00Z",
  "61":"2026-06-26T19:00:00Z","62":"2026-06-26T19:00:00Z","63":"2026-06-27T00:00:00Z",
  "64":"2026-06-27T00:00:00Z","65":"2026-06-27T03:00:00Z","66":"2026-06-27T03:00:00Z",
  "67":"2026-06-27T21:00:00Z","68":"2026-06-27T21:00:00Z","69":"2026-06-27T23:30:00Z",
  "70":"2026-06-27T23:30:00Z","71":"2026-06-28T02:00:00Z","72":"2026-06-28T02:00:00Z",
  "73":"2026-06-28T19:00:00Z","74":"2026-06-29T20:30:00Z","75":"2026-06-30T01:00:00Z",
  "76":"2026-06-29T17:00:00Z","77":"2026-06-30T21:00:00Z","78":"2026-06-30T17:00:00Z",
  "79":"2026-07-01T01:00:00Z","80":"2026-07-01T16:00:00Z","81":"2026-07-02T00:00:00Z",
  "82":"2026-07-01T20:00:00Z","83":"2026-07-02T23:00:00Z","84":"2026-07-02T19:00:00Z",
  "85":"2026-07-03T03:00:00Z","86":"2026-07-03T22:00:00Z","87":"2026-07-04T01:30:00Z",
  "88":"2026-07-03T18:00:00Z","89":"2026-07-04T21:00:00Z","90":"2026-07-04T17:00:00Z",
  "91":"2026-07-05T20:00:00Z","92":"2026-07-06T00:00:00Z","93":"2026-07-06T19:00:00Z",
  "94":"2026-07-07T00:00:00Z","95":"2026-07-07T16:00:00Z","96":"2026-07-07T20:00:00Z",
  "97":"2026-07-09T20:00:00Z","98":"2026-07-10T19:00:00Z","99":"2026-07-11T21:00:00Z",
  "100":"2026-07-12T01:00:00Z","101":"2026-07-14T19:00:00Z","102":"2026-07-15T19:00:00Z",
  "103":"2026-07-18T21:00:00Z","104":"2026-07-19T19:00:00Z"
};

// Zamknij typy X minut przed kickoffem (0 = dokładnie o starcie).
const LOCK_MINUTES_BEFORE = 0;

// ── Mapping EN→PL nazw drużyn (dla auto-wyników z football-data.org) ─────────
const TEAM_EN_TO_PL = {
  'Mexico':'Meksyk','South Africa':'RPA','South Korea':'Korea Płd.','Czech Republic':'Czechy',
  'Canada':'Kanada','Bosnia and Herzegovina':'Bośnia i Hercegowina','United States':'USA','Paraguay':'Paragwaj',
  'Qatar':'Katar','Switzerland':'Szwajcaria','Brazil':'Brazylia','Morocco':'Maroko',
  'Haiti':'Haiti','Scotland':'Szkocja','Australia':'Australia','Turkey':'Turcja',
  'Germany':'Niemcy','Curaçao':'Curaçao','Netherlands':'Holandia','Japan':'Japonia',
  "Côte d'Ivoire":'Wybrzeże Kości Słoniowej','Ecuador':'Ekwador','Sweden':'Szwecja','Tunisia':'Tunezja',
  'Spain':'Hiszpania','Cape Verde':'Republika Zielonego Przylądka','Belgium':'Belgia','Egypt':'Egipt',
  'Saudi Arabia':'Arabia Saudyjska','Uruguay':'Urugwaj','Iran':'Iran','New Zealand':'Nowa Zelandia',
  'France':'Francja','Senegal':'Senegal','Iraq':'Irak','Norway':'Norwegia',
  'Argentina':'Argentyna','Algeria':'Algieria','Austria':'Austria','Jordan':'Jordania',
  'Portugal':'Portugalia','DR Congo':'DR Konga','England':'Anglia','Croatia':'Chorwacja',
  'Ghana':'Ghana','Panama':'Panama','Uzbekistan':'Uzbekistan','Colombia':'Kolumbia',
};

// ── Setup ─────────────────────────────────────────────────────────────────────
function setup() {
  ensureSheet(SHEETS.PLAYERS,     HEADERS.Players);
  ensureSheet(SHEETS.PREDICTIONS, HEADERS.Predictions);
  ensureSheet(SHEETS.RESULTS,     HEADERS.Results);
  ensureSheet(SHEETS.INVITES,     HEADERS.Invites);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('GROUP_CODE'))          props.setProperty('GROUP_CODE',          'mundial2026');
  if (!props.getProperty('INVITE_CODE'))         props.setProperty('INVITE_CODE',         '');
  if (!props.getProperty('ADMIN_PIN'))           props.setProperty('ADMIN_PIN',           'zmien-ten-pin');
  if (!props.getProperty('FOOTBALL_DATA_KEY'))   props.setProperty('FOOTBALL_DATA_KEY',   '');

  return jsonOut({ ok: true, message: 'Setup OK. Zmień ADMIN_PIN i GROUP_CODE w Script Properties.' });
}

// ── HTTP handlers ─────────────────────────────────────────────────────────────
function doGet() {
  return jsonOut({ ok: true, message: 'Mundial Typer API v2 działa.' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    return jsonOut(handleAction(payload));
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
function handleAction(payload) {
  const action = String(payload.action || '');
  const group  = verifyAccess(payload);

  if (action === 'state')           return { ok: true, state: getState(group, payload) };
  if (action === 'join')            return { ok: true, player: joinGroup(group, payload) };
  if (action === 'recover')         return { ok: true, player: recoverSession(group, payload) };
  if (action === 'savePrediction')  return { ok: true, saved: savePrediction(group, payload) };
  if (action === 'saveResult')      return { ok: true, saved: saveResult(group, payload) };
  if (action === 'generateInvite')  return { ok: true, code: generateInvite(group, payload) };

  throw new Error('Nieznana akcja: ' + action);
}

// ── Access control ────────────────────────────────────────────────────────────
function verifyAccess(payload) {
  const props         = PropertiesService.getScriptProperties();
  const expectedGroup  = String(props.getProperty('GROUP_CODE') || 'mundial2026');
  const globalInvite   = String(props.getProperty('INVITE_CODE') || '');
  const group          = String(payload.group || '');
  const inviteCode     = String(payload.inviteCode || '');

  if (expectedGroup && group !== expectedGroup) throw new Error('Nieprawidłowa grupa.');

  // If a global invite is set, check it. If empty, validate via Invites sheet.
  if (globalInvite && inviteCode !== globalInvite) {
    // Fallback: check if it's a generated per-player invite
    if (!isValidInvite(expectedGroup, inviteCode)) {
      throw new Error('Nieprawidłowy kod zaproszenia.');
    }
  } else if (!globalInvite && inviteCode) {
    // Only per-player invites configured — verify against Invites sheet
    if (!isValidInvite(expectedGroup, inviteCode)) {
      throw new Error('Nieprawidłowy lub wygasły kod zaproszenia.');
    }
  }

  return expectedGroup || group;
}

function isValidInvite(group, code) {
  if (!code) return false;
  const invites = readRecords(SHEETS.INVITES, HEADERS.Invites);
  return invites.some(function(r) { return r.group === group && r.code === code; });
}

// ── State ─────────────────────────────────────────────────────────────────────
function getState(group, payload) {
  const players = readRecords(SHEETS.PLAYERS, HEADERS.Players)
    .filter(function(r) { return r.group === group; })
    .map(function(r) { return { id: r.playerId, name: r.name, createdAt: r.createdAt }; });

  var viewerId = '';
  if (payload.playerId && payload.playerToken) {
    try {
      var viewer = verifyPlayer(group, payload.playerId, payload.playerToken);
      viewerId = viewer.playerId;
    } catch (_) {}
  }

  const predictions = readRecords(SHEETS.PREDICTIONS, HEADERS.Predictions)
    .filter(function(r) { return r.group === group; })
    .filter(function(r) { return matchLocked(r.matchId) || r.playerId === viewerId; })
    .map(function(r) {
      return {
        playerId:  r.playerId,
        matchId:   Number(r.matchId),
        homeGoals: Number(r.homeGoals),
        awayGoals: Number(r.awayGoals),
        updatedAt: r.updatedAt,
      };
    });

  const results = readRecords(SHEETS.RESULTS, HEADERS.Results)
    .filter(function(r) { return r.group === group; })
    .map(function(r) {
      return {
        matchId:   Number(r.matchId),
        homeGoals: Number(r.homeGoals),
        awayGoals: Number(r.awayGoals),
        updatedAt: r.updatedAt,
      };
    });

  return { players: players, predictions: predictions, results: results };
}

// ── Join ──────────────────────────────────────────────────────────────────────
function joinGroup(group, payload) {
  const name = cleanName(payload.name);
  const pw   = String(payload.password || '');
  if (pw.length < 4) throw new Error('Hasło musi mieć co najmniej 4 znaki.');

  const players   = readRecords(SHEETS.PLAYERS, HEADERS.Players).filter(function(r) { return r.group === group; });
  const lowerName = name.toLocaleLowerCase();
  if (players.some(function(r) { return String(r.name || '').toLocaleLowerCase() === lowerName; })) {
    throw new Error('Ta nazwa jest już zajęta. Zaloguj się zamiast rejestrować.');
  }

  const playerId = Utilities.getUuid();
  const token    = generateToken();
  const now      = new Date().toISOString();

  appendRecord(SHEETS.PLAYERS, HEADERS.Players, {
    group: group, playerId: playerId,
    playerTokenHash: sha256(token),
    passwordHash:    sha256(pw),
    name: name, createdAt: now,
  });

  return { id: playerId, token: token, name: name, createdAt: now };
}

// ── Recover session (multi-device) ────────────────────────────────────────────
function recoverSession(group, payload) {
  const name = cleanName(payload.name);
  const pw   = String(payload.password || '');
  if (!pw) throw new Error('Podaj hasło.');

  const players = readRecords(SHEETS.PLAYERS, HEADERS.Players).filter(function(r) { return r.group === group; });
  const player  = players.find(function(r) { return String(r.name || '').toLocaleLowerCase() === name.toLocaleLowerCase(); });
  if (!player) throw new Error('Nie znaleziono gracza o tej nazwie.');

  const pwHash = sha256(pw);
  if (player.passwordHash !== pwHash) throw new Error('Nieprawidłowe hasło.');

  // Issue new token and update sheet
  const newToken = generateToken();
  upsertRecord(SHEETS.PLAYERS, HEADERS.Players,
    Object.assign({}, player, { playerTokenHash: sha256(newToken) }),
    function(r) { return r.group === group && r.playerId === player.playerId; }
  );

  return { id: player.playerId, token: newToken, name: player.name, createdAt: player.createdAt };
}

// ── Save prediction ───────────────────────────────────────────────────────────
function savePrediction(group, payload) {
  const player  = verifyPlayer(group, payload.playerId, payload.playerToken);
  const matchId = String(payload.matchId || '');
  if (!KICKOFFS[matchId]) throw new Error('Nieznany mecz: ' + matchId);
  if (matchLocked(matchId)) throw new Error('Typy dla tego meczu są zablokowane.');

  const row = {
    group: group, playerId: player.playerId, matchId: Number(matchId),
    homeGoals: validateScore(payload.homeGoals),
    awayGoals: validateScore(payload.awayGoals),
    updatedAt: new Date().toISOString(),
  };

  upsertRecord(SHEETS.PREDICTIONS, HEADERS.Predictions, row, function(r) {
    return r.group === group && r.playerId === player.playerId && String(r.matchId) === matchId;
  });
  return true;
}

// ── Save result ───────────────────────────────────────────────────────────────
function saveResult(group, payload) {
  verifyAdmin(payload.adminPin);
  const matchId = String(payload.matchId || '');
  if (!KICKOFFS[matchId]) throw new Error('Nieznany mecz: ' + matchId);

  const row = {
    group: group, matchId: Number(matchId),
    homeGoals: validateScore(payload.homeGoals),
    awayGoals: validateScore(payload.awayGoals),
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };

  upsertRecord(SHEETS.RESULTS, HEADERS.Results, row, function(r) {
    return r.group === group && String(r.matchId) === matchId;
  });
  return true;
}

// ── Generate invite code ──────────────────────────────────────────────────────
function generateInvite(group, payload) {
  verifyAdmin(payload.adminPin);
  const code  = Utilities.getUuid().replace(/-/g,'').slice(0, 12).toUpperCase();
  const label = String(payload.label || '').trim().slice(0, 36);

  appendRecord(SHEETS.INVITES, HEADERS.Invites, {
    group: group, code: code, label: label,
    createdAt: new Date().toISOString(), usedBy: '',
  });
  return code;
}

// ── Auto-results (football-data.org) ─────────────────────────────────────────
// Uruchom setupAutoResultsTrigger() raz, żeby skonfigurować trigger co 30 min.
// Potrzebujesz darmowego klucza z https://www.football-data.org/
// Wpisz go w Script Properties → FOOTBALL_DATA_KEY.

function autoFetchResults() {
  const props   = PropertiesService.getScriptProperties();
  const apiKey  = props.getProperty('FOOTBALL_DATA_KEY');
  const group   = String(props.getProperty('GROUP_CODE') || 'mundial2026');

  if (!apiKey) {
    Logger.log('autoFetchResults: brak FOOTBALL_DATA_KEY — pomijam.');
    return;
  }

  try {
    // football-data.org competition code for WC 2026 — może wymagać aktualizacji po ogłoszeniu przez API
    const url = 'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED';
    const res  = UrlFetchApp.fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
      muteHttpExceptions: true,
    });

    if (res.getResponseCode() !== 200) {
      Logger.log('autoFetchResults: błąd API ' + res.getResponseCode());
      return;
    }

    const data    = JSON.parse(res.getContentText());
    const matches = (data.matches || []).filter(function(m) { return m.status === 'FINISHED'; });
    let saved = 0;

    matches.forEach(function(m) {
      const matchId = findMatchIdByTeams(m.homeTeam.name, m.awayTeam.name);
      if (!matchId) return;

      const hg = m.score.fullTime.home;
      const ag = m.score.fullTime.away;
      if (hg === null || ag === null) return;

      const row = {
        group: group, matchId: Number(matchId),
        homeGoals: Number(hg), awayGoals: Number(ag),
        updatedAt: new Date().toISOString(),
        source: 'auto',
      };

      upsertRecord(SHEETS.RESULTS, HEADERS.Results, row, function(r) {
        return r.group === group && String(r.matchId) === String(matchId) && r.source !== 'manual';
      });
      saved++;
    });

    Logger.log('autoFetchResults: zapisano ' + saved + ' wyników.');
  } catch (err) {
    Logger.log('autoFetchResults: wyjątek — ' + err.message);
  }
}

function findMatchIdByTeams(homeEn, awayEn) {
  const homePl = TEAM_EN_TO_PL[homeEn] || homeEn;
  const awayPl = TEAM_EN_TO_PL[awayEn] || awayEn;
  const results = readRecords(SHEETS.RESULTS, HEADERS.Results); // avoid re-reading for each match in real use

  // Search fixtures.js team names via KICKOFFS keys — match by looking at all records
  // (Simple approach: scan Predictions sheet for known team combos isn't ideal;
  //  better: embed team-per-matchId map here. For now return null if not found.)
  // TODO: extend this map if football-data.org uses different names than TEAM_EN_TO_PL.
  Logger.log('findMatchIdByTeams: ' + homePl + ' vs ' + awayPl);
  return null; // Wymaga konfiguracji mapowania matchId ↔ drużyny
}

function setupAutoResultsTrigger() {
  // Usuń istniejące triggery autoFetchResults żeby uniknąć duplikatów
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoFetchResults') ScriptApp.deleteTrigger(t);
  });
  // Trigger co 30 minut
  ScriptApp.newTrigger('autoFetchResults')
    .timeBased().everyMinutes(30).create();
  Logger.log('Trigger autoFetchResults skonfigurowany (co 30 min).');
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function verifyPlayer(group, playerId, playerToken) {
  const tokenHash = sha256(String(playerToken || ''));
  const players   = readRecords(SHEETS.PLAYERS, HEADERS.Players);
  const player    = players.find(function(r) {
    return r.group === group && r.playerId === String(playerId || '') && r.playerTokenHash === tokenHash;
  });
  if (!player) throw new Error('Nieautoryzowany. Dołącz ponownie lub zaloguj się.');
  return player;
}

function verifyAdmin(adminPin) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || '');
  if (!expected || expected === 'zmien-ten-pin') throw new Error('Ustaw ADMIN_PIN w Script Properties.');
  if (String(adminPin || '') !== expected) throw new Error('Nieprawidłowy PIN admina.');
}

function matchLocked(matchId) {
  const kickoff = KICKOFFS[String(matchId)];
  if (!kickoff) return false;
  return Date.now() >= new Date(kickoff).getTime() - LOCK_MINUTES_BEFORE * 60_000;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateScore(value) {
  var n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 30) throw new Error('Wynik musi być liczbą całkowitą 0–30.');
  return n;
}

function cleanName(value) {
  var name = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 36);
  if (!name) throw new Error('Podaj nazwę gracza.');
  return name;
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────
function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const cur = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some(function(h, i) { return cur[i] !== h; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
}

function readRecords(sheetName, headers) {
  ensureSheet(sheetName, headers);
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1)
    .filter(function(row) { return row.some(function(c) { return c !== '' && c !== null; }); })
    .map(function(row) {
      var record = {};
      headers.forEach(function(h, i) { record[h] = row[i] === undefined ? '' : row[i]; });
      return record;
    });
}

function appendRecord(sheetName, headers, record) {
  ensureSheet(sheetName, headers);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.appendRow(headers.map(function(h) { return record[h] === undefined ? '' : record[h]; }));
}

function upsertRecord(sheetName, headers, record, matcher) {
  ensureSheet(sheetName, headers);
  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var existing = {};
    headers.forEach(function(h, j) { existing[h] = values[i][j] === undefined ? '' : values[i][j]; });
    if (matcher(existing)) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues(
        [headers.map(function(h) { return record[h] === undefined ? '' : record[h]; })]
      );
      return;
    }
  }
  appendRecord(sheetName, headers, record);
}

// ── Crypto ────────────────────────────────────────────────────────────────────
function sha256(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function generateToken() {
  return Utilities.getUuid() + '.' + Utilities.getUuid() + '.' + Date.now();
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
