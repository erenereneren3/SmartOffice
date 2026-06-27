const express = require('express');
const router  = express.Router();
const { db }          = require('../services/database');
const { mqttService } = require('../services/mqtt_service');

router.get('/sensors/latest', (_req, res) => {
    res.json(db.getLatestAll());
});

router.get('/sensors/history/:sensor', (req, res) => {
    const { sensor }     = req.params;
    const room           = req.query.room  || 'room1';
    const now            = new Date().toISOString();
    const dayAgo         = new Date(Date.now() - 86400000).toISOString();
    const from           = req.query.from  || dayAgo;
    const to             = req.query.to    || now;
    const limit          = Math.min(parseInt(req.query.limit) || 200, 1000);
    res.json(db.getSensorHistory(room, sensor, from, to, limit));
});

router.post('/actuators/:room/:device', (req, res) => {
    const { room, device } = req.params;
    mqttService.sendActuatorCommand(room, device, req.body);
    res.json({ success: true });
});

router.get('/rules', (_req, res) => {
    res.json(db.getRules());
});

router.post('/rules', (req, res) => {
    const { name, sensor, operator, threshold, actuator, action } = req.body;
    if (!name || !sensor || !operator || threshold === undefined || !actuator || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = db.insertRule({ name, sensor, operator, threshold, actuator, action });
    res.status(201).json({ success: true, id });
});

router.delete('/rules/:id', (req, res) => {
    db.deleteRule(parseInt(req.params.id));
    res.json({ success: true });
});

router.patch('/rules/:id/toggle', (req, res) => {
    db.toggleRule(parseInt(req.params.id), req.body.enabled);
    res.json({ success: true });
});

router.get('/system/status', (_req, res) => {
    res.json({
        mqttConnected: mqttService.connected,
        serverUptime:  Math.floor(process.uptime()),
        timestamp:     new Date().toISOString(),
        nodeVersion:   process.version
    });
});

module.exports = router;
