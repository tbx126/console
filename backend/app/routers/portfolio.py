from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from app.models.portfolio import Investment, Project, Experience, PortfolioStatistics
from app.services.portfolio_service import portfolio_service
from app.services.price_service import price_service

router = APIRouter()


# Investment endpoints
@router.get("/investments", response_model=List[Investment])
async def get_investments():
    """Get all investments"""
    return portfolio_service.get_investments()


@router.get("/investments/{investment_id}", response_model=Investment)
async def get_investment(investment_id: str):
    """Get investment by ID"""
    investment = portfolio_service.get_investment(investment_id)
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    return investment


@router.post("/investments", response_model=Investment)
async def create_investment(investment: Investment):
    """Create new investment"""
    return portfolio_service.create_investment(investment)


@router.put("/investments/{investment_id}", response_model=Investment)
async def update_investment(investment_id: str, investment: Investment):
    """Update investment"""
    updated = portfolio_service.update_investment(investment_id, investment)
    if not updated:
        raise HTTPException(status_code=404, detail="Investment not found")
    return updated


@router.delete("/investments/{investment_id}")
async def delete_investment(investment_id: str):
    """Delete investment"""
    success = portfolio_service.delete_investment(investment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Investment not found")
    return {"message": "Investment deleted successfully"}


# Project endpoints
@router.get("/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    return portfolio_service.get_projects()


@router.post("/projects", response_model=Project)
async def create_project(project: Project):
    """Create new project"""
    return portfolio_service.create_project(project)


# Experience endpoints
@router.get("/experience", response_model=List[Experience])
async def get_experiences():
    """Get all professional experiences"""
    return portfolio_service.get_experiences()


@router.post("/experience", response_model=Experience)
async def create_experience(experience: Experience):
    """Create new experience"""
    return portfolio_service.create_experience(experience)


# Statistics endpoint
@router.get("/statistics", response_model=PortfolioStatistics)
async def get_statistics():
    """Get portfolio statistics"""
    return portfolio_service.get_statistics()


# Price endpoints
@router.get("/prices/{symbol}")
async def get_price(symbol: str, asset_type: str = "stock"):
    """Get real-time price for a symbol"""
    price_data = await price_service.get_price(symbol, asset_type)
    if not price_data:
        raise HTTPException(status_code=404, detail="Price not found")
    return price_data


@router.post("/investments/{investment_id}/refresh-price")
async def refresh_investment_price(investment_id: str):
    """Refresh price for a specific investment"""
    investment = portfolio_service.get_investment(investment_id)
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")

    if not investment.symbol:
        raise HTTPException(status_code=400, detail="Investment has no symbol")

    price_data = await price_service.get_price(investment.symbol, investment.type)
    if not price_data:
        raise HTTPException(status_code=404, detail="Could not fetch price")

    investment.current_price = price_data["price"]
    investment.last_price_update = datetime.now().isoformat()
    updated = portfolio_service.update_investment(investment_id, investment)

    return {
        "investment_id": investment_id,
        "new_price": price_data["price"],
        "updated_at": investment.last_price_update
    }
