import asyncio
from typing import Dict, List, Optional
from app.models.portfolio import Investment, Experience, PortfolioStatistics
from app.services.data_manager import data_manager
from app.services.exchange_rate_service import exchange_rate_service
from app.config import settings
from app.utils.crud_helpers import get_all_items, get_item_by_id, create_item, update_item_by_id, delete_item_by_id


class PortfolioService:
    """Service for managing portfolio data"""

    def __init__(self):
        self.data_file = settings.portfolio_data_file

    # Investment operations
    def get_investments(self) -> List[Investment]:
        """Get all investments"""
        return get_all_items(data_manager, self.data_file, "investments", Investment)

    def get_investment(self, investment_id: str) -> Optional[Investment]:
        """Get investment by ID"""
        return get_item_by_id(data_manager, self.data_file, "investments", investment_id, Investment)

    def create_investment(self, investment: Investment) -> Investment:
        """Create new investment"""
        return create_item(data_manager, self.data_file, "investments", investment)

    def update_investment(self, investment_id: str, investment: Investment) -> Optional[Investment]:
        """Update investment"""
        return update_item_by_id(data_manager, self.data_file, "investments", investment_id, investment, Investment)

    def delete_investment(self, investment_id: str) -> bool:
        """Delete investment"""
        return delete_item_by_id(data_manager, self.data_file, "investments", investment_id)

    def update_investment_prices(self, updates: Dict[str, Dict]) -> int:
        """Persist a batch of fetched prices with one atomic write and backup."""
        if not updates:
            return 0

        def mutate(data: Dict) -> int:
            updated_count = 0
            for investment in data.get("investments", []):
                values = updates.get(investment.get("id"))
                if values is None:
                    continue
                investment.update(values)
                updated_count += 1
            return updated_count

        return data_manager.update_data(
            self.data_file,
            mutate,
            write_if=lambda count: count > 0,
        )

    # Experience operations
    def get_experiences(self) -> List[Experience]:
        """Get all professional experiences"""
        return get_all_items(data_manager, self.data_file, "professional_experience", Experience)

    def create_experience(self, experience: Experience) -> Experience:
        """Create new experience"""
        return create_item(data_manager, self.data_file, "professional_experience", experience)

    def update_experience(self, experience_id: str, experience: Experience) -> Optional[Experience]:
        """Update experience"""
        return update_item_by_id(data_manager, self.data_file, "professional_experience", experience_id, experience, Experience)

    def delete_experience(self, experience_id: str) -> bool:
        """Delete experience"""
        return delete_item_by_id(data_manager, self.data_file, "professional_experience", experience_id)

    # Statistics
    async def get_statistics(self) -> PortfolioStatistics:
        """Calculate portfolio statistics (all values in CNY)"""
        investments = self.get_investments()

        # Batch fetch currency rates
        unique_currencies = set(getattr(inv, 'currency', 'USD') for inv in investments)
        currencies = sorted(unique_currencies)
        rate_values = await asyncio.gather(
            *(exchange_rate_service.get_rate_to_cny(currency) for currency in currencies)
        )
        rates = dict(zip(currencies, rate_values))

        total_investment_value = 0
        total_cost = 0

        for inv in investments:
            currency = getattr(inv, 'currency', 'USD')
            rate = rates[currency]

            cost = inv.purchase_price * inv.quantity * rate
            total_cost += cost

            if inv.current_price:
                current_value = inv.current_price * inv.quantity * rate
                total_investment_value += current_value
            else:
                total_investment_value += cost

        total_gain_loss = total_investment_value - total_cost
        total_gain_loss_percentage = (total_gain_loss / total_cost * 100) if total_cost > 0 else 0

        return PortfolioStatistics(
            total_investments=len(investments),
            total_investment_value=total_investment_value,
            total_gain_loss=total_gain_loss,
            total_gain_loss_percentage=total_gain_loss_percentage
        )


# Global instance
portfolio_service = PortfolioService()
