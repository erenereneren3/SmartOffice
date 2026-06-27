require('dotenv').config();
const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const path      = require('path');
const cors      = require('cors');

const { mqttService } = require('./services/mqtt_service');
const { db }          = require('./services/database');
const apiRouter       = require('./routes/api');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dashboard')));
app.use('/api', apiRouter);

const wsClients = new Set();

wss.on('connection', (ws) => {
    wsClients.add(ws);

    try {
        const initial = db.getLatestAll();
        ws.send(JSON.stringify({ type: 'initial', data: initial }));
    } catch {}

    ws.on('error', () => wsClients.delete(ws));
    ws.on('close', () => wsClients.delete(ws));
});

function broadcast(message) {
    const payload = JSON.stringify(message);
    wsClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
}

mqttService.on('sensorData',    (data) => { db.insertReading(data);        broadcast({ type: 'sensorUpdate',   data }); });
mqttService.on('actuatorStatus',(data) => { db.updateActuatorState(data);  broadcast({ type: 'actuatorUpdate', data }); });
mqttService.on('heartbeat',     (data) => {                                 broadcast({ type: 'heartbeat',      data }); });
mqttService.on('connected',     ()     => {                                 broadcast({ type: 'mqttStatus', connected: true  }); });
mqttService.on('disconnected',  ()     => {                                 broadcast({ type: 'mqttStatus', connected: false }); });

mqttService.connect();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Smart Office Server → http://localhost:${PORT}`);
});

module.exports = { broadcast };
