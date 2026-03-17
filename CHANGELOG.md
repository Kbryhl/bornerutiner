# Changelog

Alle ændringer i BørneRutiner dokumenteres her.

## [1.4.0] - 2026-03-17

### Tilføjet

- **Personlig besked ved gennemført rutine** — Forældre kan nu angive en besked for hvert barn, som vises når rutinen er gennemført.

---
## [1.3.0] - 2026-03-17

### Tilføjet

- **Automatisk fallback polling** — Kortet poller nu Home Assistant entity hvert 30. sekund for at sikre synkronisering, selv hvis realtids-sync/WebSocket fejler på enkelte enheder.

---
## [1.2.0] - 2026-03-17

### Ændret

- **Fjernet MDI-ikon understøttelse** — Icon picker bruger nu udelukkende emojis. MDI-ikoner er fjernet for at holde kortet enkelt og hurtigt. Alle eksisterende emoji-ikoner virker som før.

---

## [1.1.0] - 2026-03-12

### Tilføjet

- **Icon pack-understøttelse** — Brug MDI-ikoner (f.eks. `mdi:toothbrush`, `mdi:broom`) sammen med eller i stedet for emojis. Virker på rutine-ikoner, opgave-ikoner og barn-avatarer. Alle eksisterende emojis virker stadig som før.

---

## [1.0.0] - 2026-03-12

Første officielle release! Alt fra de tidlige udviklingsversioner er samlet her.

### Funktioner

- **Ubegrænsede rutiner per barn** — Morgen, Eftermiddag, Aften og hvad du ellers finder på. Tilføj, rediger navn/ikon/farve, og slet rutiner frit.
- **Rutiner er uafhængige per barn** — Hvert barn har sine egne rutiner med egne opgaver, så morgenrutinen for ét barn kan se helt anderledes ud end for et andet.
- **Kopiér rutine til alle børn** — Opret en rutine på ét barn og kopiér den til alle andre med ét tryk.
- **Flere børn** med egne avatarer og navne.
- **Interaktive tjeklister** — Børnene trykker på opgaverne for at markere dem.
- **Fremskridtsbjælke** per rutine.
- **Konfetti-fejring** 🎉 når en hel rutine er gennemført.
- **PIN-beskyttet forældrepanel** til at styre opgaver, rutiner, børn og PIN-kode.
- **Synkronisering på tværs af enheder** — Data gemmes i en delt HA-entitet (`sensor.boerne_rutiner_data`) med realtids-sync. Alle enheder og brugere ser det samme.
- **Daglig auto-nulstilling** — Opgaver nulstilles automatisk hver ny dag. Historik gemmes i 7 dage.
- **Inline redigering** — Opgaver og børn redigeres direkte i listen, ingen popups.
- **Mørkt tema** — Følger dit Home Assistant-tema.
- **HACS-kompatibel** — Nem installation via HACS.

### Udviklingshistorik

| Version | Milepæl |
|---------|---------|
| 0.1 | Første udgave med tre faste rutiner, localStorage og basis-admin |
| 0.2 | Inline redigering af opgaver og børn |
| 0.3 | Data flyttet til HA server-storage, synkronisering på tværs af enheder |
| 0.4 | Realtids-sync via delt HA-entitet, echo-undertrykkelse |
| 0.5 | Per-barn rutiner, tilføj/slet/rediger rutiner, kopiér til alle børn |
