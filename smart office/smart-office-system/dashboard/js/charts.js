const CHART_DEFAULTS = {
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: 'index', intersect: false },
    plugins: {
        legend:  { display: false },
        tooltip: {
            backgroundColor: '#141826',
            borderColor:     'rgba(255,255,255,0.08)',
            borderWidth:     1,
            titleColor:      '#94a3b8',
            bodyColor:       '#f1f5f9',
            padding:         10,
            cornerRadius:    8,
        }
    },
    scales: {
        x: {
            ticks:   { color: '#475569', font: { size: 10 }, maxTicksLimit: 8 },
            grid:    { color: 'rgba(255,255,255,0.04)' },
            border:  { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
            ticks:  { color: '#475569', font: { size: 10 } },
            grid:   { color: 'rgba(255,255,255,0.04)' },
            border: { color: 'rgba(255,255,255,0.06)' }
        },
        y2: {
            position: 'right',
            ticks:    { color: '#475569', font: { size: 10 } },
            grid:     { drawOnChartArea: false },
            border:   { color: 'rgba(255,255,255,0.06)' }
        }
    }
};

let chartTempHum  = null;
let chartCO2Light = null;
let selectedHours = 1;

const demoBuffers = {
    labels:   [],
    temp:     [],
    humidity: [],
    co2:      [],
    light:    []
};

function makeGradient(ctx, color, alpha = 0.3) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
    gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
    return gradient;
}

function initCharts() {
    const ctxTH = document.getElementById('chart-temp-hum').getContext('2d');
    chartTempHum = new Chart(ctxTH, {
        type: 'line',
        data: {
            labels:   [],
            datasets: [
                {
                    label:           'Temperatur (°C)',
                    data:            [],
                    borderColor:     '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    borderWidth:     2,
                    pointRadius:     0,
                    pointHoverRadius:4,
                    tension:         0.4,
                    fill:            true,
                    yAxisID:         'y',
                },
                {
                    label:           'Luftfeuchtigkeit (%)',
                    data:            [],
                    borderColor:     '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    borderWidth:     2,
                    pointRadius:     0,
                    pointHoverRadius:4,
                    tension:         0.4,
                    fill:            true,
                    yAxisID:         'y2',
                }
            ]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                ...CHART_DEFAULTS.scales,
                y:  { ...CHART_DEFAULTS.scales.y,  title: { display: true, text: '°C', color: '#475569', font: { size: 10 } } },
                y2: { ...CHART_DEFAULTS.scales.y2, title: { display: true, text: '%',  color: '#475569', font: { size: 10 } } }
            }
        }
    });

    const ctxCL = document.getElementById('chart-co2-light').getContext('2d');
    chartCO2Light = new Chart(ctxCL, {
        type: 'line',
        data: {
            labels:   [],
            datasets: [
                {
                    label:           'CO₂ (ppm)',
                    data:            [],
                    borderColor:     '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderWidth:     2,
                    pointRadius:     0,
                    pointHoverRadius:4,
                    tension:         0.4,
                    fill:            true,
                    yAxisID:         'y',
                },
                {
                    label:           'Licht (lux)',
                    data:            [],
                    borderColor:     '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.08)',
                    borderWidth:     2,
                    pointRadius:     0,
                    pointHoverRadius:4,
                    tension:         0.4,
                    fill:            true,
                    yAxisID:         'y2',
                }
            ]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                ...CHART_DEFAULTS.scales,
                y:  { ...CHART_DEFAULTS.scales.y,  title: { display: true, text: 'ppm', color: '#475569', font: { size: 10 } } },
                y2: { ...CHART_DEFAULTS.scales.y2, title: { display: true, text: 'lux', color: '#475569', font: { size: 10 } } }
            }
        }
    });
}

async function loadHistoryCharts() {
    if (state.demoMode) {
        populateChartsWithDemoBuffer();
        return;
    }

    const now  = new Date();
    const from = new Date(now - selectedHours * 3600 * 1000).toISOString();
    const to   = now.toISOString();

    try {
        const [tempData, humData, co2Data, lightData] = await Promise.all([
            fetch(`/api/sensors/history/temperature?from=${from}&to=${to}&limit=200`).then(r => r.json()),
            fetch(`/api/sensors/history/humidity?from=${from}&to=${to}&limit=200`).then(r => r.json()),
            fetch(`/api/sensors/history/co2?from=${from}&to=${to}&limit=200`).then(r => r.json()),
            fetch(`/api/sensors/history/light?from=${from}&to=${to}&limit=200`).then(r => r.json()),
        ]);

        const labels = tempData.map(d => {
            const t = new Date(d.timestamp);
            return t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        });

        chartTempHum.data.labels               = labels;
        chartTempHum.data.datasets[0].data     = tempData.map(d => d.value);
        chartTempHum.data.datasets[1].data     = humData.map(d => d.value);
        chartTempHum.update('active');

        const labels2 = co2Data.map(d => {
            const t = new Date(d.timestamp);
            return t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        });

        chartCO2Light.data.labels               = labels2;
        chartCO2Light.data.datasets[0].data     = co2Data.map(d => d.value);
        chartCO2Light.data.datasets[1].data     = lightData.map(d => d.value);
        chartCO2Light.update('active');
    } catch {
        populateChartsWithDemoBuffer();
    }
}

function populateChartsWithDemoBuffer() {
    chartTempHum.data.labels            = [...demoBuffers.labels];
    chartTempHum.data.datasets[0].data  = [...demoBuffers.temp];
    chartTempHum.data.datasets[1].data  = [...demoBuffers.humidity];
    chartTempHum.update('active');

    chartCO2Light.data.labels           = [...demoBuffers.labels];
    chartCO2Light.data.datasets[0].data = [...demoBuffers.co2];
    chartCO2Light.data.datasets[1].data = [...demoBuffers.light];
    chartCO2Light.update('active');
}

window.updateDemoCharts = function({ t, h, co2, light }) {
    const label = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const MAX   = 60;

    demoBuffers.labels.push(label);
    demoBuffers.temp.push(parseFloat(t.toFixed(2)));
    demoBuffers.humidity.push(parseFloat(h.toFixed(2)));
    demoBuffers.co2.push(Math.round(co2));
    demoBuffers.light.push(Math.round(light));

    if (demoBuffers.labels.length > MAX) {
        Object.keys(demoBuffers).forEach(k => demoBuffers[k].shift());
    }

    if (document.getElementById('section-history')?.classList.contains('active')) {
        populateChartsWithDemoBuffer();
    }
};

document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedHours = parseInt(btn.dataset.hours);
        loadHistoryCharts();
    });
});

document.getElementById('btn-refresh-charts')?.addEventListener('click', loadHistoryCharts);

window.loadHistoryCharts = loadHistoryCharts;

initCharts();
