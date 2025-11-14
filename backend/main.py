
"""
- Entry point for running the FastAPI app with uvicorn.
- Imports create_app() from core.app and exposes it as `app`.
- Can also be run directly: python main.py
"""

from core.app import create_app

# create the FastAPI app instance
app = create_app()

# run with uvicorn if executed directly (for local dev)
if __name__ == "__main__":
    import uvicorn
    # run the app on 0.0.0.0:8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
