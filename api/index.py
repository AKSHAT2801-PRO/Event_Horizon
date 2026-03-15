"""
Vercel serverless function entry point
"""
from server_fastapi.main import app

# Export the app for Vercel to use as the handler
export = app
