# Deployment Guide

This guide covers deploying FitSynth to various platforms.

## Pre-Deployment Checklist

- [x] Production-ready Flask app (debug mode disabled by default)
- [x] Gunicorn WSGI server configured
- [x] Environment variables documented
- [x] Static files served correctly
- [x] Error handling in place
- [x] Health check endpoint available

## Environment Variables

Set these in your deployment platform:

- `MISTRAL_API_KEY` (optional) - Your Mistral API key for LLM features
- `MISTRAL_MODEL` (optional) - Model to use, defaults to `mistral-small-latest`
- `PORT` (optional) - Server port, defaults to 5000
- `FLASK_DEBUG` (optional) - Set to `true` for debug mode (not recommended in production)
- `LOG_LEVEL` (optional) - Logging level: `info`, `warning`, `error` (default: `info`)
- `WEB_CONCURRENCY` (optional) - Number of worker processes (default: auto-calculated)

## Deployment Platforms

### Heroku

1. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

2. **Create a Heroku app**:
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set MISTRAL_API_KEY=your_key_here
   heroku config:set MISTRAL_MODEL=mistral-small-latest
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Check logs**:
   ```bash
   heroku logs --tail
   ```

### Railway

1. **Connect your GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard:
   - `MISTRAL_API_KEY`
   - `MISTRAL_MODEL` (optional)
3. **Deploy** - Railway will auto-detect the Procfile and deploy

### Render

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `gunicorn --bind 0.0.0.0:$PORT backend.app:app`
5. **Set environment variables** in Render dashboard
6. **Deploy**

### DigitalOcean App Platform

1. **Create a new App** from GitHub
2. **Configure**:
   - Build Command: `pip install -r requirements.txt`
   - Run Command: `gunicorn --bind 0.0.0.0:$PORT backend.app:app`
3. **Set environment variables**
4. **Deploy**

### AWS Elastic Beanstalk

1. **Install EB CLI**:
   ```bash
   pip install awsebcli
   ```

2. **Initialize**:
   ```bash
   eb init -p python-3.11 fitsynth
   ```

3. **Create environment**:
   ```bash
   eb create fitsynth-env
   ```

4. **Set environment variables**:
   ```bash
   eb setenv MISTRAL_API_KEY=your_key_here
   ```

5. **Deploy**:
   ```bash
   eb deploy
   ```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "2", "--timeout", "120", "backend.app:app"]
```

Build and run:
```bash
docker build -t fitsynth .
docker run -p 5000:5000 -e MISTRAL_API_KEY=your_key_here fitsynth
```

## Post-Deployment

1. **Test the health endpoint**:
   ```bash
   curl https://your-app-url.com/api/health
   ```

2. **Verify Mistral integration**:
   - Check health endpoint response for `mistral_configured: true`
   - Test chat functionality

3. **Monitor logs** for any errors

4. **Set up monitoring** (optional):
   - Use your platform's monitoring tools
   - Set up alerts for errors

## Troubleshooting

### App won't start
- Check logs: `heroku logs --tail` (or platform equivalent)
- Verify environment variables are set
- Ensure `PORT` is correctly configured

### Mistral API errors
- Verify `MISTRAL_API_KEY` is set correctly
- Check API key has credits/quota
- App will fallback to rule-based responses if API fails

### Static files not loading
- Ensure Flask static folder configuration is correct
- Check CORS settings if accessing from different domain

### High memory usage
- Reduce `WEB_CONCURRENCY` (number of workers)
- Check for memory leaks in logs

## Security Notes

- Never commit `.env` files or API keys
- Use environment variables for all secrets
- Enable HTTPS in production (most platforms do this automatically)
- Consider rate limiting for API endpoints
- Validate all user inputs

## Scaling

- Increase `WEB_CONCURRENCY` for more workers
- Use a database instead of JSON files for production (PostgreSQL, MongoDB, etc.)
- Consider Redis for session storage if needed
- Use a CDN for static assets if needed

