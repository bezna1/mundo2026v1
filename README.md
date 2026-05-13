# Mundial Typer

Prosta aplikacja do typowania wyników MŚ 2026 w grupie znajomych. Bez builda, bez Reacta, gotowa pod GitHub Pages.

## Co jest w paczce

- `index.html`, `styles.css`, `app.js` - frontend aplikacji.
- `fixtures.js` - terminarz 104 meczów MŚ 2026, godziny w UTC, wyświetlanie w `Europe/Warsaw`.
- `config.js` - konfiguracja frontendu.
- `Code.gs` - backend do Google Apps Script + Google Sheets.
- `.nojekyll` - żeby GitHub Pages nie przetwarzał plików przez Jekylla.

## Funkcje

- Dołączenie gracza przez nazwę i kod zaproszenia.
- Typowanie wyniku każdego meczu do pierwszego gwizdka.
- Ukrywanie typów innych osób do rozpoczęcia meczu, gdy działa backend Apps Script.
- Panel admina do wpisywania wyników.
- Automatyczna tabela punktów.
- Punktacja domyślna: 3 pkt za dokładny wynik, 1 pkt za poprawny rezultat 1/X/2.

## Szybki test lokalny

1. Otwórz `index.html` w przeglądarce.
2. Dołącz jako gracz.
3. Obstaw mecze.
4. W zakładce **Admin wyników** użyj PIN-u `admin`, wpisz wynik i sprawdź tabelę.

Tryb lokalny zapisuje dane tylko w jednej przeglądarce. Do wspólnej gry 20 osób potrzebujesz backendu poniżej.

## Backend Google Sheets / Apps Script

1. Utwórz nowy Google Sheet, np. `Mundial Typer 2026`.
2. Wejdź w **Extensions -> Apps Script**.
3. Wklej całą zawartość pliku `Code.gs`.
4. Uruchom funkcję `setup()` i zaakceptuj uprawnienia.
5. W Apps Script przejdź do **Project Settings -> Script Properties** i ustaw:
   - `GROUP_CODE` - np. `mundial2026`
   - `INVITE_CODE` - długi kod do linku, np. `ekipa-2026-9xAqP7`
   - `ADMIN_PIN` - PIN tylko dla osoby wpisującej wyniki
6. Kliknij **Deploy -> New deployment -> Web app**:
   - Execute as: `Me`
   - Who has access: `Anyone`
7. Skopiuj URL Web App i wklej go do `config.js` jako `API_URL`.

Przykład linku dla znajomych:

```text
https://twoj-login.github.io/mundial-typer/?g=mundial2026&i=ekipa-2026-9xAqP7
```

## Hosting na GitHub Pages

1. Utwórz repozytorium na GitHubie.
2. Wrzuć wszystkie pliki z tej paczki do głównego katalogu repo.
3. Wejdź w **Settings -> Pages**.
4. Source: `Deploy from a branch`, branch: `main`, folder: `/root`.
5. Po publikacji otwórz link z parametrami `g` oraz `i`.

## Ważne o prywatności

Zwykły GitHub Pages jest hostingiem statycznym. Prywatna publikacja GitHub Pages jest dostępna tylko w wybranych konfiguracjach GitHub Enterprise Cloud dla organizacji. Dlatego w praktyce dla grupy znajomych użyj:

- prywatnego repozytorium na kod,
- metatagu `noindex` już dodanego w `index.html`,
- długiego, nieoczywistego `INVITE_CODE`,
- PIN-u admina w Apps Script,
- niewysyłania linku poza grupę.

To jest wystarczające dla zabawy wśród znajomych, ale nie jest systemem do zakładów pieniężnych ani do danych wrażliwych.

## Aktualizacja terminarza

Terminarz jest w `fixtures.js`. Jeśli FIFA zmieni godziny lub pary, edytuj odpowiedni obiekt meczu i tę samą godzinę w `MATCH_LOCKS` w `Code.gs`.

Źródła użyte przy przygotowaniu terminarza:

- FIFA: `https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums`
- Sky Sports: `https://www.skysports.com/football/news/11095/13481245/world-cup-2026-fixture-schedule-and-uk-kick-off-times-day-by-day-breakdown-of-all-104-matches-including-england-scotland`
- GitHub Pages private visibility: `https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site`
