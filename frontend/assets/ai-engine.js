// Lightweight AI-like engine (client-side prototype).
// Replace with server-side model/LLM on scale.
// Exposes: generatePlan(inputs) -> {meta, plan, schedule, explanation, charts}

const ExercisesDB = [
    // id, name, type, difficulty (1-5), target (strength/cardio/mobility)
    { id: 's1', name: 'Bodyweight Squats', type: 'strength', difficulty: 1, target: 'legs' },
    { id: 's2', name: 'Push-ups (knees/full)', type: 'strength', difficulty: 2, target: 'upper' },
    { id: 's3', name: 'Walking / brisk walk', type: 'cardio', difficulty: 1, target: 'cardio' },
    { id: 's4', name: 'Stationary Bike', type: 'cardio', difficulty: 2, target: 'cardio' },
    { id: 's5', name: 'Dumbbell Rows', type: 'strength', difficulty: 3, target: 'upper' },
    { id: 's6', name: 'Plank', type: 'core', difficulty: 2, target: 'core' },
    { id: 's7', name: 'Lunges', type: 'strength', difficulty: 2, target: 'legs' },
    { id: 's8', name: 'Jump Rope', type: 'cardio', difficulty: 4, target: 'cardio' },
    { id: 's9', name: 'Yoga Flow (20m)', type: 'mobility', difficulty: 1, target: 'mobility' },
    { id: 's10', name: 'Interval Treadmill', type: 'cardio', difficulty: 5, target: 'cardio' },
];

// Helper: compute BMI and fitness baseline
function computeMetrics({ height, weight, age, activity }) {
    const m = weight / ((height / 100) ** 2);
    // fitnessScore composite (0-100)
    const activityBoost = { sedentary: -10, light: 0, moderate: 10, active: 18 }[activity] || 0;
    const agePenalty = Math.max(0, (age - 30) * 0.5);
    const bmiPenalty = Math.max(0, (m - 22) * 1.5); // optimal ~22
    const base = 60; // baseline fitness score
    const fitnessScore = Math.max(10, Math.round(base + activityBoost - agePenalty - bmiPenalty));
    return { bmi: Math.round(m * 10) / 10, fitnessScore };
}

// Decide intensity multiplier (0.5-1.2)
function intensityFromInputs({ goal, fatigue, preferredIntensity = 1.0 }) {
    // preference normalised: fatigue 0..10 reduces intensity
    const fatigueFactor = 1 - (fatigue / 12); // up to ~-0.83 if fatigue 10
    const goalFactor = (goal === 'muscle_gain') ? 1.1 : (goal === 'fat_loss' ? 1.05 : (goal === 'endurance' ? 1.0 : 0.95));
    const intensity = Math.max(0.4, Math.min(1.3, preferredIntensity * fatigueFactor * goalFactor));
    return Math.round(intensity * 100) / 100;
}

