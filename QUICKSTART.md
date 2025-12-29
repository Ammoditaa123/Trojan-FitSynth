# Quick Start Guide

## Fastest Way to Get Running

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Mistral API Key (Optional)

Get your API key from https://console.mistral.ai/
UD3DyF9S854Ecp2ANuEc8r8877fclnCa

```bash
export MISTRAL_API_KEY=your_api_key_here
```

**Note:** The app works without Mistral API key, but will use simpler rule-based explanations instead of AI-generated ones.

### 3. Run the Server

**Option A: Using the startup script**
```bash
./run.sh
```

**Option B: Manual start**
```bash
cd backend
python app.py
```

### 4. Open in Browser

Navigate to: http://localhost:5000

## What's Included

✅ Flask backend server  
✅ Mistral AI integration for personalized explanations  
✅ RESTful API endpoints  
✅ Frontend integration  
✅ Plan storage (JSON file)  
✅ Health check endpoint  

## API Endpoints

- `POST /api/generate-plan` - Generate fitness plan
- `GET /api/plans` - Get all saved plans  
- `GET /api/health` - Check server status

## Troubleshooting

**Port already in use?**
```bash
export PORT=5001
python backend/app.py
```

**Mistral API errors?**
- Check your API key is correct
- Verify you have credits/quota
- The app will fallback to rule-based explanations if API fails

**Import errors?**
```bash
pip install --upgrade -r requirements.txt
```

