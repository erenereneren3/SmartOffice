const mqtt        = require('mqtt');
const EventEmitter = require('events');

class MQTTService extends EventEmitter {
    constructor() {
        super();
        this._client     = null;
        this._brokerUrl  = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
        this._connected  = false;
    }

    get connected() { return this._connected; }
    get client()    { return this._client; }

    connect() {
        this._client = mqtt.connect(this._brokerUrl, {
            clientId:        'smart-office-server-' + Math.random().toString(16).slice(2, 8),
            clean:           true,
            reconnectPeriod: 5000,
            connectTimeout:  10000
        });

        this._client.on('connect', () => {
            this._connected = true;
            this._client.subscribe('office/#', { qos: 1 });
            this.emit('connected');
        });

        this._client.on('reconnect',    () => { this._connected = false; this.emit('disconnected'); });
        this._client.on('offline',      () => { this._connected = false; this.emit('disconnected'); });
        this._client.on('error',        (err) => console.error('[MQTT]', err.message));
        this._client.on('message',      (topic, msg) => this._handleMessage(topic, msg.toString()));
    }

    _handleMessage(topic, rawMessage) {
        let payload;
        try { payload = JSON.parse(rawMessage); } catch { return; }

        const parts = topic.split('/');
        if (parts.length < 4) return;

        const [, room, category, component, action] = parts;

        if (category === 'sensors') {
            this.emit('sensorData', {
                room,
                sensor:    component,
                value:     payload.value,
                unit:      payload.unit ?? null,
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (category === 'actuators' && action === 'status') {
            this.emit('actuatorStatus', {
                room,
                actuator:  component,
                state:     payload.state,
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (category === 'heartbeat') {
            this.emit('heartbeat', {
                room,
                rssi:      payload.rssi,
                uptime:    payload.uptime,
                ip:        payload.ip,
                timestamp: new Date().toISOString()
            });
        }
    }

    publish(topic, payload) {
        if (this._client?.connected) {
            this._client.publish(topic, JSON.stringify(payload), { qos: 1 });
        }
    }

    sendActuatorCommand(room, actuator, payload) {
        this.publish(`office/${room}/actuators/${actuator}/cmd`, payload);
    }
}

const mqttService = new MQTTService();
module.exports = { mqttService };
