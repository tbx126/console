from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings
from app.services.data_manager import data_manager

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize data files on startup"""
    # Initialize empty data files
    data_manager.initialize_file(settings.travel_data_file, {
        "flights": [],
        "airlines": {},
        "achievements": [],
        "statistics": {}
    })

    data_manager.initialize_file(settings.portfolio_data_file, {
        "investments": [],
        "projects": [],
        "professional_experience": [],
        "statistics": {}
    })

    data_manager.initialize_file(settings.finance_data_file, {
        "expenses": [],
        "income": [],
        "bills": [],
        "budgets": [],
        "categories": [],
        "statistics": {}
    })

    data_manager.initialize_file(settings.config_data_file, {
        "currency": "USD",
        "date_format": "YYYY-MM-DD",
        "timezone": "UTC",
        "theme": "light",
        "features": {
            "travel": True,
            "portfolio": True,
            "finance": True,
            "gaming": True
        }
    })

    data_manager.initialize_file("gaming.json", {
        "games": [],
        "statistics": {}
    })


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import and include routers
from app.routers import finance, travel, portfolio, ai_assistant, config, gaming
app.include_router(finance.router, prefix="/api/finance", tags=["finance"])
app.include_router(travel.router, prefix="/api/travel", tags=["travel"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["ai"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(gaming.router, prefix="/api/gaming", tags=["gaming"])

# Mount static files for gaming cache
cache_dir = Path(__file__).parent.parent / "data" / "gaming_cache"
cache_dir.mkdir(parents=True, exist_ok=True)
app.mount("/cache", StaticFiles(directory=str(cache_dir)), name="cache")
