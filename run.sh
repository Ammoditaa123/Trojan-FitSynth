#!/bin/bash

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check for Mistral API key
if [ -z "$MISTRAL_API_KEY" ]; then
    echo "Warning: MISTRAL_API_KEY not set. LLM features will be disabled."
    echo "Set it with: export MISTRAL_API_KEY=your_key_here"
fi

# Run the server
echo "Starting server..."
cd backend
python app.py

