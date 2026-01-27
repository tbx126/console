from typing import List, Dict, Optional
from datetime import datetime
from app.models.finance import (
    Expense, Income, Bill, Budget, Category, FinanceStatistics
)
from app.services.data_manager import data_manager
from app.config import settings
import uuid
from collections import defaultdict


class FinanceService:
    """Service for managing finance data"""

    def __init__(self):
        self.data_file = settings.finance_data_file
        self._ensure_default_categories()

    def _ensure_default_categories(self):
        """Ensure default categories exist"""
        data = data_manager.read_data(self.data_file)
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
        data = data_manager.read_data(self.data_file)
        return [Expense(**expense) for expense in data.get("expenses", [])]

    def get_expense(self, expense_id: str) -> Optional[Expense]:
        """Get expense by ID"""
        expenses = self.get_expenses()
        for expense in expenses:
            if expense.id == expense_id:
                return expense
        return None

    def create_expense(self, expense: Expense) -> Expense:
        """Create new expense"""
        data = data_manager.read_data(self.data_file)
        expense.id = str(uuid.uuid4())
        expense.created_at = datetime.now().isoformat()

        if "expenses" not in data:
            data["expenses"] = []

        data["expenses"].append(expense.model_dump())
        data_manager.write_data(self.data_file, data)
        return expense

    def update_expense(self, expense_id: str, expense: Expense) -> Optional[Expense]:
        """Update expense"""
        data = data_manager.read_data(self.data_file)
        expenses = data.get("expenses", [])

        for i, exp in enumerate(expenses):
            if exp["id"] == expense_id:
                expense.id = expense_id
                expense.created_at = exp.get("created_at", datetime.now().isoformat())
                expenses[i] = expense.model_dump()
                data_manager.write_data(self.data_file, data)
                return expense

        return None

    def delete_expense(self, expense_id: str) -> bool:
        """Delete expense"""
        data = data_manager.read_data(self.data_file)
        expenses = data.get("expenses", [])

        for i, exp in enumerate(expenses):
            if exp["id"] == expense_id:
                expenses.pop(i)
                data_manager.write_data(self.data_file, data)
                return True

        return False

    # Income operations
    def get_income(self) -> List[Income]:
        """Get all income"""
        data = data_manager.read_data(self.data_file)
        return [Income(**income) for income in data.get("income", [])]

    def create_income(self, income: Income) -> Income:
        """Create new income"""
        data = data_manager.read_data(self.data_file)
        income.id = str(uuid.uuid4())
        income.created_at = datetime.now().isoformat()

        if "income" not in data:
            data["income"] = []

        data["income"].append(income.model_dump())
        data_manager.write_data(self.data_file, data)
        return income

    # Bill operations
    def get_bills(self) -> List[Bill]:
        """Get all bills"""
        data = data_manager.read_data(self.data_file)
        return [Bill(**bill) for bill in data.get("bills", [])]

    def create_bill(self, bill: Bill) -> Bill:
        """Create new bill"""
        data = data_manager.read_data(self.data_file)
        bill.id = str(uuid.uuid4())
        bill.created_at = datetime.now().isoformat()

        if "bills" not in data:
            data["bills"] = []

        data["bills"].append(bill.model_dump())
        data_manager.write_data(self.data_file, data)
        return bill

    # Budget operations
    def get_budgets(self) -> List[Budget]:
        """Get all budgets"""
        data = data_manager.read_data(self.data_file)
        return [Budget(**budget) for budget in data.get("budgets", [])]

    def create_budget(self, budget: Budget) -> Budget:
        """Create new budget"""
        data = data_manager.read_data(self.data_file)
        budget.id = str(uuid.uuid4())
        budget.created_at = datetime.now().isoformat()

        if "budgets" not in data:
            data["budgets"] = []

        data["budgets"].append(budget.model_dump())
        data_manager.write_data(self.data_file, data)
        return budget

    # Category operations
    def get_categories(self) -> List[Category]:
        """Get all categories"""
        data = data_manager.read_data(self.data_file)
        return [Category(**cat) for cat in data.get("categories", [])]

    # Statistics
    def get_statistics(self) -> FinanceStatistics:
        """Calculate finance statistics"""
        expenses = self.get_expenses()
        income = self.get_income()
        budgets = self.get_budgets()

        total_expenses = sum(exp.amount for exp in expenses)
        total_income = sum(inc.amount for inc in income)

        # Expenses by category
        expenses_by_category = defaultdict(float)
        for exp in expenses:
            expenses_by_category[exp.category] += exp.amount

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