// Pick exercises matching difficulty and time
function pickExercises(metrics, inputs, intensity) {
    // difficulty budget: map fitnessScore to difficulty target
    const diffBudget = Math.max(1, Math.min(4, Math.round((metrics.fitnessScore - 20) / 20) + 1));
    // allow selected workout to expand session duration if needed
    let sessionMin = Math.max(10, inputs.sessionMinutes);
    const selected = inputs && inputs.selectedWorkout ? inputs.selectedWorkout : null;
    if (selected && selected.duration) {
        sessionMin = Math.max(sessionMin, selected.duration);
    }
    const targetCardioMinutes = Math.round(sessionMin * (inputs.goal === 'endurance' ? 0.6 : (inputs.goal === 'fat_loss' ? 0.45 : 0.35)));
    const targetStrengthMinutes = sessionMin - targetCardioMinutes;

    // choose exercises
    const cardio = ExercisesDB.filter(e => e.type === 'cardio' && e.difficulty <= Math.ceil(diffBudget * intensity)).slice(0, 3);
    const strength = ExercisesDB.filter(e => e.type === 'strength' && e.difficulty <= Math.ceil(diffBudget * intensity)).slice(0, 4);
    const mobility = ExercisesDB.filter(e => e.type === 'mobility' || e.type === 'core').slice(0, 2);

    // Build a plan structure: warmup, main, cooldown
    const warmup = [{ name: 'Dynamic Warm-up', duration: 5, notes: 'Joint mobility and light cardio' }];
    const mainParts = [];

    // If the user selected a workout, include it as a featured part first
    if (selected) {
        const inferredTags = (selected.tags || []).join(' ').toLowerCase();
        let section = 'Featured';
        if (inferredTags.includes('cardio') || inferredTags.includes('hiit') || inferredTags.includes('conditioning')) section = 'Cardio';
        if (inferredTags.includes('strength') || inferredTags.includes('hypertrophy') || inferredTags.includes('upper') || inferredTags.includes('lower')) section = 'Strength';
        mainParts.push({ section: section + ' (selected)', items: [{ name: selected.title, durationMin: selected.duration, notes: 'From workout library' }], minutes: selected.duration });
    }

    if (targetStrengthMinutes >= 15) {
        mainParts.push({ section: 'Strength', items: strength.map(s => ({ ...s, sets: Math.max(2, Math.round(3 * intensity)), reps: s.difficulty <= 2 ? 12 : 8 })), minutes: targetStrengthMinutes });
    }
    if (targetCardioMinutes >= 10) {
        mainParts.push({ section: 'Cardio', items: cardio.map(c => ({ ...c, durationMin: Math.round(targetCardioMinutes / Math.max(1, cardio.length)) })), minutes: targetCardioMinutes });
    }
    const cooldown = [{ name: 'Cooldown & Stretching', duration: 5, notes: 'Light stretching, breathing' }];

    return { warmup, mainParts, cooldown };
}

// Fatigue-aware rest scheduling: simple weekly planner
function scheduleSessions(inputs, metrics, intensity) {
    // base days per week from input
    let days = Math.max(1, Math.min(7, inputs.daysPerWeek));
    // If fatigue high, reduce or distribute
    if (inputs.fatigue >= 7) days = Math.max(1, days - 1);
    // If very low fitness, recommend fewer days to start
    if (metrics.fitnessScore < 40) days = Math.max(2, Math.min(days, 4));
    // Compute per-day load = sessionMinutes * intensity
    const perDayLoad = Math.round(inputs.sessionMinutes * intensity);
    // cumulative fatigue threshold heuristic
    const threshold = 300; // arbitrary weekly load comfortable
    const weeklyLoad = perDayLoad * days;
    // If weeklyLoad > threshold, add extra rest day or lower intensity
    let adjustedDays = days;
    let adjustAdvice = null;
    if (weeklyLoad > threshold) {
        adjustedDays = Math.max(1, Math.floor(threshold / perDayLoad));
        adjustAdvice = `Weekly load (${weeklyLoad}) exceeds comfort threshold; reducing sessions to ${adjustedDays} or lower intensity recommended.`;
    }

    // Spread sessions over week with rest days allocation considering fatigue
    const schedule = [];
    const preferred = inputs.timeOfDay || 'evening';
    const spacing = Math.floor(7 / Math.max(1, adjustedDays));
    let dayIdx = 0;
    for (let i = 0; i < adjustedDays; i++) {
        schedule.push({
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIdx % 7],
            time: preferred,
            load: perDayLoad,
            notes: i === 0 ? 'Higher focus' : (i === adjustedDays - 1 ? 'Lower intensity' : 'Standard'),
        });
        dayIdx += spacing || 1;
    }

    return { schedule, adjustedDays, weeklyLoad, adjustAdvice };
}

