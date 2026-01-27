from typing import List, Optional
from datetime import datetime
from app.models.portfolio import Investment, Project, Experience, PortfolioStatistics
from app.services.data_manager import data_manager
from app.config import settings
import uuid


class PortfolioService:
    """Service for managing portfolio data"""

    def __init__(self):
        self.data_file = settings.portfolio_data_file

    # Investment operations
    def get_investments(self) -> List[Investment]:
        """Get all investments"""
        data = data_manager.read_data(self.data_file)
        return [Investment(**inv) for inv in data.get("investments", [])]

    def get_investment(self, investment_id: str) -> Optional[Investment]:
        """Get investment by ID"""
        investments = self.get_investments()
        for investment in investments:
            if investment.id == investment_id:
                return investment
        return None

    def create_investment(self, investment: Investment) -> Investment:
        """Create new investment"""
        data = data_manager.read_data(self.data_file)
        investment.id = str(uuid.uuid4())
        investment.created_at = datetime.now().isoformat()

        if "investments" not in data:
            data["investments"] = []

        data["investments"].append(investment.model_dump())
        data_manager.write_data(self.data_file, data)
        return investment

    def update_investment(self, investment_id: str, investment: Investment) -> Optional[Investment]:
        """Update investment"""
        data = data_manager.read_data(self.data_file)
        investments = data.get("investments", [])

        for i, inv in enumerate(investments):
            if inv["id"] == investment_id:
                investment.id = investment_id
                investment.created_at = inv.get("created_at", datetime.now().isoformat())
                investments[i] = investment.model_dump()
                data_manager.write_data(self.data_file, data)
                return investment

        return None

    def delete_investment(self, investment_id: str) -> bool:
        """Delete investment"""
        data = data_manager.read_data(self.data_file)
        investments = data.get("investments", [])

        for i, inv in enumerate(investments):
            if inv["id"] == investment_id:
                investments.pop(i)
                data_manager.write_data(self.data_file, data)
                return True

        return False

    # Project operations
    def get_projects(self) -> List[Project]:
        """Get all projects"""
        data = data_manager.read_data(self.data_file)
        return [Project(**proj) for proj in data.get("projects", [])]

    def create_project(self, project: Project) -> Project:
        """Create new project"""
        data = data_manager.read_data(self.data_file)
        project.id = str(uuid.uuid4())
        project.created_at = datetime.now().isoformat()

        if "projects" not in data:
            data["projects"] = []

        data["projects"].append(project.model_dump())
        data_manager.write_data(self.data_file, data)
        return project

    # Experience operations
    def get_experiences(self) -> List[Experience]:
        """Get all professional experiences"""
        data = data_manager.read_data(self.data_file)
        return [Experience(**exp) for exp in data.get("professional_experience", [])]

    def create_experience(self, experience: Experience) -> Experience:
        """Create new experience"""
        data = data_manager.read_data(self.data_file)
        experience.id = str(uuid.uuid4())
        experience.created_at = datetime.now().isoformat()

        if "professional_experience" not in data:
            data["professional_experience"] = []

        data["professional_experience"].append(experience.model_dump())
        data_manager.write_data(self.data_file, data)
        return experience

    # Statistics
    def get_statistics(self) -> PortfolioStatistics:
        """Calculate portfolio statistics"""
        investments = self.get_investments()
        projects = self.get_projects()

        total_investment_value = 0
        total_cost = 0

        for inv in investments:
            cost = inv.purchase_price * inv.quantity
            total_cost += cost

            if inv.current_price:
                current_value = inv.current_price * inv.quantity
                total_investment_value += current_value
            else:
                total_investment_value += cost

        total_gain_loss = total_investment_value - total_cost
        total_gain_loss_percentage = (total_gain_loss / total_cost * 100) if total_cost > 0 else 0

        active_projects = sum(1 for p in projects if p.status == "active")
        completed_projects = sum(1 for p in projects if p.status == "completed")

        return PortfolioStatistics(
            total_investments=len(investments),
            total_investment_value=total_investment_value,
            total_gain_loss=total_gain_loss,
            total_gain_loss_percentage=total_gain_loss_percentage,
            total_projects=len(projects),
            active_projects=active_projects,
            completed_projects=completed_projects
        )


# Global instance
portfolio_service = PortfolioService()
