const state = {
    ws:             null,
    wsConnected:    false,
    mqttConnected:  false,
    espOnline:      false,
    lastHeartbeat:  null,
    sensors:        { room1: {} },
    actuators:      { room1: {} },
    demoMode:       false,
    demoInterval:   null,
    mqttLogEntries: [],
};

const WS_URL    = `ws://${location.host}`;
const API_BASE  = '/api';
let   wsRetry   = 0;

function $(id) { return document.getElementById(id); }

function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
    $('toast-container').appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function fmtUptime(sec) {
    if (sec === null || sec === undefined) return '--';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateClock() {
    const now = new Date();
    $('clock').textContent = now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + '  ' + now.toLocaleTimeString('de-DE');
}

setInterval(updateClock, 1000);
updateClock();

function setWsStatus(online) {
    state.wsConnected = online;
    const dot   = $('ws-dot');
    const badge = $('connection-badge');
    dot.className   = 'status-dot ' + (online ? 'online' : 'offline');
    badge.className = 'badge ' + (online ? 'badge-online' : 'badge-offline');
    badge.textContent = online ? 'Online' : 'Offline';
}

function setMqttStatus(online) {
    state.mqttConnected = online;
    $('mqtt-dot').className = 'status-dot ' + (online ? 'online' : 'offline');
    $('sys-mqtt-status').textContent = online ? 'Verbunden' : 'Getrennt';
    $('sys-mqtt-status').style.color = online ? 'var(--green)' : 'var(--red)';
}

function setEspStatus(online) {
    state.espOnline = online;
    $('esp-dot').className = 'status-dot ' + (online ? 'online' : 'offline');
}

function connectWS() {
    if (state.ws && state.ws.readyState < 2) return;

    state.ws = new WebSocket(WS_URL);

    state.ws.onopen = () => {
        wsRetry = 0;
        setWsStatus(true);
        if (state.demoMode) stopDemo();
        toast('WebSocket verbunden', 'success');
    };

    state.ws.onmessage = (ev) => {
        try {
            handleWsMessage(JSON.parse(ev.data));
        } catch {}
    };

    state.ws.onclose = () => {
        setWsStatus(false);
        setEspStatus(false);
        const delay = Math.min(1000 * 2 ** wsRetry, 30000);
        wsRetry++;
        setTimeout(connectWS, delay);
        if (!state.demoMode) startDemo();
    };

    state.ws.onerror = () => {
        state.ws.close();
    };
}

function handleWsMessage(msg) {
    switch (msg.type) {
        case 'initial':
            if (msg.data.sensors)   state.sensors   = msg.data.sensors;
            if (msg.data.actuators) state.actuators = msg.data.actuators;
            renderAllSensors();
            renderAllActuators();
            break;

        case 'sensorUpdate':
            const s = msg.data;
            if (!state.sensors[s.room]) state.sensors[s.room] = {};
            state.sensors[s.room][s.sensor] = { value: s.value, unit: s.unit, timestamp: s.timestamp };
            setEspStatus(true);
            renderSensor(s.room, s.sensor, s.value, s.unit);
            addMqttLog(`office/${s.room}/sensors/${s.sensor}`, s.value + (s.unit ? ' ' + s.unit : ''));
            break;

        case 'actuatorUpdate':
            const a = msg.data;
            if (!state.actuators[a.room]) state.actuators[a.room] = {};
            state.actuators[a.room][a.actuator] = a.state;
            renderActuator(a.room, a.actuator, a.state);
            addMqttLog(`office/${a.room}/actuators/${a.actuator}/status`, a.state);
            break;

        case 'heartbeat':
            state.lastHeartbeat = msg.data;
            setEspStatus(true);
            renderHeartbeat(msg.data);
            break;

        case 'mqttStatus':
            setMqttStatus(msg.connected);
            break;
    }
}

function renderAllSensors() {
    const room = state.sensors['room1'];
    if (!room) return;
    ['temperature','humidity','motion','light','co2'].forEach(s => {
        if (room[s]) renderSensor('room1', s, room[s].value, room[s].unit);
    });
}

function renderAllActuators() {
    const room = state.actuators['room1'];
    if (!room) return;
    Object.entries(room).forEach(([k, v]) => renderActuator('room1', k, v));
}

function renderSensor(room, sensor, value, unit) {
    switch (sensor) {
        case 'temperature': renderTemperature(value); break;
        case 'humidity':    renderHumidity(value); break;
        case 'motion':      renderMotion(value); break;
        case 'light':       renderLight(value); break;
        case 'co2':         renderCO2(value); break;
    }
    if (sensor === 'temperature') $('hvac-current-temp').textContent = `${value.toFixed(1)} °C`;
    if (sensor === 'humidity')    $('hvac-current-hum').textContent  = `${value.toFixed(1)} %`;
}

function renderTemperature(val) {
    $('val-temperature').textContent = val.toFixed(1);
    drawArcGauge('gauge-temp', val, 15, 35, '#ef4444');
    const b = $('badge-temperature');
    if (val < 18)       { b.textContent = 'Zu kalt'; b.className = 'trend-badge trend-warn'; }
    else if (val > 26)  { b.textContent = 'Zu warm'; b.className = 'trend-badge trend-danger'; }
    else                { b.textContent = 'Optimal'; b.className = 'trend-badge trend-ok'; }
}

function renderHumidity(val) {
    $('val-humidity').textContent = val.toFixed(1);
    $('bar-humidity').style.width = `${Math.min(100, Math.max(0, val))}%`;
    const b = $('badge-humidity');
    if (val < 30)       { b.textContent = 'Trocken'; b.className = 'trend-badge trend-warn'; }
    else if (val > 70)  { b.textContent = 'Feucht';  b.className = 'trend-badge trend-warn'; }
    else                { b.textContent = 'Optimal'; b.className = 'trend-badge trend-ok'; }
}

function renderMotion(val) {
    const detected = val === true || val === 'true' || val === 1;
    const ring = $('motion-ring');
    const status = $('motion-status');
    if (detected) {
        ring.classList.add('active');
        status.textContent = 'Bewegung erkannt!';
        status.style.color = '#a855f7';
        $('badge-motion').textContent = 'Aktiv';
        $('badge-motion').className   = 'trend-badge trend-ok';
    } else {
        ring.classList.remove('active');
        status.textContent = 'Kein Bewegung';
        status.style.color = '';
        $('badge-motion').textContent = 'Ruhig';
        $('badge-motion').className   = 'trend-badge trend-neutral';
    }
}

function renderLight(val) {
    $('val-light').textContent = val;
    const pct = Math.min(1, val / 1000);
    const size = 24 + pct * 32;
    const sun  = $('light-sun');
    sun.style.transform = `scale(${0.6 + pct * 0.8})`;
    sun.style.filter    = `brightness(${0.4 + pct * 1.2}) drop-shadow(0 0 ${pct * 16}px rgba(245,158,11,0.8))`;
    const b = $('badge-light');
    if (val < 100)      { b.textContent = 'Dunkel';  b.className = 'trend-badge trend-neutral'; }
    else if (val < 500) { b.textContent = 'Normal';  b.className = 'trend-badge trend-ok'; }
    else                { b.textContent = 'Hell';    b.className = 'trend-badge trend-ok'; }
}

function renderCO2(val) {
    $('val-co2').textContent = val;
    const pct = Math.min(100, Math.max(0, (val - 400) / (5000 - 400) * 100));
    $('co2-needle').style.left = `${pct}%`;
    const b = $('badge-co2');
    if (val < 800)      { b.textContent = 'Sehr gut'; b.className = 'trend-badge trend-ok'; }
    else if (val < 1200){ b.textContent = 'Mittel';   b.className = 'trend-badge trend-warn'; }
    else                { b.textContent = 'Schlecht'; b.className = 'trend-badge trend-danger'; }
}

function renderActuator(room, actuator, stateVal) {
    switch (actuator) {
        case 'light':
            $('toggle-light').checked = stateVal === 'ON';
            break;
        case 'hvac':
            $('toggle-hvac').checked = stateVal === 'ON';
            break;
        case 'socket':
            $('toggle-socket').checked = stateVal === 'ON';
            break;
        case 'blinds':
            $('blinds-status-badge').textContent = stateVal;
            break;
    }
}

function renderHeartbeat(data) {
    if (data.rssi)   $('sys-rssi').textContent     = `${data.rssi} dBm`;
    if (data.uptime) $('sys-esp-uptime').textContent = fmtUptime(data.uptime);
    if (data.ip)     $('sys-ip').textContent         = data.ip;
    $('sys-last-seen').textContent = fmtTime(data.timestamp);
}

function drawArcGauge(canvasId, value, min, max, color) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.9;
    const r  = W * 0.42;
    const startAngle = Math.PI;
    const endAngle   = 2 * Math.PI;
    const progress   = Math.min(1, Math.max(0, (value - min) / (max - min)));
    const fillAngle  = startAngle + progress * Math.PI;

    ctx.clearRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, color + '88');
    grad.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, fillAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    const dotX = cx + r * Math.cos(fillAngle);
    const dotY = cy + r * Math.sin(fillAngle);
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
}