// Explainability: list top factors and weights
function explainDecision(metrics, inputs, intensity, scheduleMeta) {
    // crude weightings for explanation
    const weights = [
        { name: 'Current fatigue (RPE)', value: Math.min(1, inputs.fatigue / 10), weight: 0.35 },
        { name: 'Fitness score (baseline)', value: metrics.fitnessScore / 100, weight: 0.30 },
        { name: 'Goal', value: 1, weight: 0.15 },
        { name: 'Available time per session', value: Math.min(1, inputs.sessionMinutes / 60), weight: 0.10 },
        { name: 'Days available/week', value: Math.min(1, inputs.daysPerWeek / 7), weight: 0.10 },
    ];

    // format textual explanation
    const lines = [];
    lines.push(`We computed BMI=${metrics.bmi} and fitness score=${metrics.fitnessScore}.`);
    lines.push(`Intensity multiplier chosen: ${intensity} (lower when fatigue is high, higher for muscle gain).`);
    if (scheduleMeta.adjustAdvice) lines.push(scheduleMeta.adjustAdvice);
    // include selected workout info if present
    if (inputs && inputs.selectedWorkout && inputs.selectedWorkout.title) {
        lines.push(`Included selected workout: ${inputs.selectedWorkout.title} (${inputs.selectedWorkout.duration} min).`);
    }
    lines.push('Top input contributions:');
    weights.forEach(w => {
        lines.push(`• ${w.name} — importance ${Math.round(w.weight * 100)}% (value ${(Math.round(w.value * 100)) / 100})`);
    });

    return lines.join('\n');
}

// Main export
export function generatePlan(inputs) {
    // inputs: {height,weight,age,activity,goal,fatigue,sessionMinutes,daysPerWeek,timeOfDay,notes}
    const metrics = computeMetrics(inputs);
    const intensity = intensityFromInputs(inputs);
    const plan = pickExercises(metrics, inputs, intensity);
    const scheduleMeta = scheduleSessions(inputs, metrics, intensity);
    const explanation = explainDecision(metrics, inputs, intensity, scheduleMeta);

    // generate a diet recommendation that depends on the generated plan and schedule
    const diet = generateDietRecommendation(metrics, inputs, plan, scheduleMeta);

    return {
        meta: { metrics, intensity, generatedAt: new Date().toISOString() },
        plan,
        schedule: scheduleMeta,
        explanation,
        diet, // added
        charts: {
            bmiHistory: generateBMIHistory(metrics.bmi),
            weeklyLoad: genWeeklyLoad(scheduleMeta.weeklyLoad, scheduleMeta.adjustedDays),
            dietPie: [Math.round(diet.macros.carbsPct), Math.round(diet.macros.proteinPct), Math.round(diet.macros.fatPct)]
        }
    };
}

