// Render progress charts using latest plan data (from localStorage key 'fitsynth:latestPlan')
function safeParse(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

function renderCharts(data) {
    const bmiCtx = document.getElementById('bmiChart').getContext('2d');
    const loadCtx = document.getElementById('weeklyLoadChart').getContext('2d');
    // clear if previously created
    if (window._progressBmiChart) window._progressBmiChart.destroy();
    if (window._progressLoadChart) window._progressLoadChart.destroy();

    const bmiHistory = data?.planObj?.charts?.bmiHistory || [
        { week: 'W-4', bmi: 24.5 }, { week: 'W-3', bmi: 24.6 }, { week: 'W-2', bmi: 24.4 }, { week: 'W-1', bmi: 24.3 }
    ];
    const weeks = bmiHistory.map(p => p.week);
    const bmiVals = bmiHistory.map(p => p.bmi);

    window._progressBmiChart = new Chart(bmiCtx, {
        type: 'line',
        data: { labels: weeks, datasets: [{ label: 'BMI', data: bmiVals, borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.3 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const weeklyLoad = data?.planObj?.charts?.weeklyLoad || [20, 30, 20, 40, 10, 0, 0];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    window._progressLoadChart = new Chart(loadCtx, {
        type: 'bar',
        data: { labels: days, datasets: [{ label: 'Load', data: weeklyLoad, backgroundColor: '#06B6D4' }] },
        options: { responsive: true }
    });
}

function renderMetrics(data) {
    const metricsEl = document.getElementById('metrics');
    const metrics = data?.planObj?.meta?.metrics;
    if (!metrics) {
        metricsEl.innerText = 'No metrics available. Generate a plan on the Profile page to populate metrics.';
        return;
    }
    metricsEl.innerHTML = `BMI: <strong>${metrics.bmi}</strong> • Fitness: <strong>${metrics.fitnessScore}</strong> • Suggested sessions: <strong>${data.planObj?.schedule?.adjustedDays || '—'}</strong>`;
}

window.addEventListener('DOMContentLoaded', () => {
    const latest = safeParse('fitsynth:latestPlan');
    renderCharts(latest);
    renderMetrics(latest);
});