function addMqttLog(topic, value) {
    const log = $('mqtt-log');
    const empty = log.querySelector('.mqtt-log-empty');
    if (empty) empty.remove();

    const entry = document.createElement('div');
    entry.className = 'mqtt-log-entry';
    entry.innerHTML = `
        <span class="mqtt-log-time">${new Date().toLocaleTimeString('de-DE')}</span>
        <span class="mqtt-log-topic">${topic}</span>
        <span class="mqtt-log-val">${String(value).slice(0, 20)}</span>
    `;
    log.insertBefore(entry, log.firstChild);

    if (log.children.length > 20) log.lastChild.remove();
}

function startDemo() {
    state.demoMode = true;
    toast('Demo-Modus: Simulierte Daten', 'info');
    let t = 22, h = 45, co2 = 750, light = 400;
    state.demoInterval = setInterval(() => {
        t    = Math.max(15, Math.min(35, t    + (Math.random() - 0.5) * 0.5));
        h    = Math.max(20, Math.min(90, h    + (Math.random() - 0.5) * 1));
        co2  = Math.max(400, Math.min(3000, co2 + (Math.random() - 0.5) * 30));
        light= Math.max(0,   Math.min(1000, light + (Math.random() - 0.5) * 50));
        const motion = Math.random() > 0.85;
        renderTemperature(t);
        renderHumidity(h);
        renderMotion(motion);
        renderLight(light);
        renderCO2(co2);
        if (window.updateDemoCharts) window.updateDemoCharts({ t, h, co2, light });
    }, 2000);
}

function stopDemo() {
    state.demoMode = false;
    clearInterval(state.demoInterval);
}

async function fetchSystemStatus() {
    try {
        const res = await fetch(`${API_BASE}/system/status`);
        const data = await res.json();
        setMqttStatus(data.mqttConnected);
        $('sys-server-uptime').textContent = fmtUptime(data.serverUptime);
        $('sys-node').textContent = data.nodeVersion || '--';
    } catch {}
}

setInterval(fetchSystemStatus, 15000);
fetchSystemStatus();

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        $(`section-${section}`).classList.add('active');
        const titles = { overview: 'Übersicht', controls: 'Steuerung', history: 'Verlauf', automation: 'Automatisierung', system: 'System' };
        $('page-title').textContent = titles[section] || section;
        if (section === 'history' && window.loadHistoryCharts) window.loadHistoryCharts();
        if (section === 'automation') loadRules();
        if (section === 'system') fetchSystemStatus();
    });
});

$('sidebar-toggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('collapsed');
});

connectWS();
