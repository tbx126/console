from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Investment(BaseModel):
    """Investment model"""
    id: Optional[str] = None
    name: str
    type: str  # stock, crypto, bond, etc.
    symbol: Optional[str] = None
    quantity: float = Field(..., gt=0)
    purchase_price: float = Field(..., gt=0)
    current_price: Optional[float] = None
    currency: str = "USD"  # USD, SGD, CNY, etc.
    last_price_update: Optional[str] = None  # ISO format datetime
    purchase_date: str  # ISO format date string
    status: str = "active"  # active, sold, pending
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Experience(BaseModel):
    """Professional experience model"""
    id: Optional[str] = None
    company: str
    position: str
    start_date: str  # ISO format date string
    end_date: Optional[str] = None
    current: bool = False
    description: str
    achievements: List[str] = []
    technologies: List[str] = []
    created_at: Optional[str] = None


class PortfolioStatistics(BaseModel):
    """Portfolio statistics model"""
    total_investments: int = 0
    total_investment_value: float = 0
    total_gain_loss: float = 0
    total_gain_loss_percentage: float = 0
