import { showToast } from './ui.js';

// DOM refs
const profileForm = document.getElementById('profileForm');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

const _bmiEl = document.getElementById('bmiChart');
const bmiChartCtx = _bmiEl ? _bmiEl.getContext('2d') : null;
const _weeklyEl = document.getElementById('weeklyLoadChart');
const weeklyLoadCtx = _weeklyEl ? _weeklyEl.getContext('2d') : null;
let bmiChart, weeklyChart;

function readInputs() {
    const base = {
        name: document.getElementById('name').value || 'Participant',
        age: Number(document.getElementById('age').value || 30),
        sex: document.getElementById('sex').value,
        activity: document.getElementById('activity').value,
        height: Number(document.getElementById('height').value || 170),
        weight: Number(document.getElementById('weight').value || 70),
        timeOfDay: document.getElementById('timeOfDay').value,
        daysPerWeek: Number(document.getElementById('daysPerWeek').value || 3),
        sessionMinutes: Number(document.getElementById('sessionMinutes').value || 30),
        fatigue: Number(document.getElementById('fatigue').value || 2),
        goal: document.getElementById('goal').value,
        notes: document.getElementById('notes').value
    };
    // Attach selected workout from Workouts page (if any)
    try {
        const saved = localStorage.getItem('fitsynth:selectedWorkout');
        if (saved) base.selectedWorkout = JSON.parse(saved);
    } catch (e) {
        console.warn('Could not parse selected workout', e);
    }
    return base;
}

function renderExplanation(text) {
    const el = document.getElementById('explanation');
    if (!el) return;
    el.innerHTML = `<pre class="whitespace-pre-wrap text-sm">${escapeHtml(text)}</pre>`;
}

