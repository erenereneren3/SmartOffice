const ROOM = 'room1';

async function sendCommand(device, payload) {
    try {
        await fetch(`/api/actuators/${ROOM}/${device}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        toast(`${device} Befehl gesendet`, 'success');
    } catch {
        toast(`Fehler beim Senden an ${device}`, 'error');
    }
}

document.getElementById('toggle-light').addEventListener('change', (e) => {
    sendCommand('light', { state: e.target.checked ? 'ON' : 'OFF' });
});

document.getElementById('toggle-hvac').addEventListener('change', (e) => {
    sendCommand('hvac', { state: e.target.checked ? 'ON' : 'OFF' });
});

document.getElementById('toggle-socket').addEventListener('change', (e) => {
    sendCommand('socket', { state: e.target.checked ? 'ON' : 'OFF' });
});

document.getElementById('btn-blinds-up').addEventListener('click', () => {
    sendCommand('blinds', { state: 'UP' });
    document.getElementById('blinds-status-badge').textContent = 'UP';
});

document.getElementById('btn-blinds-stop').addEventListener('click', () => {
    sendCommand('blinds', { state: 'STOP' });
    document.getElementById('blinds-status-badge').textContent = 'IDLE';
});

document.getElementById('btn-blinds-down').addEventListener('click', () => {
    sendCommand('blinds', { state: 'DOWN' });
    document.getElementById('blinds-status-badge').textContent = 'DOWN';
});

function syncRGBPreview() {
    const r = parseInt(document.getElementById('rgb-r').value);
    const g = parseInt(document.getElementById('rgb-g').value);
    const b = parseInt(document.getElementById('rgb-b').value);
    document.getElementById('rgb-r-val').textContent = r;
    document.getElementById('rgb-g-val').textContent = g;
    document.getElementById('rgb-b-val').textContent = b;
    document.getElementById('rgb-preview').style.background = `rgb(${r},${g},${b})`;
}

['rgb-r','rgb-g','rgb-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        syncRGBPreview();
    });
});

document.getElementById('rgb-picker').addEventListener('input', (e) => {
    const hex = e.target.value;
    const r   = parseInt(hex.slice(1,3), 16);
    const g   = parseInt(hex.slice(3,5), 16);
    const b   = parseInt(hex.slice(5,7), 16);
    document.getElementById('rgb-r').value = r;
    document.getElementById('rgb-g').value = g;
    document.getElementById('rgb-b').value = b;
    syncRGBPreview();
});

document.getElementById('rgb-preview').addEventListener('click', () => {
    document.getElementById('rgb-picker').click();
});

document.getElementById('btn-send-rgb').addEventListener('click', () => {
    const r = parseInt(document.getElementById('rgb-r').value);
    const g = parseInt(document.getElementById('rgb-g').value);
    const b = parseInt(document.getElementById('rgb-b').value);
    sendCommand('rgb', { r, g, b });
});

document.getElementById('btn-add-rule').addEventListener('click', () => {
    document.getElementById('rule-form-wrap').classList.remove('hidden');
});

document.getElementById('btn-cancel-rule').addEventListener('click', () => {
    document.getElementById('rule-form-wrap').classList.add('hidden');
    clearRuleForm();
});

document.getElementById('btn-save-rule').addEventListener('click', async () => {
    const name      = document.getElementById('rule-name').value.trim();
    const sensor    = document.getElementById('rule-sensor').value;
    const operator  = document.getElementById('rule-operator').value;
    const threshold = parseFloat(document.getElementById('rule-threshold').value);
    const actuator  = document.getElementById('rule-actuator').value;
    const action    = document.getElementById('rule-action').value;

    if (!name || isNaN(threshold)) {
        toast('Bitte alle Felder ausfüllen', 'error');
        return;
    }

    try {
        await fetch('/api/rules', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, sensor, operator, threshold, actuator, action })
        });
        toast('Regel gespeichert', 'success');
        document.getElementById('rule-form-wrap').classList.add('hidden');
        clearRuleForm();
        loadRules();
    } catch {
        toast('Fehler beim Speichern', 'error');
    }
});

function clearRuleForm() {
    document.getElementById('rule-name').value = '';
    document.getElementById('rule-threshold').value = '';
}

const SENSOR_LABELS   = { temperature: 'Temperatur', humidity: 'Feuchte', co2: 'CO₂', light: 'Licht', motion: 'Bewegung' };
const SENSOR_UNITS    = { temperature: '°C', humidity: '%', co2: 'ppm', light: 'lux', motion: '' };
const ACTUATOR_LABELS = { light: 'Deckenlicht', hvac: 'Klimaanlage', socket: 'Steckdose', blinds: 'Jalousien' };
const OP_LABELS       = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };

async function loadRules() {
    try {
        const rules = await fetch('/api/rules').then(r => r.json());
        const list  = document.getElementById('rules-list');
        const empty = document.getElementById('rules-empty');

        list.innerHTML = '';

        if (!rules.length) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        rules.forEach(rule => {
            const sensorLabel   = SENSOR_LABELS[rule.sensor]   || rule.sensor;
            const unit          = SENSOR_UNITS[rule.sensor]     || '';
            const actuatorLabel = ACTUATOR_LABELS[rule.actuator]|| rule.actuator;
            const opLabel       = OP_LABELS[rule.operator]      || rule.operator;

            const item = document.createElement('div');
            item.className = `rule-item ${rule.enabled ? '' : 'disabled'}`;
            item.dataset.id = rule.id;
            item.innerHTML = `
                <div class="rule-name">${rule.name}</div>
                <span class="rule-desc">
                    Wenn ${sensorLabel} ${opLabel} ${rule.threshold}${unit} → ${actuatorLabel} ${rule.action}
                </span>
                <div class="rule-actions">
                    <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${rule.id}" data-enabled="${rule.enabled}">
                        ${rule.enabled ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${rule.id}">Löschen</button>
                </div>
            `;
            list.appendChild(item);
        });

        list.querySelectorAll('[data-action="toggle"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id      = parseInt(btn.dataset.id);
                const enabled = btn.dataset.enabled === '1';
                await fetch(`/api/rules/${id}/toggle`, {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ enabled: !enabled })
                });
                loadRules();
            });
        });

        list.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                await fetch(`/api/rules/${id}`, { method: 'DELETE' });
                toast('Regel gelöscht', 'info');
                loadRules();
            });
        });
    } catch {
        toast('Fehler beim Laden der Regeln', 'error');
    }
}

window.loadRules = loadRules;

document.getElementById('btn-ota-trigger').addEventListener('click', async () => {
    const url = document.getElementById('ota-url').value.trim();
    if (!url) { toast('Bitte Firmware-URL eingeben', 'error'); return; }

    try {
        await fetch('/api/actuators/room1/ota', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ url })
        });
        toast('OTA Update angestoßen', 'success');
    } catch {
        toast('OTA Fehler', 'error');
    }
});

syncRGBPreview();
