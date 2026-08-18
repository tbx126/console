import asyncio
from typing import List, Dict, Optional
from app.models.finance import (
    Expense, Income, Bill, Budget, Category, FinanceStatistics
)
from app.services.data_manager import data_manager
from app.services.exchange_rate_service import exchange_rate_service
from app.config import settings
from app.utils.crud_helpers import get_all_items, get_item_by_id, create_item, update_item_by_id, delete_item_by_id
from collections import defaultdict


class FinanceService:
    """Service for managing finance data"""

    def __init__(self):
        self.data_file = settings.finance_data_file
        self._ensure_default_categories()

    def _ensure_default_categories(self):
        """Ensure default categories exist"""
        data = data_manager.read_data(self.data_file, mutable=True)
        if not data.get("categories"):
            default_categories = [
                {"id": "food", "name": "Food & Dining", "type": "expense", "color": "#EF4444", "icon": "🍔"},
                {"id": "transport", "name": "Transportation", "type": "expense", "color": "#3B82F6", "icon": "🚗"},
                {"id": "housing", "name": "Housing", "type": "expense", "color": "#8B5CF6", "icon": "🏠"},
                {"id": "utilities", "name": "Utilities", "type": "expense", "color": "#F59E0B", "icon": "💡"},
                {"id": "entertainment", "name": "Entertainment", "type": "expense", "color": "#EC4899", "icon": "🎬"},
                {"id": "healthcare", "name": "Healthcare", "type": "expense", "color": "#10B981", "icon": "⚕️"},
                {"id": "shopping", "name": "Shopping", "type": "expense", "color": "#6366F1", "icon": "🛍️"},
                {"id": "education", "name": "Education", "type": "expense", "color": "#14B8A6", "icon": "📚"},
                {"id": "other", "name": "Other", "type": "expense", "color": "#6B7280", "icon": "📌"},
            ]
            data["categories"] = default_categories
            data_manager.write_data(self.data_file, data)

    # Expense operations
    def get_expenses(self) -> List[Expense]:
        """Get all expenses"""
        return get_all_items(data_manager, self.data_file, "expenses", Expense)

    def get_expense(self, expense_id: str) -> Optional[Expense]:
        """Get expense by ID"""
        return get_item_by_id(data_manager, self.data_file, "expenses", expense_id, Expense)

    def create_expense(self, expense: Expense) -> Expense:
        """Create new expense"""
        return create_item(data_manager, self.data_file, "expenses", expense)

    def update_expense(self, expense_id: str, expense: Expense) -> Optional[Expense]:
        """Update expense"""
        return update_item_by_id(data_manager, self.data_file, "expenses", expense_id, expense, Expense)

    def delete_expense(self, expense_id: str) -> bool:
        """Delete expense"""
        return delete_item_by_id(data_manager, self.data_file, "expenses", expense_id)

    # Income operations
    def get_income(self) -> List[Income]:
        """Get all income"""
        return get_all_items(data_manager, self.data_file, "income", Income)

    def create_income(self, income: Income) -> Income:
        """Create new income"""
        return create_item(data_manager, self.data_file, "income", income)

    def update_income(self, income_id: str, income: Income) -> Optional[Income]:
        """Update income"""
        return update_item_by_id(data_manager, self.data_file, "income", income_id, income, Income)

    def delete_income(self, income_id: str) -> bool:
        """Delete income"""
        return delete_item_by_id(data_manager, self.data_file, "income", income_id)

    # Bill operations
    def get_bills(self) -> List[Bill]:
        """Get all bills"""
        return get_all_items(data_manager, self.data_file, "bills", Bill)

    def create_bill(self, bill: Bill) -> Bill:
        """Create new bill"""
        return create_item(data_manager, self.data_file, "bills", bill)

    def update_bill(self, bill_id: str, bill: Bill) -> Optional[Bill]:
        """Update bill"""
        return update_item_by_id(data_manager, self.data_file, "bills", bill_id, bill, Bill)

    def delete_bill(self, bill_id: str) -> bool:
        """Delete bill"""
        return delete_item_by_id(data_manager, self.data_file, "bills", bill_id)

    # Budget operations
    def get_budgets(self) -> List[Budget]:
        """Get all budgets"""
        return get_all_items(data_manager, self.data_file, "budgets", Budget)

    def create_budget(self, budget: Budget) -> Budget:
        """Create new budget"""
        return create_item(data_manager, self.data_file, "budgets", budget)

    def update_budget(self, budget_id: str, budget: Budget) -> Optional[Budget]:
        """Update budget"""
        return update_item_by_id(data_manager, self.data_file, "budgets", budget_id, budget, Budget)

    def delete_budget(self, budget_id: str) -> bool:
        """Delete budget"""
        return delete_item_by_id(data_manager, self.data_file, "budgets", budget_id)

    # Category operations
    def get_categories(self) -> List[Category]:
        """Get all categories"""
        return get_all_items(data_manager, self.data_file, "categories", Category)

    # Statistics
    async def get_statistics(self) -> FinanceStatistics:
        """Calculate finance statistics (all values in CNY)"""
        data = data_manager.read_data(self.data_file)
        expenses = [Expense(**item) for item in data.get("expenses", [])]
        income = [Income(**item) for item in data.get("income", [])]
        budgets = [Budget(**item) for item in data.get("budgets", [])]

        # Batch fetch currency rates
        unique_currencies = set()
        for exp in expenses:
            unique_currencies.add(getattr(exp, 'currency', 'USD'))
        for inc in income:
            unique_currencies.add(getattr(inc, 'currency', 'USD'))

        currencies = sorted(unique_currencies)
        rate_values = await asyncio.gather(
            *(exchange_rate_service.get_rate_to_cny(currency) for currency in currencies)
        )
        rates = dict(zip(currencies, rate_values))

        total_expenses = 0
        total_income = 0

        # Convert expenses to CNY
        expenses_by_category = defaultdict(float)
        for exp in expenses:
            currency = getattr(exp, 'currency', 'USD')
            rate = rates[currency]
            amount_cny = exp.amount * rate
            total_expenses += amount_cny
            expenses_by_category[exp.category] += amount_cny

        # Convert income to CNY
        for inc in income:
            currency = getattr(inc, 'currency', 'USD')
            rate = rates[currency]
            total_income += inc.amount * rate

        # Budget status
        budget_status = {}
        for budget in budgets:
            spent = expenses_by_category.get(budget.category, 0)
            budget_status[budget.category] = {
                "limit": budget.limit,
                "spent": spent,
                "remaining": budget.limit - spent,
                "percentage": (spent / budget.limit * 100) if budget.limit > 0 else 0
            }

        return FinanceStatistics(
            total_expenses=total_expenses,
            total_income=total_income,
            net_balance=total_income - total_expenses,
            expenses_by_category=dict(expenses_by_category),
            budget_status=budget_status
        )


# Global instance
finance_service = FinanceService()
