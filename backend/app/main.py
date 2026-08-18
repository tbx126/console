from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from app.config import settings
from app.services.data_manager import data_manager

@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize persistent data and close shared resources cleanly."""
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

    try:
        yield
    finally:
        from app.services.gaming_cache_service import gaming_cache_service
        from app.services.http_client import http_client

        await gaming_cache_service.close()
        await http_client.close()


# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)


@app.middleware("http")
async def add_cache_headers(request, call_next):
    """Let browsers reuse cached gaming media instead of downloading it repeatedly."""
    response = await call_next(request)
    if request.url.path.startswith("/cache/") and response.status_code == 200:
        response.headers["Cache-Control"] = (
            "public, max-age=604800, stale-while-revalidate=86400"
        )
    return response


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
    from app.services.exchange_rate_service import exchange_rate_service
    from app.services.gaming_cache_service import gaming_cache_service
    from app.services.price_service import price_service

    return {
        "status": "healthy",
        "cache": {
            "data": data_manager.cache_info(),
            "gaming": gaming_cache_service.cache_info(),
            "exchange_rates": exchange_rate_service.cache_info(),
            "prices": price_service.cache_info(),
        },
    }


# Import and include routers
from app.routers import finance, travel, portfolio, ai_assistant, config, gaming, data_management
app.include_router(finance.router, prefix="/api/finance", tags=["finance"])
app.include_router(travel.router, prefix="/api/travel", tags=["travel"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["ai"])
app.include_router(config.router, prefix="/api/config", tags=["config"])
app.include_router(gaming.router, prefix="/api/gaming", tags=["gaming"])
app.include_router(data_management.router, prefix="/api/data", tags=["data"])

# Mount static files for gaming cache
cache_dir = Path(__file__).parent.parent / "data" / "gaming_cache"
cache_dir.mkdir(parents=True, exist_ok=True)
app.mount("/cache", StaticFiles(directory=str(cache_dir)), name="cache")
