# BørneRutiner – Rutine-tracker for børn 📋

Et custom Home Assistant Lovelace-kort, der hjælper børn med at holde styr på deres daglige rutiner. Forældre kan styre opgaver, rutiner og børn bag en PIN-beskyttet admin-side.

![Version](https://img.shields.io/badge/version-1.4.0-blue)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Funktioner

- **Ubegrænsede rutiner per barn** – Morgenrutine ☀️, Eftermiddagsrutine 📚, Aftenrutine 🌙 og hvad du ellers finder på
- **Rutiner er uafhængige per barn** – Hvert barn kan have sine egne rutiner med egne opgaver, navne, ikoner og farver
- **Flere børn** – Tilføj så mange børn som du vil, med egne avatarer
- **Interaktive tjeklister** – Børnene trykker på opgaverne for at markere dem som fuldførte
- **Fremskridtsbjælke** – Visuel oversigt over hver rutines status
- **Konfetti-fejring** 🎉 – Sjov animation når en hel rutine er gennemført
- **PIN-beskyttet forældrepanel** – Tilføj, rediger og fjern opgaver, rutiner og børn
- **Kopiér rutine til alle børn** – Opret en rutine én gang og kopiér den til alle børn med ét tryk
- **Daglig auto-nulstilling** – Opgaver nulstilles automatisk hver ny dag
- **Synkronisering på tværs af enheder** – Alle enheder ser de samme data i realtid
- **Mørkt tema** – Følger dit Home Assistant-tema automatisk
- **Ingen ekstra integrationer påkrævet** – Alt data gemmes direkte i Home Assistant
- **Automatisk fallback polling** – Hvis realtids-sync fejler, poller kortet automatisk Home Assistant hvert 30. sekund for at sikre synkronisering på alle enheder.
- **Personlig besked ved gennemført rutine** – Forældre kan angive en besked for hvert barn, som vises når rutinen er gennemført.

---

## Krav

- **Home Assistant** 2023.1 eller nyere
- **HACS** (Home Assistant Community Store) — anbefalet til installation
- En moderne browser (Chrome, Firefox, Safari, Edge)

---

## Installation

### Via HACS (anbefalet)

1. Åbn **HACS** i Home Assistant
2. Gå til **Frontend** → klik på menuen **⋮** → **Custom repositories**
3. Tilføj denne URL og vælg **Dashboard** som kategori:
   ```
   https://github.com/Kbryhl/bornerutiner
   ```
4. Klik **Add** → find **BørneRutiner** → klik **Download**
5. **Genstart Home Assistant** eller ryd browser-cachen

### Manuel installation

1. Download filen `boerne-rutiner-card.js` fra dette repository
2. Kopiér filen til din Home Assistant `config/www/` mappe
3. Tilføj ressourcen i HA: **Indstillinger → Dashboards → ⋮ → Ressourcer**:
   - URL: `/local/boerne-rutiner-card.js`
   - Type: **JavaScript Module**
4. Genstart Home Assistant

---

## Konfiguration

Tilføj kortet til dit dashboard via UI-editoren eller YAML:

### Minimal YAML

```yaml
type: custom:boerne-rutiner-card
```

### Med valgmuligheder

```yaml
type: custom:boerne-rutiner-card
title: "Familiens Rutiner"
pin: "5678"
```

| Mulighed | Type   | Standard         | Beskrivelse                       |
|----------|--------|------------------|-----------------------------------|
| `title`  | string | `Kids Routines`  | Overskrift på kortet              |
| `pin`    | string | `1234`           | Start-PIN for forældre (kan ændres) |

---

## Brug

### For børn 👧👦

1. Tryk på dit navn øverst på kortet
2. Vælg den aktuelle rutine (f.eks. Morgen, Eftermiddag, Aften)
3. Tryk på hver opgave når den er klaret ✅
4. Gennemfør alle opgaver og se konfetti-fejringen! 🎉

### For forældre 👨‍👩‍👧‍👦

1. Tryk på **⚙️** tandhjulet i øverste højre hjørne
2. Indtast din 4-cifrede PIN (standard: `1234`)
3. Brug admin-panelet:

| Fane              | Funktioner                                                        |
|-------------------|-------------------------------------------------------------------|
| **📝 Rutiner**    | Vælg barn → vælg rutine → tilføj/rediger/slet opgaver. Tilføj nye rutiner med ➕. Kopiér en rutine til alle børn. |
| **👶 Børn**       | Tilføj, rediger eller fjern børn og deres avatarer                |
| **🔑 PIN**        | Skift forældrenes PIN-kode                                        |

---

## Standard-rutiner

Kortet kommer med disse standard-rutiner (kan tilpasses frit):

### ☀️ Morgenrutine
- 🪥 Børst tænder
- 👕 Tag tøj på
- 🥣 Spis morgenmad
- 🎒 Pak skoletaske

### 📚 Eftermiddagsrutine
- 📝 Lektier
- 🧹 Ryd op på værelset
- 🍽️ Dæk bordet

### 🌙 Aftenrutine
- 🚿 Bad / brus
- 🪥 Børst tænder
- 👕 Tag pyjamas på
- 📖 Læs en bog

Alle rutiner og opgaver kan frit tilpasses i forældrepanelet — ingen YAML-redigering nødvendig efter installation.

---

## Data & synkronisering

- Data gemmes i en delt Home Assistant-entitet (`sensor.boerne_rutiner_data`), så alle enheder og brugere ser det samme
- Ændringer synkroniseres i realtid via HA's built-in state push
- Backup gemmes per HA-bruger, så data overlever genstart
- Opgave-historik gemmes i 7 dage og ryddes automatisk

---

## Fejlfinding

| Problem | Løsning |
|---------|---------|
| Kortet vises ikke | Ryd browser-cachen (`Ctrl+Shift+R`) og genindlæs. Tjek at ressourcen er tilføjet korrekt. |
| Glemt PIN | Åbn DevTools (`F12`) → Console → kør: `localStorage.removeItem("boerne-rutiner")` → genindlæs |
| Opgaver nulstilles ikke | Tjek at dato/tid er korrekt på din enhed |
| Forskellige data på enheder | Kør "Recheck" i HACS og genindlæs. Data lagres server-side, så det bør synkronisere automatisk. |

---

## Kontakt

Har du idéer, fejlrapporter eller feedback? Skriv til:

📧 **kenneth@bryhl.com**

Du er også velkommen til at oprette et [issue på GitHub](https://github.com/Kbryhl/bornerutiner/issues).

---

## Licens

MIT — fri til personlig og kommerciel brug.
