# Mundial Typer

Nowoczesna aplikacja do prywatnego typowania wyników Mistrzostw Świata 2026 w grupie znajomych.

Stack: React, TypeScript, Vite, Supabase Auth, Supabase Postgres, RLS. Frontend może działać na darmowym hostingu Vercel, Netlify albo GitHub Pages, a backend na darmowym planie Supabase dla małej grupy.

## Funkcje MVP

- link zaproszenia w formacie `/?g=mundial2026&i=KOD_ZAPROSZENIA`,
- rejestracja i logowanie nickiem oraz hasłem, bez e-maila w UI,
- synthetic email dla Supabase Auth: `groupSlug.normalizedNickname@mundial-typer.local`,
- grupy, role `player`, `admin`, `owner`,
- terminarz 104 meczów MŚ 2026 w UTC, wyświetlany dla `Europe/Warsaw`,
- typowanie wyników tylko przed kickoffem,
- blokada typowania egzekwowana w RPC/RLS na podstawie czasu serwera,
- ukrywanie typów innych graczy do rozpoczęcia meczu,
- panel admina do wyników, statusów i fazy pucharowej,
- automatyczne przeliczanie punktów po zatwierdzeniu wyniku,
- ranking: punkty meczowe, bonusowe i łączne,
- podstawowe bonusy turniejowe z deadline,
- premium dark UI z glassmorphism, akcentami złota, niebieskiego i zieleni.

## Lokalnie

```bash
npm install
cp .env.example .env
npm run dev
```

Uzupełnij `.env`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_DEFAULT_GROUP_SLUG=mundial2026
```

Jeśli zostawisz `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` puste, aplikacja uruchomi się w trybie demo na `localStorage`. Konto demo admina:

```text
nick: Admin
hasło: admin123
link: http://localhost:3000/?g=mundial2026&i=demo
```

Build produkcyjny:

```bash
npm run build
npm run preview
```

## Konfiguracja Supabase

1. Utwórz projekt na `https://supabase.com`.
2. Wejdź w `Authentication -> Providers -> Email`.
3. Włącz Email provider.
4. Wyłącz `Confirm email`, żeby `signUp` od razu tworzył sesję dla MVP.
5. Wejdź w `Project Settings -> API`.
6. Skopiuj `Project URL` i `anon public key` do `.env`.
7. W `SQL Editor` uruchom migracje w tej kolejności:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_functions_scoring.sql
supabase/migrations/004_seed_fixtures.sql
supabase/migrations/005_realtime_publication.sql
```

## Utworzenie ownera i grupy

Po migracjach utwórz pierwsze konto przez aplikację albo przez Supabase Auth. Najprościej:

1. Uruchom lokalnie aplikację.
2. Wejdź pod tymczasowy link:

```text
http://localhost:3000/?g=mundial2026&i=START
```

3. Jeśli grupa jeszcze nie istnieje, rejestracja nie przejdzie. W Supabase utwórz tymczasowo użytkownika w `Authentication -> Users` z synthetic email, np.:

```text
mundial2026.admin@mundial-typer.local
```

4. W SQL Editor wstaw profil i grupę, podstawiając UUID użytkownika z Supabase Auth:

```sql
insert into profiles (id, nickname)
values ('USER_UUID', 'Admin')
on conflict (id) do update set nickname = excluded.nickname;

insert into groups (name, slug, invite_code, owner_id, bonus_deadline)
values (
  'Mundial 2026',
  'mundial2026',
  'START',
  'USER_UUID',
  '2026-06-11T17:00:00Z'
)
on conflict (slug) do update
set invite_code = excluded.invite_code;

insert into group_members (group_id, user_id, role)
select id, 'USER_UUID', 'owner'
from groups
where slug = 'mundial2026'
on conflict (group_id, user_id) do update
set role = 'owner';
```

5. Zaloguj się w aplikacji nickiem `Admin` i hasłem utworzonym w Supabase Auth.
6. W panelu admina skopiuj link zaproszenia dla znajomych.

Później możesz zmienić `invite_code` w tabeli `groups`.

## Migracje i bezpieczeństwo

Najważniejsze elementy backendu:

- `predictions` ma RLS: własne typy zawsze, typy innych dopiero po kickoffie,
- `save_prediction` sprawdza członkostwo grupy, nieujemny wynik i `now() < kickoff_at`,
- `bonus_predictions` blokuje edycję po `groups.bonus_deadline`,
- `join_group_with_invite` używa `auth.uid()` i nie ufa user id z frontendu,
- frontend używa tylko `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`,
- `service_role` nie może trafić do repo ani do frontendu.

## Realtime

Hooki aplikacji subskrybują zmiany Supabase Realtime dla meczów, wyników,
typów, punktów, bonusów i statystyk turnieju. Dzięki temu ranking, szczegóły
meczu, lista meczów i ekran statystyk odświeżają się po zmianach w bazie bez
ręcznego przeładowania.

Żeby to działało w realnym projekcie Supabase, uruchom też migrację:

```text
supabase/migrations/005_realtime_publication.sql
```

## Deploy na Vercel

1. Wrzuć repozytorium na GitHub.
2. W Vercel wybierz `New Project`.
3. Framework: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Dodaj env vars:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DEFAULT_GROUP_SLUG
```

7. Deploy.
8. Użyj linku zaproszenia:

```text
https://twoja-aplikacja.vercel.app/?g=mundial2026&i=START
```

## Deploy na Netlify

1. `Add new site -> Import an existing project`.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Dodaj te same zmienne środowiskowe.
5. Deploy.

## Deploy na GitHub Pages

Dla GitHub Pages najwygodniej użyć akcji budującej `dist`. Jeśli repo jest publikowane pod subścieżką, ustaw `base` w `vite.config.ts`, np.:

```ts
base: '/mundial-typer/',
```

Potem uruchom build i opublikuj katalog `dist` przez GitHub Actions albo ręcznie jako Pages artifact.

## Punktacja

Faza grupowa:

- dokładny wynik: 5 pkt,
- rezultat 1/X/2 + dobra różnica bramek: 3 pkt,
- rezultat 1/X/2: 2 pkt,
- brak typu albo nietrafiony rezultat: 0 pkt.

Faza pucharowa:

- wynik po 90 minutach liczony jak wyżej,
- poprawnie wskazany awansujący: +2 pkt,
- poprawny sposób rozstrzygnięcia `90min` / `AET` / `PEN`: +1 pkt,
- maksymalnie 8 pkt za mecz.

Bonusy:

- mistrz świata: 15 pkt,
- wicemistrz: 10 pkt,
- półfinalista: 4 pkt,
- król strzelców: 10 pkt albo 7 pkt jako współlider,
- najlepszy bramkarz: 8 pkt,
- najlepszy zawodnik: 8 pkt,
- drużyna z największą liczbą goli: 8 pkt,
- przedział łącznej liczby goli: 5 pkt,
- finał zakończony karnymi tak/nie: 3 pkt.

## Architektura pod późniejsze API wyników

W MVP wyniki i statystyki wpisuje admin ręcznie. Pod późniejsze zewnętrzne API są przygotowane:

- `sync_logs`,
- `match_events`,
- `team_tournament_stats`,
- `player_tournament_stats`,
- oddzielne tabele wyników i punktów.

Nie dodawaj kluczy zewnętrznych API do frontendu. Sekrety powinny trafić do Supabase Edge Functions albo do panelu dostawcy hostingu.
