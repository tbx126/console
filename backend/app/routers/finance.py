from fastapi import APIRouter, HTTPException
from typing import List
from app.models.finance import (
    Expense, Income, Bill, Budget, Category, FinanceStatistics
)
from app.services.finance_service import finance_service
from app.services.exchange_rate_service import exchange_rate_service

router = APIRouter()


# Expense endpoints
@router.get("/expenses", response_model=List[Expense])
async def get_expenses():
    """Get all expenses"""
    return finance_service.get_expenses()


@router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    """Get expense by ID"""
    expense = finance_service.get_expense(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/expenses", response_model=Expense)
async def create_expense(expense: Expense):
    """Create new expense"""
    return finance_service.create_expense(expense)


@router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense: Expense):
    """Update expense"""
    updated = finance_service.update_expense(expense_id, expense)
    if not updated:
        raise HTTPException(status_code=404, detail="Expense not found")
    return updated


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete expense"""
    success = finance_service.delete_expense(expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}


# Income endpoints
@router.get("/income", response_model=List[Income])
async def get_income():
    """Get all income"""
    return finance_service.get_income()


@router.post("/income", response_model=Income)
async def create_income(income: Income):
    """Create new income"""
    return finance_service.create_income(income)


# Bill endpoints
@router.get("/bills", response_model=List[Bill])
async def get_bills():
    """Get all bills"""
    return finance_service.get_bills()


@router.post("/bills", response_model=Bill)
async def create_bill(bill: Bill):
    """Create new bill"""
    return finance_service.create_bill(bill)


# Budget endpoints
@router.get("/budgets", response_model=List[Budget])
async def get_budgets():
    """Get all budgets"""
    return finance_service.get_budgets()


@router.post("/budgets", response_model=Budget)
async def create_budget(budget: Budget):
    """Create new budget"""
    return finance_service.create_budget(budget)


# Category endpoints
@router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all categories"""
    return finance_service.get_categories()


# Statistics endpoint
@router.get("/statistics", response_model=FinanceStatistics)
async def get_statistics():
    """Get finance statistics"""
    return finance_service.get_statistics()


# Exchange rate endpoints
@router.get("/exchange-rates")
async def get_exchange_rates(base: str = "USD"):
    """Get exchange rates for base currency"""
    rates = await exchange_rate_service.get_rates(base)
    return {
        "base": base,
        "rates": rates,
        "supported_currencies": exchange_rate_service.SUPPORTED_CURRENCIES
    }


@router.get("/convert")
async def convert_currency(amount: float, from_currency: str, to_currency: str):
    """Convert amount between currencies"""
    converted = await exchange_rate_service.convert(amount, from_currency, to_currency)
    return {
        "amount": amount,
        "from": from_currency,
        "to": to_currency,
        "converted": converted
    }
