# Poker Client Data File Formats

Documentation of data file locations and formats for each poker client.

## PokerStars

**Installation Path:** `C:\Program Files (x86)\PokerStars.EU\` or `C:\Users\<user>\AppData\Local\PokerStars.EU\`

**Data Locations:**
- `%LOCALAPPDATA%\PokerStars.EU\`
- `%APPDATA%\PokerStars.EU\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `user.ini` | INI | User preferences, last login |
| `tournament/schedule.xml` | XML | Tournament schedule data |
| `TournamentSummary/*.txt` | Text | Individual tournament results |
| `HandHistory/**/*.txt` | Text | Hand history files |
| `lobby.dat` | Binary | Cached lobby data |
| `*.log` | Text | Client logs with game activity |

**Tournament Schedule XML Structure:**
```xml
<tournaments>
  <tournament id="123456">
    <name>$5.50 Daily Turbo</name>
    <buyIn>5.50</buyIn>
    <fee>0.50</fee>
    <startTime>2024-01-15T18:00:00Z</startTime>
    <gameType>NL Hold'em</gameType>
    <structure>Turbo</structure>
    <guarantee>1000</guarantee>
  </tournament>
</tournaments>
```

---

## GGPoker

**Installation Path:** `C:\Program Files\GGPoker\` or via GGPoker installer

**Data Locations:**
- `%APPDATA%\GGPoker\`
- `%LOCALAPPDATA%\GGPoker\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `config.json` | JSON | User config, preferences |
| `data/lobby.json` | JSON | Cached lobby state |
| `data/tournaments.db` | SQLite | Tournament data cache |
| `cache/*.json` | JSON | Various cached API responses |
| `HandHistory/*.txt` | Text | Hand histories |

**Lobby JSON Structure (approximate):**
```json
{
  "tournaments": [
    {
      "id": "MTT-12345",
      "name": "$5 Bounty Hunters",
      "buyIn": 5.0,
      "fee": 0.5,
      "startTime": "2024-01-15T18:00:00.000Z",
      "variant": "NLHE",
      "guarantee": 5000,
      "registered": 234,
      "status": "registering"
    }
  ],
  "cashGames": [
    {
      "tableId": "CG-789",
      "stakes": "0.05/0.10",
      "variant": "NLHE",
      "players": 6,
      "maxPlayers": 6,
      "avgPot": 2.50
    }
  ]
}
```

---

## 888Poker

**Installation Path:** `C:\Program Files (x86)\888poker\`

**Data Locations:**
- `%APPDATA%\888poker\`
- `%LOCALAPPDATA%\888\poker\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `settings.xml` | XML | User settings |
| `data/lobby.xml` | XML | Lobby cache |
| `data/tournaments.xml` | XML | Tournament listings |
| `handhistory/*.txt` | Text | Hand histories |

**Tournament XML Structure:**
```xml
<lobby>
  <tournaments>
    <tournament>
      <id>T123456</id>
      <name>$3.30 NL Hold'em</name>
      <buyin>3.30</buyin>
      <start>1705341600000</start>
      <game>NLHE</game>
      <guarantee>500</guarantee>
      <entries>45</entries>
    </tournament>
  </tournaments>
</lobby>
```

---

## PartyPoker

**Installation Path:** `C:\Program Files (x86)\PartyGaming\PartyPoker\`

**Data Locations:**
- `%LOCALAPPDATA%\PartyGaming\PartyPoker\`
- `%APPDATA%\PartyPoker\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `config.dat` | Binary/XML | Configuration |
| `Data/lobby.xml` | XML | Lobby state |
| `Data/schedule.xml` | XML | Tournament schedule |
| `HandHistory/*.txt` | Text | Hand histories |

---

## WPT Global

**Installation Path:** `C:\Program Files\WPT Global\` (relatively new client)

**Data Locations:**
- `%APPDATA%\WPTGlobal\`
- `%LOCALAPPDATA%\WPTGlobal\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `config.json` | JSON | Settings |
| `data/lobby.json` | JSON | Lobby cache |
| `data/cache.db` | SQLite | Cached data |
| `logs/*.log` | Text | Activity logs |

---

## WSOP Online

**Installation Path:** `C:\Program Files\WSOP\` (varies by region/version)

**Data Locations:**
- `%LOCALAPPDATA%\WSOP\`
- `%APPDATA%\WSOP\`

**Key Files:**
| File/Pattern | Format | Contents |
|--------------|--------|----------|
| `settings.json` | JSON | User preferences |
| `data/tournaments.json` | JSON | Tournament data |
| `data/lobby.db` | SQLite | Lobby cache |
| `cache/*.json` | JSON | API response cache |

---

## Common Data Elements to Extract

For all clients, we want to extract:

### Tournaments
- Tournament ID (external)
- Name
- Buy-in amount
- Rake/fee amount
- Start time (UTC)
- Game variant (NLHE, PLO, etc.)
- Structure (Turbo, Hyper, Deep, etc.)
- Guarantee amount
- Current registrations
- Status (registering, running, finished)
- Starting stack
- Blind level duration
- Re-entry policy

### Cash Games
- Table ID
- Stakes (small blind / big blind)
- Game variant
- Current players
- Max players
- Average pot (if available)
- Wait list count (if available)

---

## Sync Strategy

1. **On Windows VM:** Scheduled task copies relevant files to shared folder every 5 minutes
2. **On Linux Host:** File watcher monitors shared folder for changes
3. **Parser Service:** Reads changed files, extracts data, normalizes to common format
4. **Ingestion:** Pushes normalized data to jungleverse API
