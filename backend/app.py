try:
    from dotenv import load_dotenv
except Exception:
    # If python-dotenv is not installed, provide a no-op fallback so the
    # application can run without the package in simple deployments.
    def load_dotenv():
        return None

import os

load_dotenv()  # loads .env file if available
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime

# Try to import Mistral - optional
try:
    from mistralai.client import MistralClient
    MISTRAL_AVAILABLE = True
except ImportError:
    MISTRAL_AVAILABLE = False
    print("Warning: mistralai package not installed. LLM features will be disabled.")

app = Flask(__name__, static_folder="../frontend", static_url_path="")

# CORS configuration - allow all origins in production, or configure specific origins
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
if CORS_ORIGINS == '*':
    CORS(app)
else:
    CORS(app, origins=CORS_ORIGINS.split(','))

# Initialize Mistral client
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_MODEL_DEFAULT = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")
mistral_client = None
if MISTRAL_AVAILABLE and MISTRAL_API_KEY:
    try:
        mistral_client = MistralClient(api_key=MISTRAL_API_KEY)
    except Exception as e:
        print(f"Warning: Could not initialize Mistral client: {e}")

# Simple JSON file storage (can be upgraded to database later)
# Use absolute path relative to this file to avoid issues with working directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, 'data')
PLANS_FILE = os.path.join(DATA_DIR, 'plans.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def load_plans():
    """Load plans from JSON file"""
    try:
        if os.path.exists(PLANS_FILE):
            with open(PLANS_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading plans: {e}")
    return []

def save_plan(plan_data):
    """Save a plan to JSON file"""
    try:
        plans = load_plans()
        plans.append(plan_data)
        # Limit stored plans to prevent file from growing too large
        if len(plans) > 1000:
            plans = plans[-1000:]  # Keep only last 1000 plans
        with open(PLANS_FILE, 'w') as f:
            json.dump(plans, f, indent=2)
    except (IOError, OSError) as e:
        print(f"Error saving plan: {e}")
        # Don't fail the request if saving fails

# Exercise database (from frontend)
EXERCISES_DB = [
    {'id': 's1', 'name': 'Bodyweight Squats', 'type': 'strength', 'difficulty': 1, 'target': 'legs'},
    {'id': 's2', 'name': 'Push-ups (knees/full)', 'type': 'strength', 'difficulty': 2, 'target': 'upper'},
    {'id': 's3', 'name': 'Walking / brisk walk', 'type': 'cardio', 'difficulty': 1, 'target': 'cardio'},
    {'id': 's4', 'name': 'Stationary Bike', 'type': 'cardio', 'difficulty': 2, 'target': 'cardio'},
    {'id': 's5', 'name': 'Dumbbell Rows', 'type': 'strength', 'difficulty': 3, 'target': 'upper'},
    {'id': 's6', 'name': 'Plank', 'type': 'core', 'difficulty': 2, 'target': 'core'},
    {'id': 's7', 'name': 'Lunges', 'type': 'strength', 'difficulty': 2, 'target': 'legs'},
    {'id': 's8', 'name': 'Jump Rope', 'type': 'cardio', 'difficulty': 4, 'target': 'cardio'},
    {'id': 's9', 'name': 'Yoga Flow (20m)', 'type': 'mobility', 'difficulty': 1, 'target': 'mobility'},
    {'id': 's10', 'name': 'Interval Treadmill', 'type': 'cardio', 'difficulty': 5, 'target': 'cardio'},
]

def compute_metrics(inputs):
    """Compute BMI and fitness score"""
    height = inputs.get('height', 170)
    weight = inputs.get('weight', 70)
    age = inputs.get('age', 30)
    activity = inputs.get('activity', 'moderate')
    
    bmi = weight / ((height / 100) ** 2)
    activity_boost = {'sedentary': -10, 'light': 0, 'moderate': 10, 'active': 18}.get(activity, 0)
    age_penalty = max(0, (age - 30) * 0.5)
    bmi_penalty = max(0, (bmi - 22) * 1.5)
    base = 60
    fitness_score = max(10, round(base + activity_boost - age_penalty - bmi_penalty))
    
    return {'bmi': round(bmi * 10) / 10, 'fitnessScore': fitness_score}

def intensity_from_inputs(inputs):
    """Calculate intensity multiplier"""
    goal = inputs.get('goal', 'general')
    fatigue = inputs.get('fatigue', 2)
    
    fatigue_factor = 1 - (fatigue / 12)
    goal_factor = {
        'muscle_gain': 1.1,
        'fat_loss': 1.05,
        'endurance': 1.0,
        'general': 0.95
    }.get(goal, 0.95)
    
    intensity = max(0.4, min(1.3, 1.0 * fatigue_factor * goal_factor))
    return round(intensity * 100) / 100

def pick_exercises(metrics, inputs, intensity):
    """Select exercises based on metrics and inputs"""
    diff_budget = max(1, min(4, round((metrics['fitnessScore'] - 20) / 20) + 1))
    session_min = max(10, inputs.get('sessionMinutes', 30))
    
    selected_workout = inputs.get('selectedWorkout')
    if selected_workout and selected_workout.get('duration'):
        session_min = max(session_min, selected_workout['duration'])
    
    goal = inputs.get('goal', 'general')
    target_cardio_minutes = round(session_min * (
        0.6 if goal == 'endurance' else (0.45 if goal == 'fat_loss' else 0.35)
    ))
    target_strength_minutes = session_min - target_cardio_minutes
    
    cardio = [e for e in EXERCISES_DB if e['type'] == 'cardio' and e['difficulty'] <= int(diff_budget * intensity)][:3]
    strength = [e for e in EXERCISES_DB if e['type'] == 'strength' and e['difficulty'] <= int(diff_budget * intensity)][:4]
    mobility = [e for e in EXERCISES_DB if e['type'] in ['mobility', 'core']][:2]
    
    warmup = [{'name': 'Dynamic Warm-up', 'duration': 5, 'notes': 'Joint mobility and light cardio'}]
    main_parts = []
    
    if selected_workout:
        inferred_tags = ' '.join(selected_workout.get('tags', [])).lower()
        section = 'Featured'
        if any(tag in inferred_tags for tag in ['cardio', 'hiit', 'conditioning']):
            section = 'Cardio'
        if any(tag in inferred_tags for tag in ['strength', 'hypertrophy', 'upper', 'lower']):
            section = 'Strength'
        main_parts.append({
            'section': f'{section} (selected)',
            'items': [{'name': selected_workout['title'], 'durationMin': selected_workout['duration'], 'notes': 'From workout library'}],
            'minutes': selected_workout['duration']
        })
    
    if target_strength_minutes >= 15:
        main_parts.append({
            'section': 'Strength',
            'items': [{
                **s,
                'sets': max(2, round(3 * intensity)),
                'reps': 12 if s['difficulty'] <= 2 else 8
            } for s in strength],
            'minutes': target_strength_minutes
        })
    
    if target_cardio_minutes >= 10:
        main_parts.append({
            'section': 'Cardio',
            'items': [{
                **c,
                'durationMin': round(target_cardio_minutes / max(1, len(cardio)))
            } for c in cardio],
            'minutes': target_cardio_minutes
        })
    
    cooldown = [{'name': 'Cooldown & Stretching', 'duration': 5, 'notes': 'Light stretching, breathing'}]
    
    return {'warmup': warmup, 'mainParts': main_parts, 'cooldown': cooldown}

def schedule_sessions(inputs, metrics, intensity):
    """Create weekly schedule"""
    days = max(1, min(7, inputs.get('daysPerWeek', 3)))
    fatigue = inputs.get('fatigue', 2)
    
    if fatigue >= 7:
        days = max(1, days - 1)
    if metrics['fitnessScore'] < 40:
        days = max(2, min(days, 4))
    
    per_day_load = round(inputs.get('sessionMinutes', 30) * intensity)
    threshold = 300
    weekly_load = per_day_load * days
    
    adjusted_days = days
    adjust_advice = None
    if weekly_load > threshold:
        adjusted_days = max(1, int(threshold / per_day_load))
        adjust_advice = f'Weekly load ({weekly_load}) exceeds comfort threshold; reducing sessions to {adjusted_days} or lower intensity recommended.'
    
    schedule = []
    preferred = inputs.get('timeOfDay', 'evening')
    spacing = int(7 / max(1, adjusted_days))
    day_idx = 0
    days_list = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    for i in range(adjusted_days):
        schedule.append({
            'day': days_list[day_idx % 7],
            'time': preferred,
            'load': per_day_load,
            'notes': 'Higher focus' if i == 0 else ('Lower intensity' if i == adjusted_days - 1 else 'Standard')
        })
        day_idx += spacing or 1
    
    return {'schedule': schedule, 'adjustedDays': adjusted_days, 'weeklyLoad': weekly_load, 'adjustAdvice': adjust_advice}

def generate_diet_recommendation(metrics, inputs, plan, schedule_meta):
    """Generate diet recommendations"""
    weight = inputs.get('weight', 70)
    height = inputs.get('height', 170)
    age = inputs.get('age', 30)
    sex = inputs.get('sex', 'Female')
    
    # BMR calculation (Mifflin-St Jeor)
    if sex.lower().startswith('m'):
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    
    activity_factor = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725}.get(inputs.get('activity', 'moderate'), 1.55)
    tdee = round(bmr * activity_factor)
    
    goal = inputs.get('goal', 'general')
    if goal == 'fat_loss':
        tdee = round(tdee * 0.85)
    elif goal == 'muscle_gain':
        tdee = round(tdee * 1.12)
    
    weekly_load = schedule_meta.get('weeklyLoad', inputs.get('sessionMinutes', 30) * inputs.get('daysPerWeek', 3))
    if weekly_load > 400:
        tdee = round(tdee * 1.08)
    elif weekly_load < 200:
        tdee = round(tdee * 0.98)
    
    # Calculate macros
    protein_g = round(2.2 * weight) if (inputs.get('goal') == 'muscle_gain') else round(1.8 * weight)
    fat_g = round(0.8 * weight)
    
    protein_cal = protein_g * 4
    fat_cal = fat_g * 9
    carbs_cal = max(0, tdee - protein_cal - fat_cal)
    carbs_g = round(carbs_cal / 4)
    
    # Prevent division by zero
    if tdee <= 0:
        tdee = 2000  # Fallback to reasonable default
    
    macros = {
        'protein_g': protein_g,
        'fat_g': fat_g,
        'carbs_g': carbs_g,
        'proteinPct': (protein_cal / tdee) * 100 if tdee > 0 else 0,
        'fatPct': (fat_cal / tdee) * 100 if tdee > 0 else 0,
        'carbsPct': (carbs_cal / tdee) * 100 if tdee > 0 else 0
    }
    
    meals = [
        {'name': 'Breakfast', 'portionPct': 0.25},
        {'name': 'Lunch', 'portionPct': 0.35},
        {'name': 'Dinner', 'portionPct': 0.30},
        {'name': 'Snack', 'portionPct': 0.10}
    ]
    
    meal_plans = []
    for meal in meals:
        kcal = round(tdee * meal['portionPct'])
        protein = round(macros['protein_g'] * meal['portionPct'])
        fat = round(macros['fat_g'] * meal['portionPct'])
        carbs = round(macros['carbs_g'] * meal['portionPct'])
        
        example = {
            'Breakfast': f'Oats, milk, banana, whey — approx {protein}g protein',
            'Lunch': f'Chicken, rice, vegetables — approx {protein}g protein',
            'Dinner': f'Salmon, sweet potato, salad — approx {protein}g protein',
            'Snack': f'Greek yogurt & nuts — approx {protein}g protein'
        }.get(meal['name'], f'Balanced meal — approx {protein}g protein')
        
        meal_plans.append({
            'name': meal['name'],
            'kcal': kcal,
            'protein': protein,
            'fat': fat,
            'carbs': carbs,
            'example': example
        })
    
    return {'calories': tdee, 'macros': macros, 'meals': meal_plans}

def generate_llm_explanation_sync(inputs, metrics, intensity, schedule_meta, plan):
    """Generate explanation using Mistral API"""
    if not mistral_client:
        return None
    
    prompt = f"""You are a fitness expert. Generate a personalized explanation for a fitness plan.

User Profile:
- Age: {inputs.get('age', 30)}
- Sex: {inputs.get('sex', 'Unknown')}
- Height: {inputs.get('height', 170)} cm
- Weight: {inputs.get('weight', 70)} kg
- Activity Level: {inputs.get('activity', 'moderate')}
- Goal: {inputs.get('goal', 'general fitness')}
- Fatigue Level (RPE 0-10): {inputs.get('fatigue', 2)}
- Days per week: {inputs.get('daysPerWeek', 3)}
- Session minutes: {inputs.get('sessionMinutes', 30)}
- Special notes: {inputs.get('notes', 'None')}

Computed Metrics:
- BMI: {metrics['bmi']}
- Fitness Score: {metrics['fitnessScore']}
- Intensity Multiplier: {intensity}

Schedule:
- Days per week: {schedule_meta.get('adjustedDays', 3)}
- Weekly load: {schedule_meta.get('weeklyLoad', 90)}

Workout Plan:
- Warm-up: {', '.join([w['name'] for w in plan.get('warmup', [])])}
- Main exercises: {len(plan.get('mainParts', []))} sections
- Cooldown: {', '.join([c['name'] for c in plan.get('cooldown', [])])}

Generate a concise, encouraging, and personalized explanation (2-3 paragraphs) explaining why this plan was created and how it addresses the user's goals. Be specific about the intensity level and schedule recommendations."""

    try:
        # Mistral API call - adjust model name via env MISTRAL_MODEL if desired
        response = mistral_client.chat(
            model=MISTRAL_MODEL_DEFAULT,
            messages=[{"role": "user", "content": prompt}],
        )
        # Extract content from response
        if hasattr(response, "choices") and response.choices:
            # Newer SDKs may expose content differently; handle common shapes
            choice = response.choices[0]
            # choice.message.content for structured messages, or plain "message" / "content"
            if hasattr(choice, "message") and getattr(choice.message, "content", None):
                return choice.message.content
            if hasattr(choice, "content"):
                return choice.content
        return None
    except Exception as e:
        print(f"Mistral API error (plan explanation): {e}")
        return None


def chat_with_llm(message, plan_context=None):
    """
    Simple personal chatbot using Mistral.

    - message: user message string
    - plan_context: optional dict with latest plan / metrics to ground responses
    """
    if not mistral_client:
        # Fallback: simple rule-based reply
        base = "I'm currently running in offline mode without access to the AI model. "
        if "diet" in message.lower():
            return base + "For diet, aim for plenty of protein, mostly whole foods, and adjust calories based on your goal (deficit for fat loss, small surplus for muscle gain)."
        if "workout" in message.lower() or "training" in message.lower():
            return base + "For workouts, combine 2–3 days of strength with 2–3 days of cardio, and keep at least one full rest day."
        return base + "Ask me about your training, diet, or how to use your FitSynth plan."

    system_prompt = (
        "You are FitSynth, a friendly fitness coach chatbot. "
        "Answer concisely (2–4 sentences), in plain language, and stay focused on health, training, and nutrition. "
        "If you reference specific numbers (like calories or sets), keep them realistic and safe. "
        "Avoid medical diagnoses; instead, suggest consulting a professional if needed."
    )

    user_parts = [message.strip()]
    if plan_context:
        try:
            summary = json.dumps(plan_context, ensure_ascii=False)[:2000]
            user_parts.append(
                "\n\nContext from the user's latest FitSynth plan (JSON, truncated):\n"
                f"{summary}"
            )
        except Exception:
            pass

    user_content = "\n".join(user_parts)

    try:
        response = mistral_client.chat(
            model=MISTRAL_MODEL_DEFAULT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        if hasattr(response, "choices") and response.choices:
            choice = response.choices[0]
            if hasattr(choice, "message") and getattr(choice.message, "content", None):
                return choice.message.content
            if hasattr(choice, "content"):
                return choice.content
        return "I couldn't generate a response right now. Please try again in a moment."
    except Exception as e:
        print(f"Mistral API error (chat): {e}")
        return "I had trouble reaching the AI service just now. Please try again shortly."

def explain_decision(metrics, inputs, intensity, schedule_meta):
    """Fallback explanation if LLM is not available"""
    lines = []
    lines.append(f"We computed BMI={metrics['bmi']} and fitness score={metrics['fitnessScore']}.")
    lines.append(f"Intensity multiplier chosen: {intensity} (lower when fatigue is high, higher for muscle gain).")
    if schedule_meta.get('adjustAdvice'):
        lines.append(schedule_meta['adjustAdvice'])
    if inputs.get('selectedWorkout'):
        lines.append(f"Included selected workout: {inputs['selectedWorkout'].get('title')} ({inputs['selectedWorkout'].get('duration')} min).")
    return '\n'.join(lines)

def generate_bmi_history(current_bmi):
    """Generate mock BMI history"""
    import random
    base = current_bmi + (random.random() * 2 - 1) * 1.5
    points = []
    for i in range(8, -1, -1):
        v = round((base - (i * (base - current_bmi) / 8) + (random.random() * 0.6 - 0.3)) * 10) / 10
        points.append({'week': f'W{9 - i}', 'bmi': v})
    return points

def gen_weekly_load(weekly_load, days):
    """Generate weekly load array"""
    import random
    arr = [0] * 7
    for i in range(days):
        arr[i] = round((weekly_load / days) + (random.random() * 10 - 5))
    return arr

@app.route('/')
def index():
    """Serve the main index page"""
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_frontend(path):
    """Serve frontend files"""
    # Security: prevent directory traversal attacks
    if '..' in path or path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400
    try:
        return send_from_directory('../frontend', path)
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    """Generate a fitness plan"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        inputs = request.json
        if not inputs:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Validate required fields
        required_fields = ['age', 'height', 'weight', 'activity', 'goal']
        missing_fields = [field for field in required_fields if field not in inputs or inputs[field] is None]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        # Compute metrics
        metrics = compute_metrics(inputs)
        intensity = intensity_from_inputs(inputs)
        
        # Generate plan
        plan = pick_exercises(metrics, inputs, intensity)
        schedule_meta = schedule_sessions(inputs, metrics, intensity)
        diet = generate_diet_recommendation(metrics, inputs, plan, schedule_meta)
        
        # Generate explanation (try LLM first, fallback to simple)
        explanation = None
        if mistral_client:
            try:
                explanation = generate_llm_explanation_sync(inputs, metrics, intensity, schedule_meta, plan)
            except Exception as e:
                print(f"LLM error: {e}")
        
        if not explanation:
            explanation = explain_decision(metrics, inputs, intensity, schedule_meta)
        
        # Generate charts data
        charts = {
            'bmiHistory': generate_bmi_history(metrics['bmi']),
            'weeklyLoad': gen_weekly_load(schedule_meta['weeklyLoad'], schedule_meta['adjustedDays']),
            'dietPie': [
                round(diet['macros']['carbsPct']),
                round(diet['macros']['proteinPct']),
                round(diet['macros']['fatPct'])
            ]
        }
        
        plan_obj = {
            'meta': {
                'metrics': metrics,
                'intensity': intensity,
                'generatedAt': datetime.now().isoformat()
            },
            'plan': plan,
            'schedule': schedule_meta,
            'explanation': explanation,
            'diet': diet,
            'charts': charts
        }
        
        # Save plan
        plan_data = {
            'inputs': inputs,
            'planObj': plan_obj,
            'createdAt': datetime.now().isoformat()
        }
        save_plan(plan_data)
        
        return jsonify(plan_obj)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/plans', methods=['GET'])
def get_plans():
    """Get all saved plans"""
    plans = load_plans()
    return jsonify(plans)

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify(
        {
            "status": "healthy",
            "mistral_configured": mistral_client is not None,
            "model": MISTRAL_MODEL_DEFAULT if mistral_client else None,
        }
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Personal chatbot endpoint backed by Mistral.

    Request JSON:
      { "message": "string", "includePlanContext": true|false }
    """
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
        
        data = request.json or {}
        message = (data.get("message") or "").strip()
        include_plan = bool(data.get("includePlanContext", True))

        if not message:
            return jsonify({"error": "message is required"}), 400
        
        # Limit message length to prevent abuse
        if len(message) > 2000:
            return jsonify({"error": "Message too long (max 2000 characters)"}), 400
    except Exception as e:
        return jsonify({"error": f"Invalid request: {str(e)}"}), 400

    try:
        latest_plan_context = None
        if include_plan:
            # Best-effort: include the most recent plan as context
            plans = load_plans()
            if plans:
                latest_plan_context = plans[-1].get("planObj")

        reply = chat_with_llm(message, plan_context=latest_plan_context)
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

