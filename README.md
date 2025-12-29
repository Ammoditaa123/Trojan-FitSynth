# FitSynth - AI-Assisted Fitness Planning

A fitness application that generates personalized workout plans and diet recommendations using AI.

## Features

- Personalized fitness plan generation based on user profile
- Diet recommendations with macro breakdown
- Progress tracking and visualization
- LLM-powered explanations using Mistral API
- Workout library and scheduling

## Setup

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up Mistral API key:
```bash
export MISTRAL_API_KEY=your_mistral_api_key_here
```

Or create a `.env` file (copy from `.env.example`) and load it:
```bash
export $(cat .env | xargs)
```

3. Run the backend server:
```bash
cd backend
python app.py
```

The server will start on `http://localhost:5000`

### Frontend

The frontend is served automatically by the Flask backend. Just open `http://localhost:5000` in your browser.

## API Endpoints

- `POST /api/generate-plan` - Generate a fitness plan
  - Request body: User profile data (age, height, weight, goal, etc.)
  - Response: Complete fitness plan with exercises, schedule, diet, and explanation

- `GET /api/plans` - Get all saved plans

- `GET /api/health` - Health check endpoint

## Project Structure

```
.
├── backend/
│   ├── app.py          # Flask backend server
│   └── data/           # JSON storage for plans
├── frontend/
│   ├── index.html      # Main page
│   ├── plan.html       # Plan view
│   ├── progress.html   # Progress tracking
│   ├── workouts.html   # Workout library
│   ├── results.html    # Results page
│   └── assets/         # JavaScript and CSS files
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Deployment

https://fitness-phi-fawn.vercel.app/

## Notes

- The backend uses simple JSON file storage. For production, consider upgrading to a database.
- Mistral API integration is optional - if no API key is provided, the system falls back to rule-based explanations.
- Plans are saved to `backend/data/plans.json`
- Production mode: Set `FLASK_DEBUG=false` (default) for production deployments
- Uses Gunicorn WSGI server for production (configured in `Procfile` and `gunicorn_config.py`)

