import { showToast, confirmModal } from './ui.js';

function safeParse(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

function renderPlanView(data) {
    const el = document.getElementById('planView');
    el.innerHTML = '';
    if (!data || !data.planObj) {
        el.innerHTML = '<div class="bg-white p-4 rounded shadow text-sm text-gray-600">No plan found. Generate a plan on the Profile page.</div>';
        return;
    }

    const inputs = data.inputs || {};
    const p = data.planObj;

    // Explanation
    const expl = document.createElement('div');
    expl.className = 'bg-white p-4 rounded shadow';
    expl.innerHTML = `<strong>Explanation</strong><div class="mt-2 text-sm text-gray-700"><pre class="whitespace-pre-wrap">${escapeHtml(p.explanation || '—')}</pre></div>`;
    el.appendChild(expl);

    // Warmup
    const warm = document.createElement('div');
    warm.className = 'bg-white p-4 rounded shadow';
    warm.innerHTML = `<strong>Warm-up</strong><div class="mt-2 text-sm text-gray-700">${p.plan?.warmup?.map(w => `${w.name} — ${w.duration} min`).join('<br>') || '—'}</div>`;
    el.appendChild(warm);

    // Main
    (p.plan?.mainParts || []).forEach(mp => {
        const wrap = document.createElement('div');
        wrap.className = 'bg-white p-4 rounded shadow';
        let html = `<strong>${mp.section}</strong><div class="text-sm text-gray-700 mt-1">Estimated ${mp.minutes} min</div><ul class="mt-2">`;
        mp.items.forEach(it => {
            if (it.sets) html += `<li>${it.name} — ${it.sets} x ${it.reps}</li>`;
            else if (it.durationMin) html += `<li>${it.name} — ${it.durationMin} min</li>`;
            else html += `<li>${it.name}</li>`;
        });
        html += '</ul>';
        wrap.innerHTML = html;
        el.appendChild(wrap);
    });

    // Cooldown
    const cd = document.createElement('div');
    cd.className = 'bg-white p-4 rounded shadow';
    cd.innerHTML = `<strong>Cooldown</strong><div class="mt-2 text-sm text-gray-700">${p.plan?.cooldown?.map(w => `${w.name} — ${w.duration} min`).join('<br>') || '—'}</div>`;
    el.appendChild(cd);

    // Schedule
    const sched = document.createElement('div');
    sched.className = 'bg-white p-4 rounded shadow';
    sched.innerHTML = '<strong>Schedule</strong>';
    const ul = document.createElement('ul'); ul.className = 'mt-2 text-sm text-gray-700';
    (p.schedule?.schedule || []).forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.day} (${s.time}) — load ${s.load}. Notes: ${s.notes}`;
        ul.appendChild(li);
    });
    sched.appendChild(ul);
    el.appendChild(sched);

    // Quick metrics
    const qm = document.createElement('div');
    qm.className = 'bg-white p-4 rounded shadow';
    qm.innerHTML = `<strong>Quick metrics</strong><div class="mt-2 text-sm text-gray-700">BMI: ${p.meta?.metrics?.bmi || '—'} • Fitness: ${p.meta?.metrics?.fitnessScore || '—'}</div>`;
    el.appendChild(qm);

    // Diet (if present)
    if (p.diet) {
        const dietSummary = document.getElementById('dietSummary');
        const dietMeals = document.getElementById('dietMeals');
        dietSummary.innerHTML = `
          <div>
            <div class="text-sm text-gray-700">Daily calories: <strong>${p.diet.calories} kcal</strong></div>
            <div class="mt-2 text-sm text-gray-700">Macros: <strong>${Math.round(p.diet.macros.proteinPct)}% P</strong> / <strong>${Math.round(p.diet.macros.carbsPct)}% C</strong> / <strong>${Math.round(p.diet.macros.fatPct)}% F</strong></div>
            <div class="mt-3 text-xs text-gray-500">Protein: ${p.diet.macros.protein_g}g • Carbs: ${p.diet.macros.carbs_g}g • Fat: ${p.diet.macros.fat_g}g</div>
            <div class="mt-4 flex justify-center">
              <div class="w-44 h-44 flex items-center justify-center"><canvas id="dailyDietChart" width="176" height="176" aria-label="Daily macro chart"></canvas></div>
            </div>
          </div>
        `;
        dietMeals.innerHTML = '';
        p.diet.meals.forEach((m, idx) => {
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

            // lazy-render mini chart on hover or focus, toggle on click (for touch)
            const canvas = document.getElementById(`mealChart-${idx}`);
            const wrapper = card.querySelector('.meal-mini');
            const ensureChart = () => {
                if (!canvas) return;
                if (canvas._rendered) return;
                try { renderMiniPie(canvas, m); canvas._rendered = true; } catch (e) { console.warn('mini chart', e); }
            };
            card.addEventListener('mouseenter', () => { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); });
            card.addEventListener('mouseleave', () => { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); });
            card.addEventListener('focusin', () => { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); });
            card.addEventListener('focusout', () => { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); });
            card.addEventListener('click', (e) => {
                // on touch devices, toggle visibility
                if (e.target.tagName.toLowerCase() === 'button') return;
                if (wrapper.classList.contains('opacity-0')) { wrapper.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); wrapper.classList.add('opacity-100', 'scale-100'); ensureChart(); }
                else { wrapper.classList.remove('opacity-100', 'scale-100'); wrapper.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); }
            });
        });

        // render charts
        try {
            // daily aggregated chart (sums meals)
            const dailyCanvas = document.getElementById('dailyDietChart');
            if (dailyCanvas) {
                const totals = (p.diet.meals || []).reduce((acc, m) => {
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
    } else {
        const dietSummary = document.getElementById('dietSummary');
        const dietMeals = document.getElementById('dietMeals');
        if (dietSummary) dietSummary.innerHTML = 'No diet recommended yet. Generate a plan to see diet suggestions.';
        if (dietMeals) dietMeals.innerHTML = '';
    }
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function exportPlanPayload(payload) {
    if (!payload || !payload.planObj) { showToast('No plan to export', { variant: 'error' }); return; }
    try {
        // set as latest and render to ensure planView contains it
        localStorage.setItem('fitsynth:latestPlan', JSON.stringify(payload));
        renderPlanView(payload);
        // give the DOM a moment to render
        await new Promise(r => setTimeout(r, 100));
        const el = document.getElementById('planView');
        const canvas = await html2canvas(el, { scale: 2 });
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
        const name = (payload.inputs?.name || 'participant').replace(/\s+/g, '_');
        const now = new Date().toISOString().slice(0, 10);
        doc.save(`fitsynth-plan-${name}-${now}.pdf`);
        showToast('PDF downloaded', { variant: 'success' });
    } catch (e) {
        console.error(e);
        showToast('Error generating PDF', { variant: 'error' });
    }
}

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

// List saved plans from localStorage (keys starting with 'fitsynth:' but not 'fitsynth:latestPlan' or 'fitsynth:selectedWorkout')
function listSavedPlans() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fitsynth:') && k !== 'fitsynth:latestPlan' && k !== 'fitsynth:selectedWorkout');
    const items = keys.map(k => {
        try {
            const payload = JSON.parse(localStorage.getItem(k));
            const ts = k.split(':').slice(-1)[0];
            return { key: k, label: payload?.inputs?.name || k, date: ts, payload };
        } catch (e) { return null; }
    }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    return items;
}

function renderSavedList() {
    const container = document.getElementById('savedList');
    if (!container) return;
    const items = listSavedPlans();
    if (!items.length) {
        container.innerHTML = '<div class="text-sm text-gray-500">No saved plans. Use "Save Locally" on the Profile page.</div>';
        return;
    }
    container.innerHTML = '';
    items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'bg-white p-3 rounded shadow transition transform hover:-translate-y-1 hover:shadow-lg duration-150 ease-out';
        const shortDate = it.date.split('T')[0];
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <div class="text-sm font-semibold">${escapeHtml(it.label)}</div>
                    <div class="text-xs text-gray-500">Saved: ${shortDate}</div>
                </div>
                <div class="flex gap-2">
                    <button class="loadBtn bg-indigo-600 text-white px-3 py-1 rounded text-sm" data-key="${it.key}">Load</button>
                    <button class="exportBtn bg-gray-100 px-3 py-1 rounded text-sm" data-key="${it.key}">Export</button>
                    <button class="delBtn bg-red-50 text-red-600 px-3 py-1 rounded text-sm" data-key="${it.key}">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function wireSavedListEvents() {
    const container = document.getElementById('savedList');
    if (!container) return;
    container.addEventListener('click', async (e) => {
        const load = e.target.closest('.loadBtn');
        const del = e.target.closest('.delBtn');
        const exp = e.target.closest('.exportBtn');
        if (load) {
            const key = load.dataset.key;
            try {
                const payload = JSON.parse(localStorage.getItem(key));
                // set as latest plan and render
                localStorage.setItem('fitsynth:latestPlan', JSON.stringify(payload));
                renderPlanView(payload);
                showToast('Loaded saved plan.', { variant: 'success' });
                // notify others
                window.dispatchEvent(new Event('fitsynth:plansUpdated'));
            } catch (err) { showToast('Could not load plan', { variant: 'error' }); }
        }
        if (exp) {
            const key = exp.dataset.key;
            try {
                const payload = JSON.parse(localStorage.getItem(key));
                await exportPlanPayload(payload);
            } catch (err) { showToast('Could not export plan', { variant: 'error' }); }
        }
        if (del) {
            const key = del.dataset.key;
            const confirmed = await confirmModal({ title: 'Delete saved plan?', message: 'Delete this saved plan — you will be able to undo briefly.', confirmText: 'Delete', cancelText: 'Cancel' });
            if (!confirmed) return;

            // capture current state for undo
            const currentLatest = localStorage.getItem('fitsynth:latestPlan');
            const removedPayload = localStorage.getItem(key);
            const removedWasLatest = currentLatest && removedPayload && currentLatest === removedPayload;

            // perform removal
            localStorage.removeItem(key);
            if (removedWasLatest) {
                localStorage.removeItem('fitsynth:latestPlan');
                renderPlanView(null);
            }
            renderSavedList();

            // show undo toast
            showToast('Deleted saved plan.', {
                variant: 'success',
                duration: 6000,
                actionText: 'Undo',
                action: () => {
                    try {
                        if (removedPayload) {
                            localStorage.setItem(key, removedPayload);
                            if (removedWasLatest) localStorage.setItem('fitsynth:latestPlan', removedPayload);
                            renderSavedList();
                            if (removedWasLatest) renderPlanView(JSON.parse(removedPayload));
                            showToast('Restored saved plan.', { variant: 'success' });
                            window.dispatchEvent(new Event('fitsynth:plansUpdated'));
                        }
                    } catch (e) {
                        console.error('Could not restore plan', e);
                        showToast('Restore failed', { variant: 'error' });
                    }
                }
            });

            window.dispatchEvent(new Event('fitsynth:plansUpdated'));
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const data = safeParse('fitsynth:latestPlan');
    renderPlanView(data);



    const exportBtn = document.getElementById('exportPdf');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const latest = safeParse('fitsynth:latestPlan');
            if (!latest || !latest.planObj) {
                showToast('No plan to export. Generate a plan first.', { variant: 'error' });
                return;
            }
            showToast('Preparing PDF...', { duration: 1200 });
            await exportPlanPayload(latest);
        });
    }

    // show saved plans on load and wire interactions
    renderSavedList();
    wireSavedListEvents();

    // listen for plan updates from other pages (generate/save)
    window.addEventListener('fitsynth:plansUpdated', () => {
        renderSavedList();
        const latest = safeParse('fitsynth:latestPlan');
        renderPlanView(latest);
    });

    // update UI when latest plan is cleared
    const clearBtn = document.getElementById('clearPlan');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('fitsynth:latestPlan');
            showToast('Cleared latest plan.', { variant: 'success' });
            renderPlanView(null);
            window.dispatchEvent(new Event('fitsynth:plansUpdated'));
        });
    }
});