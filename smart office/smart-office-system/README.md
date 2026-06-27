# Smart Office System

Automatisierte Steuerung und Überwachung von Bürokomponenten mittels ESP32, Sensorik sowie Integration von MQTT- und Web-Schnittstellen zur Systemverwaltung.

---

## Projektstruktur

```
smart-office-system/
├── firmware/
│   └── smart_office/
│       ├── smart_office.ino     ← Arduino Hauptsketch
│       ├── config.h             ← WiFi, MQTT, Pin-Konfiguration
│       ├── sensors.h / .cpp     ← Sensor-Abstraktion (DHT22, PIR, LDR, MQ135)
│       ├── actuators.h / .cpp   ← Aktor-Steuerung (Relais, RGB-LED)
│       └── mqtt_handler.h / .cpp← MQTT Publish/Subscribe
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js                ← Express + WebSocket + MQTT Bridge
│   ├── services/
│   │   ├── mqtt_service.js      ← MQTT EventEmitter
│   │   └── database.js          ← SQLite (WAL-Mode)
│   └── routes/
│       └── api.js               ← REST API
├── dashboard/
│   ├── index.html               ← Single-Page Dashboard
│   ├── css/style.css            ← Dark Glassmorphism Design
│   └── js/
│       ├── app.js               ← WebSocket Client, State, Gauges
│       ├── charts.js            ← Chart.js Verlaufsgraphen
│       └── controls.js          ← Aktor-Steuerung UI
├── mqtt/
│   └── mosquitto.conf
├── docker-compose.yml
└── README.md
```

---

## Hardware

| Komponente | Typ | Funktion |
|------------|-----|----------|
| Mikrocontroller | ESP32 DevKit | WiFi + MQTT Client + OTA |
| Temperatursensor | DHT22 | Temperatur (°C) + Luftfeuchtigkeit (%) |
| Bewegungsmelder | PIR HC-SR501 | Bewegungserkennung |
| Lichtsensor | LDR + 10kΩ | Lichtstärke (0–1000 lux) |
| Luftqualitätssensor | MQ135 | CO₂-Konzentration (400–5000 ppm) |
| Relais 1 | 5V Relay Modul | Deckenlicht Ein/Aus |
| Relais 2 | 5V Relay Modul | Jalousien Auf/Runter |
| Relais 3 | 5V Relay Modul | Klimaanlage Ein/Aus |
| Relais 4 | 5V Relay Modul | Steckdose Ein/Aus |
| LED Strip | RGB WS2812 | Stimmungslicht via PWM |

### Pin-Belegung (ESP32)

| Pin | Funktion |
|-----|----------|
| GPIO 4 | DHT22 Data |
| GPIO 5 | PIR Signal |
| GPIO 34 | LDR Analog |
| GPIO 35 | MQ135 Analog |
| GPIO 16 | Relay 1 (Licht) |
| GPIO 17 | Relay 2 (Jalousien) |
| GPIO 18 | Relay 3 (HVAC) |
| GPIO 19 | Relay 4 (Steckdose) |
| GPIO 25 | RGB LED – Rot |
| GPIO 26 | RGB LED – Grün |
| GPIO 27 | RGB LED – Blau |

---

## Software Stack

| Schicht | Technologie |
|---------|-------------|
| Firmware | Arduino C++ (ESP32 Core) |
| MQTT Broker | Eclipse Mosquitto 2 |
| Backend | Node.js 20 + Express + ws |
| Datenbank | SQLite (better-sqlite3, WAL) |
| Frontend | Vanilla HTML/CSS/JS + Chart.js |
| Containerisierung | Docker + Docker Compose |

---

## Benötigte Arduino Libraries

- `PubSubClient` (Nick O'Leary) – MQTT Client
- `DHT sensor library` (Adafruit) – DHT22
- `ArduinoJson` (Benoit Blanchon) – JSON Serialisierung
- `ArduinoOTA` – Over-the-Air Updates (im ESP32 Core enthalten)

---

## MQTT Topic-Schema

```
office/{room}/sensors/temperature    → {"value": 22.5, "unit": "C",   "ts": 12345}
office/{room}/sensors/humidity       → {"value": 45.2, "unit": "%",   "ts": 12345}
office/{room}/sensors/motion         → {"value": true,               "ts": 12345}
office/{room}/sensors/light          → {"value": 320,  "unit": "lux", "ts": 12345}
office/{room}/sensors/co2            → {"value": 850,  "unit": "ppm", "ts": 12345}

office/{room}/actuators/light/cmd    → {"state": "ON"} / {"state": "OFF"}
office/{room}/actuators/blinds/cmd   → {"state": "UP"} / {"state": "DOWN"} / {"state": "STOP"}
office/{room}/actuators/hvac/cmd     → {"state": "ON"} / {"state": "OFF"}
office/{room}/actuators/socket/cmd   → {"state": "ON"} / {"state": "OFF"}
office/{room}/actuators/rgb/cmd      → {"r": 255, "g": 128, "b": 0}

office/{room}/actuators/+/status     ← Rückmeldung ESP32 (retained)
office/{room}/heartbeat              ← {"rssi": -65, "uptime": 3600, "ip": "192.168.1.50"}
office/system/ota                    → OTA Update Trigger
```

---

## REST API

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/sensors/latest` | GET | Letzte Messwerte aller Sensoren |
| `/api/sensors/history/:sensor` | GET | Verlaufsdaten (query: from, to, limit, room) |
| `/api/actuators/:room/:device` | POST | Aktorbefehl senden |
| `/api/rules` | GET | Alle Automatisierungsregeln |
| `/api/rules` | POST | Neue Regel anlegen |
| `/api/rules/:id` | DELETE | Regel löschen |
| `/api/rules/:id/toggle` | PATCH | Regel aktivieren/deaktivieren |
| `/api/system/status` | GET | Server- und MQTT-Status |

---

## Schnellstart

### 1. ESP32 Firmware flashen

```bash
# Arduino IDE öffnen
# Datei: firmware/smart_office/smart_office.ino
# config.h: WIFI_SSID, WIFI_PASSWORD und MQTT_BROKER anpassen
# Board: ESP32 Dev Module
# Upload
```

### 2. Backend + Broker starten (Docker)

```bash
docker-compose up -d
```

### 3. Dashboard öffnen

```
http://localhost:3000
```

### 4. Lokaler Start ohne Docker

```bash
cd server
npm install
npm start
```

---

## Konfiguration

Alle Einstellungen in `firmware/smart_office/config.h`:

```c
#define WIFI_SSID        "DeinWLAN"
#define WIFI_PASSWORD    "DeinPasswort"
#define MQTT_BROKER      "192.168.1.x"   // IP des Servers
```

Für den Node.js-Server kann eine `.env` Datei angelegt werden:

```
MQTT_BROKER=mqtt://localhost:1883
PORT=3000
```

---

## Features

- Echtzeit-Sensordaten via MQTT → WebSocket → Browser
- Aktor-Steuerung direkt aus dem Dashboard
- Verlaufsgraphen (Chart.js) mit konfigurierbarem Zeitraum (1h / 6h / 24h)
- Automatisierungsregeln (Wenn Sensor X > Schwelle → Aktor Y Ein/Aus)
- OTA-Firmware-Update via MQTT
- Demo-Modus mit simulierten Daten wenn kein ESP32 verbunden
- Automatische Datenbankbereinigung (7-Tage Rolling Window)
- Docker Compose für einfache Bereitstellung
