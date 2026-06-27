const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

class DatabaseService {
    constructor() {
        this._db = new Database(path.join(dataDir, 'smart_office.db'));
        this._db.pragma('journal_mode = WAL');
        this._init();
        this._prepareStatements();
    }

    _init() {
        this._db.exec(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                room      TEXT    NOT NULL,
                sensor    TEXT    NOT NULL,
                value     REAL    NOT NULL,
                unit      TEXT,
                timestamp TEXT    NOT NULL
            );

            CREATE TABLE IF NOT EXISTS actuator_states (
                room       TEXT NOT NULL,
                actuator   TEXT NOT NULL,
                state      TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (room, actuator)
            );

            CREATE TABLE IF NOT EXISTS automation_rules (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL,
                sensor     TEXT    NOT NULL,
                operator   TEXT    NOT NULL,
                threshold  REAL    NOT NULL,
                actuator   TEXT    NOT NULL,
                action     TEXT    NOT NULL,
                enabled    INTEGER NOT NULL DEFAULT 1,
                created_at TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_readings_lookup
                ON sensor_readings (room, sensor, timestamp DESC);
        `);
    }

    _prepareStatements() {
        this._stmtInsertReading = this._db.prepare(`
            INSERT INTO sensor_readings (room, sensor, value, unit, timestamp)
            VALUES (@room, @sensor, @value, @unit, @timestamp)
        `);

        this._stmtUpsertActuator = this._db.prepare(`
            INSERT INTO actuator_states (room, actuator, state, updated_at)
            VALUES (@room, @actuator, @state, @updated_at)
            ON CONFLICT(room, actuator) DO UPDATE SET
                state      = excluded.state,
                updated_at = excluded.updated_at
        `);
    }

    insertReading(data) {
        this._stmtInsertReading.run({
            room:      data.room,
            sensor:    data.sensor,
            value:     data.value,
            unit:      data.unit ?? null,
            timestamp: data.timestamp
        });
    }

    updateActuatorState(data) {
        this._stmtUpsertActuator.run({
            room:       data.room,
            actuator:   data.actuator,
            state:      data.state,
            updated_at: data.timestamp
        });
    }

    getLatestSensor(room, sensor) {
        return this._db.prepare(`
            SELECT value, unit, timestamp FROM sensor_readings
            WHERE room = ? AND sensor = ?
            ORDER BY timestamp DESC LIMIT 1
        `).get(room, sensor);
    }

    getLatestAll() {
        const SENSORS   = ['temperature', 'humidity', 'motion', 'light', 'co2'];
        const ROOMS     = ['room1'];
        const result    = { sensors: {}, actuators: {} };

        for (const room of ROOMS) {
            result.sensors[room]   = {};
            result.actuators[room] = {};

            for (const sensor of SENSORS) {
                const row = this.getLatestSensor(room, sensor);
                if (row) result.sensors[room][sensor] = row;
            }

            const rows = this._db.prepare(
                'SELECT actuator, state FROM actuator_states WHERE room = ?'
            ).all(room);
            for (const r of rows) result.actuators[room][r.actuator] = r.state;
        }

        return result;
    }

    getSensorHistory(room, sensor, from, to, limit = 200) {
        return this._db.prepare(`
            SELECT value, unit, timestamp FROM sensor_readings
            WHERE room = ? AND sensor = ? AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp ASC
            LIMIT ?
        `).all(room, sensor, from, to, limit);
    }

    getRules() {
        return this._db.prepare(
            'SELECT * FROM automation_rules ORDER BY created_at DESC'
        ).all();
    }

    insertRule(rule) {
        const result = this._db.prepare(`
            INSERT INTO automation_rules
                (name, sensor, operator, threshold, actuator, action, enabled, created_at)
            VALUES
                (@name, @sensor, @operator, @threshold, @actuator, @action, 1, @created_at)
        `).run({ ...rule, created_at: new Date().toISOString() });
        return result.lastInsertRowid;
    }

    deleteRule(id) {
        this._db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
    }

    toggleRule(id, enabled) {
        this._db.prepare('UPDATE automation_rules SET enabled = ? WHERE id = ?')
            .run(enabled ? 1 : 0, id);
    }

    pruneOldReadings(keepDays = 7) {
        const cutoff = new Date(Date.now() - keepDays * 86400000).toISOString();
        this._db.prepare('DELETE FROM sensor_readings WHERE timestamp < ?').run(cutoff);
    }
}

const db = new DatabaseService();

setInterval(() => db.pruneOldReadings(7), 6 * 60 * 60 * 1000);

module.exports = { db };
