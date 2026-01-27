from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ExpenseCategory(str, Enum):
    """Expense categories"""
    FOOD = "food"
    TRANSPORT = "transport"
    HOUSING = "housing"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    HEALTHCARE = "healthcare"
    SHOPPING = "shopping"
    EDUCATION = "education"
    OTHER = "other"


class IncomeType(str, Enum):
    """Income types"""
    SALARY = "salary"
    FREELANCE = "freelance"
    INVESTMENT = "investment"
    GIFT = "gift"
    OTHER = "other"


class Category(BaseModel):
    """Category model"""
    id: str
    name: str
    type: str  # "expense" or "income"
    color: str = "#3B82F6"
    icon: str = "💰"


class Expense(BaseModel):
    """Expense model"""
    id: Optional[str] = None
    amount: float = Field(..., gt=0)
    currency: str = "USD"  # USD, EUR, CNY, JPY, GBP, SGD
    category: str
    merchant: Optional[str] = None
    date: Optional[str] = None  # ISO format date string
    notes: Optional[str] = None
    tags: List[str] = []
    created_at: Optional[str] = None


class Income(BaseModel):
    """Income model"""
    id: Optional[str] = None
    amount: float = Field(..., gt=0)
    source: str
    type: IncomeType
    date: str  # ISO format date string
    recurring: bool = False
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Bill(BaseModel):
    """Bill model"""
    id: Optional[str] = None
    name: str
    amount: float = Field(..., gt=0)
    due_date: str  # Day of month (1-31)
    category: str
    auto_pay: bool = False
    recurring: bool = True
    notes: Optional[str] = None
    created_at: Optional[str] = None


class Budget(BaseModel):
    """Budget model"""
    id: Optional[str] = None
    category: str
    limit: float = Field(..., gt=0)
    period: str = "monthly"  # "weekly", "monthly", "yearly"
    alert_threshold: float = Field(default=0.8, ge=0, le=1)  # Alert at 80% by default
    created_at: Optional[str] = None


class FinanceStatistics(BaseModel):
    """Finance statistics model"""
    total_expenses: float = 0
    total_income: float = 0
    net_balance: float = 0
    expenses_by_category: dict = {}
    monthly_trend: dict = {}
    budget_status: dict = {}
