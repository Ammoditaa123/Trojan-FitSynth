import { showToast } from './ui.js';

const workouts = [
    {
        id: 'full_body_45',
        title: 'Full Body 45',
        difficulty: 'Intermediate',
        duration: 45,
        tags: ['Full body', 'Strength', 'Hypertrophy'],
        description: 'A balanced 45-minute session hitting all major muscle groups. Mix of compound lifts and accessory work.',
        image: 'https://images.unsplash.com/photo-1720788073779-04a9e709935c?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'upper_strength',
        title: 'Upper Strength',
        difficulty: 'Advanced',
        duration: 40,
        tags: ['Upper body', 'Strength'],
        description: 'Focus on pushing/pulling heavy with proper rest. Main lifts plus targeted accessory movements.',
        image: 'https://plus.unsplash.com/premium_photo-1661751786773-fc11e8b34e46?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'lower_power',
        title: 'Lower Power',
        difficulty: 'Intermediate',
        duration: 35,
        tags: ['Lower body', 'Power', 'Explosive'],
        description: 'Jump variations, squats and posterior chain work to build explosive leg strength.',
        image: 'https://images.unsplash.com/photo-1602611000981-f9e33f0d1f39?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'quick_cardio_20',
        title: 'Quick Cardio 20',
        difficulty: 'Beginner',
        duration: 20,
        tags: ['Conditioning', 'HIIT', 'Cardio'],
        description: 'Short, high-intensity intervals to get the heart rate up when you\'re short on time.',
        image: 'https://plus.unsplash.com/premium_photo-1664298841219-a2559f8893f3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'mobility_flow',
        title: 'Mobility Flow',
        difficulty: 'All levels',
        duration: 30,
        tags: ['Mobility', 'Recovery'],
        description: 'Controlled flows and stretches designed to improve range of motion and recovery.',
        image: 'https://images.unsplash.com/photo-1614928228253-dc09cbc3b11c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'push_pull_50',
        title: 'Push/Pull Hypertrophy',
        difficulty: 'Intermediate',
        duration: 50,
        tags: ['Push', 'Pull', 'Hypertrophy', 'Upper body'],
        description: 'Supersetted push and pull exercises to maximize volume and time under tension for hypertrophy.',
        image: 'https://plus.unsplash.com/premium_photo-1726328922341-5304b09e00b6?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'core_blast_15',
        title: 'Core Blast 15',
        difficulty: 'Beginner',
        duration: 15,
        tags: ['Core', 'Strength', 'Stability'],
        description: 'Quick focused core routine including planks, anti-rotation and loaded carries.',
        image: 'https://plus.unsplash.com/premium_photo-1726614200794-e97ffef4955c?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D        '
    },
    {
        id: 'sprint_intervals',
        title: 'Sprint Intervals',
        difficulty: 'Advanced',
        duration: 25,
        tags: ['HIIT', 'Sprinting', 'Conditioning'],
        description: 'All-out sprints with recovery intervals for improved speed and conditioning.',
        image: 'https://plus.unsplash.com/premium_photo-1721755972920-9b9f4ee7d044?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D    '
    },
    {
        id: 'yoga_recovery',
        title: 'Yoga Recovery',
        difficulty: 'All levels',
        duration: 40,
        tags: ['Mobility', 'Recovery', 'Yoga'],
        description: 'Gentle yoga sequence focused on recovery, breathing and restoring movement quality.',
        image: 'https://plus.unsplash.com/premium_photo-1674675646725-5b4aca5adb21?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D    '
    },
    {
        id: 'kb_swing_complex',
        title: 'Kettlebell Swing Complex',
        difficulty: 'Intermediate',
        duration: 20,
        tags: ['Kettlebell', 'Power', 'Posterior chain'],
        description: 'Timed kettlebell swing intervals combined with accessory posterior chain work.',
        image: 'https://plus.unsplash.com/premium_photo-1726618574721-3f647278753d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    {
        id: 'band_glute_activation',
        title: 'Band Glute Activation',
        difficulty: 'Beginner',
        duration: 12,
        tags: ['Glutes', 'Activation', 'Warm-up'],
        description: 'Short banded sequence to activate glutes before heavy lower body work or to use for recovery.',
        image: 'https://images.unsplash.com/photo-1585834830884-392089dfd9f6?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    }
];

function createTagHtml(tag) {
    return `<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mr-2">${tag}</span>`;
}

function getPlaceholderForTitle(title) {
    return `https://via.placeholder.com/480x260?text=${encodeURIComponent(title)}`;
}

// Generate an open-source image URL using Unsplash Source based on tags/title
function getOpenSourceImage(w) {
    const tags = (w.tags && w.tags.length) ? w.tags.slice(0, 3).join(',') : w.title.split(' ').slice(0, 3).join(',');
    // Use Unsplash Source to get a relevant image; size matches placeholder used elsewhere
    return `https://source.unsplash.com/480x260/?${encodeURIComponent(tags)}`;
}

function renderWorkouts() {
    const grid = document.getElementById('workoutGrid');
    grid.innerHTML = '';

    const q = (document.getElementById('workoutSearch')?.value || '').toLowerCase();
    const diff = (document.getElementById('difficultyFilter')?.value || '').toLowerCase();

    const filtered = workouts.filter(w => {
        if (diff && (w.difficulty || '').toLowerCase() !== diff) return false;
        if (!q) return true;
        const hay = `${w.title} ${w.description} ${w.tags.join(' ')} ${w.difficulty}`.toLowerCase();
        return hay.includes(q);
    });

    filtered.forEach(w => {
        // Prefer a real/open-source image when possible; avoid placeholder.com
        const image = (w.image && !w.image.includes('placeholder.com')) ? w.image : getOpenSourceImage(w);
        const card = document.createElement('div');
        card.className = 'bg-white p-0 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 transition-transform duration-200 ease-out overflow-hidden';
        card.innerHTML = `
      <div class="relative h-36 w-full overflow-hidden bg-gray-100">
        <img src="${image}" alt="${w.title}" class="w-full h-full object-cover" loading="lazy" />
        <div class="absolute top-2 right-2 bg-white/90 text-xs px-2 py-1 rounded text-gray-800 font-semibold">${w.duration} min</div>
      </div>
      <div class="p-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">${w.title}</h3>
            <div class="text-xs text-gray-500 mt-1">${w.difficulty} • ${w.tags.join(', ')}</div>
          </div>
          <div class="text-right text-xs text-gray-500">${w.tags.map(t => t[0]).join('')}</div>
        </div>
        <p class="text-sm text-gray-700 mt-3 line-clamp-3">${w.description}</p>
        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center flex-wrap">${w.tags.map(createTagHtml).join('')}</div>
          <div class="flex gap-2">
            <button class="viewBtn border border-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-50" data-id="${w.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>View</button>
            <button class="useBtn px-3 py-1 rounded text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" data-id="${w.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>Use</button>
          </div>
        </div>
      </div>
    `;

        grid.appendChild(card);
    });
}

function showModal(html) {
    const modal = document.getElementById('modal');
    document.getElementById('modalContent').innerHTML = html;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

function wireEvents() {
    document.getElementById('workoutGrid').addEventListener('click', (e) => {
        const view = e.target.closest('.viewBtn');
        const use = e.target.closest('.useBtn');
        if (view) {
            const id = view.dataset.id;
            const w = workouts.find(x => x.id === id);
            const image = w.image || getPlaceholderForTitle(w.title);
            showModal(`<div class="grid sm:grid-cols-3 gap-4">
        <div class="sm:col-span-1"><img src="${image}" class="w-full h-36 object-cover rounded"/></div>
        <div class="sm:col-span-2">
          <h3 class="text-xl font-semibold">${w.title}</h3>
          <div class="text-xs text-gray-500 mt-1">${w.difficulty} • ${w.duration} min</div>
          <div class="mt-3 text-sm text-gray-700">${w.description}</div>
          <div class="mt-4">${w.tags.map(createTagHtml).join('')}</div>
          <div class="mt-6 flex gap-2">
            <button id="modalUse" class="bg-indigo-600 text-white px-3 py-1 rounded">Use in plan</button>
            <button id="modalClose2" class="bg-gray-100 px-3 py-1 rounded">Close</button>
          </div>
        </div>
      </div>`);

            // attach modal buttons
            setTimeout(() => {
                document.getElementById('modalUse').addEventListener('click', () => {
                    localStorage.setItem('fitsynth:selectedWorkout', JSON.stringify(w));
                    showToast('Workout saved — returning to Profile...', { duration: 800, variant: 'success' });
                    setTimeout(() => window.location.href = 'index.html#form', 700);
                });
                document.getElementById('modalClose2').addEventListener('click', hideModal);
            }, 50);
        }
        if (use) {
            const id = use.dataset.id;
            const w = workouts.find(x => x.id === id);
            localStorage.setItem('fitsynth:selectedWorkout', JSON.stringify(w));
            showToast('Workout saved — returning to Profile...', { duration: 800, variant: 'success' });
            setTimeout(() => window.location.href = 'index.html#form', 700);
        }
    });

    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') hideModal();
    });

    // search & filters
    const search = document.getElementById('workoutSearch');
    const diff = document.getElementById('difficultyFilter');
    const clear = document.getElementById('clearFilters');
    if (search) search.addEventListener('input', () => renderWorkouts());
    if (diff) diff.addEventListener('change', () => renderWorkouts());
    if (clear) clear.addEventListener('click', () => { if (search) search.value = ''; if (diff) diff.value = ''; renderWorkouts(); });
}

// On page load render and wire
window.addEventListener('DOMContentLoaded', () => {
    renderWorkouts();
    wireEvents();


    // If the user returns from 'Use in plan', show a subtle notice
    const saved = localStorage.getItem('fitsynth:selectedWorkout');
    if (saved) {
        showToast('You have a saved workout ready to apply on the Profile page.', { duration: 2500 });
    }
});
