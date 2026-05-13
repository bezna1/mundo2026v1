window.APP_CONFIG = {
  // ── Podstawowe ─────────────────────────────────────────────────────────────
  APP_NAME: 'Mundial Typer',
  TOURNAMENT_NAME: 'MŚ 2026',

  // Wklej URL Web App z Google Apps Script. Puste = tryb demo (localStorage).
  API_URL: '',

  // Kod grupy — część URL: ?g=mundial2026
  DEFAULT_GROUP: 'mundial2026',

  // Domyślny kod zaproszenia (można też przekazywać przez URL: ?i=KOD).
  // Zostaw puste — admin generuje kody z zakładki Admin.
  DEFAULT_INVITE: '',

  // Strefa czasowa do wyświetlania godzin meczów.
  TIMEZONE: 'Europe/Warsaw',

  // ── Punktacja ──────────────────────────────────────────────────────────────
  POINTS: {
    exact: 3,    // dokładny wynik (np. typ 2:1, wynik 2:1)
    outcome: 1,  // poprawny rezultat 1/X/2 (np. typ 1:0, wynik 3:1)
  },

  // ── Tryb demo (lokalny, bez backendu) ──────────────────────────────────────
  // PIN admina wymagany do wpisywania wyników i generowania kodów zaproszeń.
  DEMO_ADMIN_PIN: 'admin',

  // ── Auto-wyniki (tylko tryb live, wymaga Apps Script) ─────────────────────
  // Klucz API z football-data.org (darmowe konto: 100 req/dzień — wystarczy).
  // Zostaw puste, jeśli admin wpisuje wyniki ręcznie.
  FOOTBALL_DATA_KEY: '',
};
