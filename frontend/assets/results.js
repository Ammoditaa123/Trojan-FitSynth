import { showToast } from './ui.js';

const bmiChartCtx = document.getElementById('bmiChart')?.getContext('2d');
const weeklyLoadCtx = document.getElementById('weeklyLoadChart')?.getContext('2d');
let bmiChart, weeklyChart;

function safeParse(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function renderExplanation(text) {
    const el = document.getElementById('explanation');
    el.innerHTML = `<pre class="whitespace-pre-wrap text-sm">${(text || '—')}</pre>`;
}

function renderPlan(planObj) {
    const planList = document.getElementById('planList');
    if (!planList) return;
    planList.innerHTML = '';
    if (!planObj || !planObj.plan) return;

    const warmDiv = document.createElement('div');
    warmDiv.className = 'p-3 rounded border';
    warmDiv.innerHTML = `<strong>Warm-up</strong><div class="text-sm text-gray-700">${(planObj.plan.warmup || []).map(w => `${w.name} — ${w.duration} min`).join('<br>') || '—'}</div>`;
    planList.appendChild(warmDiv);

    (planObj.plan.mainParts || []).forEach(mp => {
        const wrap = document.createElement('div');
        wrap.className = 'p-3 rounded border';
        let html = `<strong>${mp.section}</strong><div class="text-sm text-gray-700">Estimated ${mp.minutes} min</div><ul class="mt-2">`;
        mp.items.forEach(it => {
            if (it.sets) html += `<li>${it.name} — ${it.sets} x ${it.reps}</li>`;
            else if (it.durationMin) html += `<li>${it.name} — ${it.durationMin} min</li>`;
            else html += `<li>${it.name}</li>`;
        });
        html += '</ul>';
        wrap.innerHTML = html;
        planList.appendChild(wrap);
    });

    // cooldown
    const cdDiv = document.createElement('div');
    cdDiv.className = 'p-3 rounded border';
    cdDiv.innerHTML = `<strong>Cooldown</strong><div class="text-sm text-gray-700">${(planObj.plan.cooldown || []).map(w => `${w.name} — ${w.duration} min`).join('<br>') || '—'}</div>`;
    planList.appendChild(cdDiv);

    // schedule
    const scheduleList = document.getElementById('scheduleList');
    scheduleList.innerHTML = '';
    (planObj.schedule?.schedule || []).forEach(s => {
        const li = document.createElement('li'); li.textContent = `${s.day} (${s.time}) — load ${s.load}. Notes: ${s.notes}`; scheduleList.appendChild(li);
    });
}

function renderCharts(charts, meta) {
    if (!charts) return;
    // BMI line
    if (bmiChart) bmiChart.destroy();
    const labels = (charts.bmiHistory || []).map(p => p.week);
    const bmiVals = (charts.bmiHistory || []).map(p => p.bmi);
    if (bmiChartCtx) bmiChart = new Chart(bmiChartCtx, { type: 'line', data: { labels, datasets: [{ label: 'BMI', data: bmiVals, borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.08)', tension: 0.3 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });

    // weekly load
    if (weeklyChart) weeklyChart.destroy();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (weeklyLoadCtx) weeklyChart = new Chart(weeklyLoadCtx, { type: 'bar', data: { labels: days, datasets: [{ label: 'Load', data: charts.weeklyLoad || [], backgroundColor: '#06B6D4' }] }, options: { responsive: true } });

    // quick metrics
    document.getElementById('bmiVal').innerText = meta?.metrics?.bmi ?? '—';
    document.getElementById('fitnessVal').innerText = meta?.metrics?.fitnessScore ?? '—';
    document.getElementById('suggestedSessions').innerText = (charts?.suggestedSessions ?? meta?.suggestedSessions) ?? '—';
}

window.addEventListener('DOMContentLoaded', () => {
    const payload = safeParse('fitsynth:latestPlan');
    if (!payload) {
        document.getElementById('explanation').innerHTML = '<div class="text-sm text-gray-600">No plan found. Generate one on the Profile page.</div>';
        return;
    }
    const { inputs, planObj } = payload;
    renderExplanation(planObj.explanation);
    renderPlan(planObj);
    renderCharts(planObj.charts, planObj.meta);
    // render diet recommendations (reflecting the generated plan)
    renderDiet(planObj);

    // helper: render a small macro mini-pie for a meal
    function renderMiniPie(canvas, meal) {
        try {
            const protCal = (meal.protein || 0) * 4;
            const carbCal = (meal.carbs || 0) * 4;
            const fatCal = (meal.fat || 0) * 9;
            const total = Math.max(1, protCal + carbCal + fatCal);
            const data = [Math.round((carbCal / total) * 100), Math.round((protCal / total) * 100), Math.round((fatCal / total) * 100)];
            if (canvas._miniChart) canvas._miniChart.destroy();
            const ctx = canvas.getContext('2d');
            canvas._miniChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['C', 'P', 'F'], datasets: [{ data, backgroundColor: ['#06B6D4', '#4F46E5', '#F59E0B'] }] },
                options: { maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } } } }
            });
        } catch (e) { console.warn('mini pie error', e); }
    }

    function renderDiet(p) {
        const dietSummary = document.getElementById('dietSummary');
        const dietMeals = document.getElementById('dietMeals');
        if (!dietSummary || !dietMeals) return;
        const d = p.diet;
        if (!d) {
            dietSummary.innerHTML = 'No diet recommended yet. Generate a plan to see diet suggestions.';
            dietMeals.innerHTML = '';
            return;
        }

        dietSummary.innerHTML = `
          <div>
            <div class="text-sm text-gray-700">Daily calories: <strong>${d.calories} kcal</strong></div>
            <div class="mt-2 text-sm text-gray-700">Macros: <strong>${Math.round(d.macros.proteinPct)}% P</strong> / <strong>${Math.round(d.macros.carbsPct)}% C</strong> / <strong>${Math.round(d.macros.fatPct)}% F</strong></div>
            <div class="mt-3 text-xs text-gray-500">Protein: ${d.macros.protein_g}g • Carbs: ${d.macros.carbs_g}g • Fat: ${d.macros.fat_g}g</div>
            <div class="mt-4 flex justify-center">
              <div class="w-44 h-44 flex items-center justify-center"><canvas id="dailyDietChart" width="176" height="176" aria-label="Daily macro chart"></canvas></div>
            </div>
          </div>
        `;

        dietMeals.innerHTML = '';
        d.meals.forEach((m, idx) => {
            const card = document.createElement('div');
            card.className = 'relative group p-3 border rounded mb-3 cursor-pointer transition transform hover:-translate-y-1 hover:shadow-md duration-200 ease-out focus:-translate-y-1';
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
              <div class="meal-mini absolute top-2 right-2 opacity-0 scale-95 pointer-events-none bg-white rounded p-1 shadow transition transform duration-200 ease-out" style="width:84px;height:84px">
                <canvas id="mealChart-${idx}" width="80" height="80" aria-label="Macro chart for ${m.name}"></canvas>
              </div>
              <div class="text-sm font-semibold">${m.name} — ${m.kcal} kcal</div>
              <div class="text-xs text-gray-600">${m.example}</div>
              <div class="mt-2 text-xs text-gray-500">P:${m.protein}g • C:${m.carbs}g • F:${m.fat}g</div>
            `;
            dietMeals.appendChild(card);

            const canvas = document.getElementById(`mealChart-${idx}`);
            const wrapper = card.querySelector('.meal-mini');
            const ensureChart = () => { if (!canvas) return; if (canvas._rendered) return; try { renderMiniPie(canvas, m); canvas._rendered = true; } catch (e) { console.warn('mini chart', e); } };
            card.addEventListener('mouseenter', () => { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); });
            card.addEventListener('mouseleave', () => { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); });
            card.addEventListener('focusin', () => { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); });
            card.addEventListener('focusout', () => { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); });
            card.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'button') return;
                if (wrapper.classList.contains('opacity-0')) { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); }
                else { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); }
            });
        });

        // render daily donut
        try {
            const dailyCanvas = document.getElementById('dailyDietChart');
            if (dailyCanvas) {
                const totals = (d.meals || []).reduce((acc, m) => {
                    acc.protein += (m.protein || 0);
                    acc.carbs += (m.carbs || 0);
                    acc.fat += (m.fat || 0);
                    return acc;
                }, { protein: 0, carbs: 0, fat: 0 });
                const protCal = totals.protein * 4;
                const carbCal = totals.carbs * 4;
                const fatCal = totals.fat * 9;
                const totalCal = Math.max(1, protCal + carbCal + fatCal);
                const data = [Math.round((carbCal / totalCal) * 100), Math.round((protCal / totalCal) * 100), Math.round((fatCal / totalCal) * 100)];
                const ctx2 = dailyCanvas.getContext('2d');
                if (window._dailyDietChart) window._dailyDietChart.destroy();
                window._dailyDietChart = new Chart(ctx2, {
                    type: 'doughnut',
                    data: { labels: ['Carbs', 'Protein', 'Fat'], datasets: [{ data, backgroundColor: ['#06B6D4', '#4F46E5', '#F59E0B'], borderWidth: 0 }] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                            legend: { position: 'bottom', labels: { boxWidth: 8, padding: 8 } },
                            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${Math.round(ctx.raw)}%` } }
                        }
                    }
                });
            }
        } catch (e) { console.warn('Chart error', e); }
    }

    // wire Save and Export buttons
    const saveBtn = document.getElementById('saveResultBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            try {
                const name = (inputs?.name || 'participant').replace(/\s+/g, '_');
                const key = `fitsynth:${name}:${new Date().toISOString()}`;
                localStorage.setItem(key, JSON.stringify({ inputs, planObj }));
                showToast('Result saved to local storage', { variant: 'success' });
                window.dispatchEvent(new Event('fitsynth:plansUpdated'));
            } catch (e) {
                console.error(e);
                showToast('Failed to save result', { variant: 'error' });
            }
        });
    }

    const exportBtn = document.getElementById('exportResultBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                showToast('Preparing PDF...', { duration: 1200 });
                const payloadEl = document.querySelector('main');
                if (!payloadEl) { showToast('Nothing to export', { variant: 'error' }); return; }
                await new Promise(r => setTimeout(r, 120));
                const canvas = await html2canvas(payloadEl, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 10;
                let pdfWidth = pageWidth - margin * 2;
                let pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                if (pdfHeight > (pageHeight - margin * 2)) {
                    const scale = (pageHeight - margin * 2) / pdfHeight;
                    pdfWidth *= scale;
                    pdfHeight *= scale;
                }
                doc.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
                const name = (inputs?.name || 'participant').replace(/\s+/g, '_');
                const now = new Date().toISOString().slice(0, 10);
                doc.save(`fitsynth-results-${name}-${now}.pdf`);
                showToast('PDF downloaded', { variant: 'success' });
            } catch (e) {
                console.error(e);
                showToast('Error exporting PDF', { variant: 'error' });
            }
        });
    }
});
