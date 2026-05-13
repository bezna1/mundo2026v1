# Handoff — Mundial Typer

Data: 2026-05-13

## Projekt

Właściwy katalog aplikacji:

`/Users/hal/Desktop/codex/projects/mundial-typer`

Lokalny adres dev:

`http://127.0.0.1:5173/mundial-typer/dashboard`

Serwer Vite był uruchamiany komendą:

`npm run dev -- --host 127.0.0.1`

## Ostatnio zrobione

- Poprawiono routing pod `BASE_URL=/mundial-typer/`, żeby lokalnie i na GitHub Pages linki działały spójnie.
- Dodano jasny/ciemny motyw z przełącznikiem w nagłówku.
- Poprawiono czytelność jasnego motywu: ciemniejsze teksty, mocniejsze akcenty i lepszy kontrast pól/formularzy.
- Sekcja powitalna dashboardu została zmieniona w pełny slajder archiwalnych zdjęć reprezentacji Polski.
- Zdjęcia zapisano lokalnie w `public/archive/`.
- Zmieniono `Start` na `Menu`.
- Zmieniono `+ Dodaj typ` na `+ Dodaj wynik`.
- Zmieniono `Zapisz typ` na `Zapisz wynik`.
- Po zapisaniu wyniku karta pokazuje podświetlone `Mój wynik`.
- W edytorze wyniku puste pole traktowane jest jako `0`, więc można zapisać np. `1:0`.
- Poprawiono skalowanie pól wyniku na mobile.
- Dodano dzień tygodnia przy datach meczów.
- Dodano zakładkę `Typy po gwizdku`, gdzie typy grupy ujawniają się po rozpoczęciu meczu.
- Przebudowano statystyki:
  - wybór drużyny,
  - porównanie dwóch drużyn,
  - neutralne statystyki turniejowe zamiast `wygrane gospodarzy/gości`.
- Dodano demo obsługi wielu pokojów po 6-cyfrowym PIN-ie.
- Rejestracja w trybie demo tworzy konto oczekujące na zatwierdzenie admina.
- Admin może zatwierdzać/odrzucać zgłoszenia w panelu.
- Dodano tryb debugowania admina:
  - ustawienie tymczasowej daty aplikacji,
  - szybki test wybranego meczu,
  - ustawienie czasu na `Pierwszy gwizdek`,
  - ustawienie czasu `Po meczu + wyniki`,
  - automatyczne losowe wyniki i typy testowe w demo.
- Poprawiono link zaproszenia admina, żeby używał `/mundial-typer/`.

## Walidacja

Uruchomiono:

`npm run build`

Build przechodzi poprawnie. Pozostaje standardowe ostrzeżenie Vite o dużym bundle JS.

Sprawdzono w przeglądarce:

- dashboard w jasnym motywie,
- slajder archiwalnych zdjęć,
- etykiety `Menu`, `+ Dodaj wynik`, `Zapisz wynik`,
- zapis wyniku i zielone podświetlenie `Mój wynik`,
- panel admina i debug,
- statystyki bez `gospodarzy/gości`.

## Ważne pliki

- `src/pages/DashboardPage.tsx` — dashboard, hero/slajder, zakładka typów po gwizdku.
- `src/components/match/MatchCard.tsx` — karta meczu, dodawanie/zapis wyniku.
- `src/components/match/ScoreInput.tsx` — pola wyniku i mobile scaling.
- `src/pages/StatsPage.tsx` — statystyki turniejowe i porównanie drużyn.
- `src/pages/AdminPage.tsx` — panel admina, debug, akceptacja graczy.
- `src/lib/demoStore.ts` — demo pokoje PIN, użytkownicy, wyniki, symulacja.
- `src/styles/globals.css` — motywy, kontrast, slajder, podświetlenia.
- `src/hooks/useTheme.ts` i `src/components/theme/ThemeToggle.tsx` — obsługa motywu.
- `public/archive/` — lokalne zdjęcia archiwalne.

## Stan git

Repo ma niezacommitowane zmiany. Wcześniej istniały już niezacommitowane:

- `package.json`,
- `package-lock.json`,
- `public/.nojekyll`.

Po aktualnych pracach doszły zmiany w wielu plikach aplikacji oraz nowe:

- `HANDOFF.md`,
- `src/hooks/useTheme.ts`,
- `src/components/theme/ThemeToggle.tsx`,
- `public/archive/*.jpg`.

## Następne sensowne kroki

- Zdecydować, czy obecny demo system PIN + akceptacja admina ma być przeniesiony w pełni do Supabase przez migrację/RPC.
- Dodać prawdziwe źródło wyników live, jeśli aplikacja ma działać produkcyjnie poza trybem demo.
- Ewentualnie podzielić bundle JS przez dynamic imports, żeby usunąć ostrzeżenie Vite o rozmiarze.