// Diet recommendation helper
function generateDietRecommendation(metrics, inputs, plan, scheduleMeta) {
    // estimate BMR using Mifflin-St Jeor
    const weight = inputs.weight; // kg
    const height = inputs.height; // cm
    const age = inputs.age;
    const sex = inputs.sex || 'Female';
    let bmr;
    if ((sex || 'Female').toLowerCase().startsWith('m')) {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    const activityFactor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[inputs.activity] || 1.55;
    let tdee = Math.round(bmr * activityFactor);

    // Adjust TDEE for goal (as before) but allow plan intensity to nudge calories
    if (inputs.goal === 'fat_loss') tdee = Math.round(tdee * 0.85);
    if (inputs.goal === 'muscle_gain') tdee = Math.round(tdee * 1.12);

    // nudge calories based on weekly load (more load => slightly more calories)
    const load = (scheduleMeta && scheduleMeta.weeklyLoad) || (inputs.sessionMinutes * (inputs.daysPerWeek || 3));
    if (load > 400) tdee = Math.round(tdee * 1.08);
    else if (load < 200) tdee = Math.round(tdee * 0.98);

    // determine plan composition (approx minutes for strength vs cardio)
    let totalMin = 0, strengthMin = 0, cardioMin = 0;
    try {
        const parts = (plan && plan.mainParts) || [];
        parts.forEach(p => {
            const minutes = p.minutes || (p.items && p.items.reduce((s, i) => s + (i.durationMin || 0), 0)) || 0;
            totalMin += minutes;
            const label = (p.section || '').toLowerCase();
            if (label.includes('strength')) strengthMin += minutes;
            if (label.includes('cardio')) cardioMin += minutes;
            // featured selected workout heuristics
            if (label.includes('featured') && p.items && p.items[0] && (p.items[0].durationMin || p.items[0].duration)) {
                const m = p.items[0].durationMin || p.items[0].duration;
                // guess type by title
                const title = (p.items[0].name || '').toLowerCase();
                if (title.includes('hiit') || title.includes('run') || title.includes('bike')) cardioMin += m;
                else strengthMin += m;
                totalMin += m;
            }
        });
    } catch (e) { /* ignore */ }

    const strengthRatio = totalMin ? (strengthMin / totalMin) : 0.5;
    const cardioRatio = totalMin ? (cardioMin / totalMin) : 0.5;

    // base macros: protein 1.8 g/kg, fat 0.8 g/kg
    let protein_g = Math.round(1.8 * weight);
    let fat_g = Math.round(0.8 * weight);

    // adjust protein upwards if plan emphasizes strength or muscle_gain goal
    if (strengthRatio > 0.55 || inputs.goal === 'muscle_gain') protein_g = Math.round(2.2 * weight);

    // adjust carbs depending on cardio/endurance emphasis
    // compute provisional calories from protein and fat then assign carbs to fill remaining calories
    let protein_cal = protein_g * 4;
    let fat_cal = fat_g * 9;

    // if cardio heavy, increase carbs by ~10-15% of calories
    if (cardioRatio > 0.55 || inputs.goal === 'endurance') {
        // temporarily lower fat slightly to make room for carbs
        fat_g = Math.round(fat_g * 0.95);
        fat_cal = fat_g * 9;
        // bump carbs by adding calories
        tdee = Math.round(tdee * 1.04);
    }

    let carbs_cal = Math.max(0, tdee - protein_cal - fat_cal);
    let carbs_g = Math.round(carbs_cal / 4);

    // In case protein_g change altered protein_cal, recalc proportions
    protein_cal = protein_g * 4;
    fat_cal = fat_g * 9;
    carbs_cal = Math.max(0, tdee - protein_cal - fat_cal);
    carbs_g = Math.round(carbs_cal / 4);

    const macros = {
        protein_g, fat_g, carbs_g,
        proteinPct: (protein_cal / tdee) * 100,
        fatPct: (fat_cal / tdee) * 100,
        carbsPct: (carbs_cal / tdee) * 100
    };

    // simple meal splits (keep as before)
    const meals = [
        { name: 'Breakfast', portionPct: 0.25 },
        { name: 'Lunch', portionPct: 0.35 },
        { name: 'Dinner', portionPct: 0.30 },
        { name: 'Snack', portionPct: 0.10 }
    ];
    const mealPlans = meals.map(m => {
        const kcal = Math.round(tdee * m.portionPct);
        const protein = Math.round(macros.protein_g * m.portionPct);
        const fat = Math.round(macros.fat_g * m.portionPct);
        const carbs = Math.round(macros.carbs_g * m.portionPct);
        return { name: m.name, kcal, protein, fat, carbs, example: generateMealExample(m.name, protein, fat, carbs) };
    });

    return { calories: tdee, macros, meals: mealPlans };
}

function generateMealExample(name, protein, fat, carbs) {
    // very simple templated examples
    if (name === 'Breakfast') return `Oats, milk, banana, whey — approx ${protein}g protein`;
    if (name === 'Lunch') return `Chicken, rice, vegetables — approx ${protein}g protein`;
    if (name === 'Dinner') return `Salmon, sweet potato, salad — approx ${protein}g protein`;
    return `Greek yogurt & nuts — approx ${protein}g protein`;
}

// small helper to produce toy history for graphing
function generateBMIHistory(current) {
    // create 8-week small series converging to current
    const base = current + (Math.random() * 2 - 1) * 1.5;
    const points = [];
    for (let i = 8; i >= 0; i--) {
        const v = Math.round((base - (i * (base - current) / 8) + (Math.random() * 0.6 - 0.3)) * 10) / 10;
        points.push({ week: `W${9 - i}`, bmi: v });
    }
    return points;
}

function genWeeklyLoad(weeklyLoad, days) {
    const arr = new Array(7).fill(0);
    // distribute load across 'days' at first indices
    for (let i = 0; i < days; i++) {
        arr[i] = Math.round((weeklyLoad / days) + (Math.random() * 10 - 5));
    }
    return arr;
}