function renderPlan(planObj, inputs) {
    const planList = document.getElementById('planList');
    if (!planList) return;
    planList.innerHTML = '';

    // Warmup
    const warmDiv = document.createElement('div');
    warmDiv.className = 'p-3 border rounded';
    warmDiv.innerHTML = `<strong>Warm-up</strong><div class="text-sm text-gray-700">${planObj.plan.warmup.map(w => `${w.name} — ${w.duration} min`).join('<br>')}</div>`;
    planList.appendChild(warmDiv);

    // Main parts
    planObj.plan.mainParts.forEach(mp => {
        const wrap = document.createElement('div');
        wrap.className = 'p-3 border rounded';
        let html = `<strong>${mp.section}</strong><div class="text-sm text-gray-700">Estimated ${mp.minutes} min</div><ul class="mt-2">`;
        mp.items.forEach(it => {
            if (it.sets) {
                html += `<li>${it.name} — ${it.sets} sets x ${it.reps} reps</li>`;
            } else if (it.durationMin) {
                html += `<li>${it.name} — ${it.durationMin} min</li>`;
            } else {
                html += `<li>${it.name}</li>`;
            }
        });
        html += '</ul>';
        wrap.innerHTML = html;
        planList.appendChild(wrap);
    });

    // Cooldown
    const cdDiv = document.createElement('div');
    cdDiv.className = 'p-3 border rounded';
    cdDiv.innerHTML = `<strong>Cooldown</strong><div class="text-sm text-gray-700">${planObj.plan.cooldown.map(w => `${w.name} — ${w.duration} min`).join('<br>')}</div>`;
    planList.appendChild(cdDiv);

    // Schedule
    const scheduleList = document.getElementById('scheduleList');
    scheduleList.innerHTML = '';
    planObj.schedule.schedule.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.day} (${s.time}) — load ${s.load}. Notes: ${s.notes}`;
        scheduleList.appendChild(li);
    });

    // Quick metrics
    const bmiEl = document.getElementById('bmiVal'); if (bmiEl) bmiEl.innerText = planObj.meta.metrics.bmi;
    const fitEl = document.getElementById('fitnessVal'); if (fitEl) fitEl.innerText = planObj.meta.metrics.fitnessScore;
    const sugEl = document.getElementById('suggestedSessions'); if (sugEl) sugEl.innerText = planObj.schedule.adjustedDays;
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderCharts(charts) {
    // BMI chart (mock weeks)
    const labels = charts.bmiHistory.map(p => p.week);
    const bmiVals = charts.bmiHistory.map(p => p.bmi);
    if (bmiChart && bmiChart.destroy) bmiChart.destroy();
    if (bmiChartCtx) {
        bmiChart = new Chart(bmiChartCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{ label: 'BMI', data: bmiVals, borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', tension: 0.3 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // Weekly load bar chart
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (weeklyChart && weeklyChart.destroy) weeklyChart.destroy();
    if (weeklyLoadCtx) {
        weeklyChart = new Chart(weeklyLoadCtx, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{ label: 'Load', data: charts.weeklyLoad, backgroundColor: '#06B6D4' }]
            },
            options: { responsive: true }
        });
    }
}

function saveLocally(inputs, planObj) {
    const key = `fitsynth:${inputs.name || 'participant'}:${new Date().toISOString()}`;
    const payload = { inputs, planObj };
    localStorage.setItem(key, JSON.stringify(payload));
    // also update latestPlan so Plan and Progress pages pick it up
    try { localStorage.setItem('fitsynth:latestPlan', JSON.stringify(payload)); window.dispatchEvent(new Event('fitsynth:plansUpdated')); } catch (e) { console.warn('Could not set latestPlan', e); }
    showToast('Saved locally in browser storage.', { duration: 2000, variant: 'success' });
}

// Wire handlers
generateBtn.addEventListener('click', async () => {
    const inputs = readInputs();
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin mr-2"></i>Generating...';
    
    try {
        // Call backend API
        const response = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(inputs)
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const planObj = await response.json();

        // persist latest plan so the Results page can show it
        try {
            const payload = { inputs, planObj };
            localStorage.setItem('fitsynth:latestPlan', JSON.stringify(payload));
            window.dispatchEvent(new Event('fitsynth:plansUpdated'));
        } catch (e) { console.warn('Could not save latest plan', e); }

        // navigate to results page
        window.location.href = 'results.html';
    } catch (error) {
        console.error('Error generating plan:', error);
        showToast('Failed to generate plan. Please try again.', { variant: 'error', duration: 3000 });
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="bx bxs-play mr-2 text-lg" aria-hidden="true"></i>Generate Routine';
    }
});

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const inputs = readInputs();
        
        // Show loading state
        saveBtn.disabled = true;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin mr-2"></i>Saving...';
        
        try {
            // Call backend API
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inputs)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const planObj = await response.json();
            saveLocally(inputs, planObj);
        } catch (error) {
            console.error('Error generating plan:', error);
            showToast('Failed to generate plan. Please try again.', { variant: 'error', duration: 3000 });
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });
}

resetBtn.addEventListener('click', () => {
    profileForm.reset();
    const f = document.getElementById('fatigueVal'); if (f) f.innerText = '2';
    const expl = document.getElementById('explanation'); if (expl) expl.innerHTML = '<p class="text-sm text-gray-600">No plan generated yet. Fill the profile and click "Generate Routine".</p>';
    const pl = document.getElementById('planList'); if (pl) pl.innerHTML = '';
    const sl = document.getElementById('scheduleList'); if (sl) sl.innerHTML = '';
    if (bmiChart && bmiChart.destroy) bmiChart.destroy();
    if (weeklyChart && weeklyChart.destroy) weeklyChart.destroy();
});

// Initialise a demo plan on load and handle selected workout from Workouts page
window.addEventListener('DOMContentLoaded', () => {
    // icons are provided by Boxicons CSS (no JS required)

    // show selected workout (if any) saved by the Workouts page
    const saved = localStorage.getItem('fitsynth:selectedWorkout');
    if (saved) {
        try {
            const w = JSON.parse(saved);
            const explanation = document.getElementById('explanation');
            if (explanation) {
                explanation.innerHTML = `
        <div class="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm card">
          <strong>Saved workout:</strong> ${w.title} — ${w.duration} min
          <div class="mt-3 flex gap-2">
            <button id="applyWorkoutBtn" class="btn btn-primary px-3 py-1"><i class="bx bxs-check mr-2" aria-hidden="true"></i>Apply</button>
            <button id="clearWorkoutBtn" class="btn btn-ghost px-3 py-1"><i class="bx bx-x mr-2" aria-hidden="true"></i>Clear</button>
          </div>
        </div>
      `;


                document.getElementById('applyWorkoutBtn').addEventListener('click', () => {
                    document.getElementById('sessionMinutes').value = w.duration;
                    document.getElementById('fatigue').value = 2;
                    document.getElementById('fatigueVal').innerText = '2';
                    showToast(`Applied ${w.title} duration to session time.`, { duration: 2000, variant: 'success' });
                });

                document.getElementById('clearWorkoutBtn').addEventListener('click', () => {
                    localStorage.removeItem('fitsynth:selectedWorkout');
                    explanation.innerHTML = '<p class="text-sm text-gray-600">No plan generated yet. Fill the profile and click "Generate Routine".</p>';
                });
            } else {
                showToast(`Saved workout: ${w.title}`, { variant: 'info' });
            }
        } catch (e) {
            console.warn('Could not parse saved workout', e);
        }
    }

    // enhance selects in the profile form with an animated dropdown
    const enhanceSelect = (sel) => {
        if (!sel) return;
        if (sel.dataset.enhanced) return; // only once
        sel.dataset.enhanced = '1';

        // create the container and trigger element
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-container';
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.innerHTML = `<span class="value">${sel.options[sel.selectedIndex]?.text || ''}</span><span class="caret"></span>`;

        // panel
        const panel = document.createElement('div');
        panel.className = 'custom-select-panel';
        panel.setAttribute('role', 'listbox');
        Array.from(sel.options).forEach((opt, idx) => {
            const o = document.createElement('div');
            o.className = 'custom-select-option';
            o.setAttribute('role', 'option');
            o.setAttribute('data-value', opt.value);
            if (opt.selected) o.setAttribute('aria-selected', 'true');
            o.textContent = opt.text;
            o.addEventListener('click', () => {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change'));
                wrapper.querySelector('.value').textContent = opt.text;
                Array.from(panel.querySelectorAll('.custom-select-option')).forEach(x => x.setAttribute('aria-selected', 'false'));
                o.setAttribute('aria-selected', 'true');
                closePanel();
            });
            panel.appendChild(o);
        });

        // insert into DOM (put wrapper before select)
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(trigger);
        wrapper.appendChild(panel);
        wrapper.appendChild(sel);
        sel.style.position = 'absolute'; sel.style.opacity = 0; sel.style.pointerEvents = 'none'; sel.style.height = '0'; sel.style.width = '0';

        const openPanel = () => {
            // compute bounding rect and position panel as fixed to avoid ancestor clipping
            try {
                const rect = trigger.getBoundingClientRect();
                panel.style.position = 'fixed';
                panel.style.left = rect.left + 'px';
                panel.style.top = (rect.bottom + 8) + 'px';
                panel.style.minWidth = rect.width + 'px';
                panel.style.right = 'auto';
                panel.style.zIndex = 9999;
            } catch (e) {
                // fallback to default (absolute inside wrapper)
                panel.style.position = '';
                panel.style.left = '';
                panel.style.top = '';
                panel.style.minWidth = '';
                panel.style.right = '';
                panel.style.zIndex = '';
            }
            panel.classList.add('open'); trigger.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
        };
        const closePanel = () => {
            panel.classList.remove('open'); trigger.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false');
            // reset any inline positioning applied when opened
            panel.style.position = '';
            panel.style.left = '';
            panel.style.top = '';
            panel.style.minWidth = '';
            panel.style.right = '';
            panel.style.zIndex = '';
        };

        trigger.addEventListener('click', (e) => { e.stopPropagation(); if (panel.classList.contains('open')) closePanel(); else { closeAllPanels(); openPanel(); } });
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); openPanel(); panel.querySelector('.custom-select-option')?.focus(); }
            if (e.key === 'Enter') { e.preventDefault(); if (panel.classList.contains('open')) closePanel(); else openPanel(); }
            if (e.key === 'Escape') { closePanel(); }
        });

        // keyboard navigation inside panel
        panel.addEventListener('keydown', (e) => {
            const items = Array.from(panel.querySelectorAll('.custom-select-option'));
            const idx = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); const next = items[idx + 1] || items[0]; next.focus(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); const prev = items[idx - 1] || items[items.length - 1]; prev.focus(); }
            if (e.key === 'Enter') { e.preventDefault(); document.activeElement.click(); }
            if (e.key === 'Escape') { closePanel(); trigger.focus(); }
        });

        // make options focusable
        panel.querySelectorAll('.custom-select-option').forEach(o => { o.setAttribute('tabindex', '0'); });

        // close when clicking outside
        const onDocClick = (ev) => { if (!wrapper.contains(ev.target)) closePanel(); };
        document.addEventListener('click', onDocClick);

        // expose for cleanup if needed
        sel._enhanceCleanup = () => { document.removeEventListener('click', onDocClick); };
    };

    const closeAllPanels = () => { document.querySelectorAll('.custom-select-panel.open').forEach(p => { p.classList.remove('open'); const tr = p.parentNode.querySelector('.custom-select-trigger'); if (tr) tr.classList.remove('open'); tr?.setAttribute('aria-expanded', 'false'); }); };    // Close panels on window resize/scroll to avoid stale positioning
    window.addEventListener('resize', () => closeAllPanels());
    window.addEventListener('scroll', () => closeAllPanels(), { passive: true });
    // enhance selects inside the profile form
    ['sex', 'activity', 'timeOfDay', 'goal'].forEach(id => {
        const s = document.getElementById(id);
        if (s) enhanceSelect(s);
    });

    // ensure when native select changes (programmatically) the trigger shows updated value
    document.querySelectorAll('#form select').forEach(s => s.addEventListener('change', (e) => {
        const parent = s.parentNode;
        const trigger = parent?.querySelector('.custom-select-trigger .value');
        if (trigger) trigger.textContent = s.options[s.selectedIndex]?.text || '';
    }));
});