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
    last_price_update: Optional[str] = None  # ISO format datetime
    purchase_date: str  # ISO format date string
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Project(BaseModel):
    """Project model"""
    id: Optional[str] = None
    name: str
    description: str
    status: str = "active"  # active, completed, on-hold
    technologies: List[str] = []
    start_date: str  # ISO format date string
    end_date: Optional[str] = None
    url: Optional[str] = None
    achievements: List[str] = []
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
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
