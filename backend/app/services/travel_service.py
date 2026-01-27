from typing import List, Dict, Optional
from datetime import datetime
from app.models.travel import Flight, AirlineStats, Achievement, TravelStatistics
from app.services.data_manager import data_manager
from app.services.airport_data_service import airport_data_service
from app.config import settings
import uuid
from collections import defaultdict


class TravelService:
    """Service for managing travel data"""

    def __init__(self):
        self.data_file = settings.travel_data_file

    # Flight operations
    def get_flights(self) -> List[Flight]:
        """Get all flights"""
        data = data_manager.read_data(self.data_file)
        return [Flight(**flight) for flight in data.get("flights", [])]

    def get_flight(self, flight_id: str) -> Optional[Flight]:
        """Get flight by ID"""
        flights = self.get_flights()
        for flight in flights:
            if flight.id == flight_id:
                return flight
        return None

    def create_flight(self, flight: Flight) -> Flight:
        """Create new flight"""
        data = data_manager.read_data(self.data_file)
        flight.id = str(uuid.uuid4())
        flight.created_at = datetime.now().isoformat()

        if "flights" not in data:
            data["flights"] = []

        data["flights"].append(flight.model_dump())
        data_manager.write_data(self.data_file, data)

        # Update airline statistics
        self._update_airline_stats(data)

        return flight

    def update_flight(self, flight_id: str, flight: Flight) -> Optional[Flight]:
        """Update flight"""
        data = data_manager.read_data(self.data_file)
        flights = data.get("flights", [])

        for i, flt in enumerate(flights):
            if flt["id"] == flight_id:
                flight.id = flight_id
                flight.created_at = flt.get("created_at", datetime.now().isoformat())
                flights[i] = flight.model_dump()
                data_manager.write_data(self.data_file, data)
                self._update_airline_stats(data)
                return flight

        return None

    def delete_flight(self, flight_id: str) -> bool:
        """Delete flight"""
        data = data_manager.read_data(self.data_file)
        flights = data.get("flights", [])

        for i, flt in enumerate(flights):
            if flt["id"] == flight_id:
                flights.pop(i)
                data_manager.write_data(self.data_file, data)
                self._update_airline_stats(data)
                return True

        return False

    def _update_airline_stats(self, data: Dict):
        """Update airline statistics based on flights"""
        flights = data.get("flights", [])
        airline_stats = defaultdict(lambda: {
            "total_flights": 0,
            "total_km": 0,
            "total_cost": 0,
            "routes": defaultdict(int)
        })

        for flight in flights:
            airline = flight["airline"]
            airline_stats[airline]["total_flights"] += 1

            if flight.get("distance"):
                airline_stats[airline]["total_km"] += flight["distance"]

            if flight.get("cost"):
                airline_stats[airline]["total_cost"] += flight["cost"]

            route = f"{flight['origin']}-{flight['destination']}"
            airline_stats[airline]["routes"][route] += 1

        # Convert to list format with favorite route
        airlines = {}
        for airline, stats in airline_stats.items():
            favorite_route = max(stats["routes"].items(), key=lambda x: x[1])[0] if stats["routes"] else None
            airlines[airline] = {
                "airline": airline,
                "total_flights": stats["total_flights"],
                "total_km": stats["total_km"],
                "total_cost": stats["total_cost"],
                "favorite_route": favorite_route
            }

        data["airlines"] = airlines
        data_manager.write_data(self.data_file, data)

    # Airline statistics
    def get_airline_stats(self) -> List[AirlineStats]:
        """Get airline statistics"""
        data = data_manager.read_data(self.data_file)
        airlines = data.get("airlines", {})
        return [AirlineStats(**stats) for stats in airlines.values()]

    # Achievements
    def get_achievements(self) -> List[Achievement]:
        """Get travel achievements with expanded categories"""
        data = data_manager.read_data(self.data_file)
        flights = data.get("flights", [])

        # Calculate statistics
        total_flights = len(flights)
        total_km = sum((f.get("distance") or 0) for f in flights)
        unique_airlines = set(f["airline"] for f in flights if f.get("airline"))
        unique_airports = set()
        unique_countries = set()
        unique_continents = set()

        for flight in flights:
            # Collect airports
            if flight.get("origin"):
                unique_airports.add(flight["origin"])
                country = airport_data_service.get_country(flight["origin"])
                if country:
                    unique_countries.add(country)
                    continent = airport_data_service.get_continent(flight["origin"])
                    if continent:
                        unique_continents.add(continent)
            if flight.get("destination"):
                unique_airports.add(flight["destination"])
                country = airport_data_service.get_country(flight["destination"])
                if country:
                    unique_countries.add(country)
                    continent = airport_data_service.get_continent(flight["destination"])
                    if continent:
                        unique_continents.add(continent)

        # Define all achievements by category
        achievements = [
            # Flight count achievements
            {"id": "flights_1", "title": "First Flight", "description": "Log your first flight", "icon": "✈️", "category": "flights"},
            {"id": "flights_10", "title": "Frequent Flyer", "description": "Complete 10 flights", "icon": "🛫", "category": "flights"},
            {"id": "flights_50", "title": "Sky Master", "description": "Complete 50 flights", "icon": "⭐", "category": "flights"},
            {"id": "flights_100", "title": "Century Flyer", "description": "Complete 100 flights", "icon": "💯", "category": "flights"},
            # Distance achievements
            {"id": "km_10k", "title": "10K Club", "description": "Fly 10,000 km", "icon": "🛤️", "category": "distance"},
            {"id": "km_50k", "title": "50K Explorer", "description": "Fly 50,000 km", "icon": "🗺️", "category": "distance"},
            {"id": "km_100k", "title": "100K Voyager", "description": "Fly 100,000 km", "icon": "🌍", "category": "distance"},
            {"id": "km_500k", "title": "500K Legend", "description": "Fly 500,000 km", "icon": "🚀", "category": "distance"},
            # Airline achievements
            {"id": "airlines_3", "title": "Airline Sampler", "description": "Fly with 3 airlines", "icon": "🎫", "category": "airlines"},
            {"id": "airlines_5", "title": "Airline Explorer", "description": "Fly with 5 airlines", "icon": "🎟️", "category": "airlines"},
            {"id": "airlines_10", "title": "Airline Collector", "description": "Fly with 10 airlines", "icon": "🏆", "category": "airlines"},
            {"id": "airlines_20", "title": "Airline Master", "description": "Fly with 20 airlines", "icon": "👑", "category": "airlines"},
            # Country achievements
            {"id": "countries_3", "title": "Border Crosser", "description": "Visit 3 countries", "icon": "🌐", "category": "countries"},
            {"id": "countries_5", "title": "Globe Trotter", "description": "Visit 5 countries", "icon": "🗺️", "category": "countries"},
            {"id": "countries_10", "title": "World Traveler", "description": "Visit 10 countries", "icon": "🌎", "category": "countries"},
            {"id": "countries_20", "title": "World Citizen", "description": "Visit 20 countries", "icon": "🌏", "category": "countries"},
            # Continent achievements
            {"id": "continents_2", "title": "Continental", "description": "Visit 2 continents", "icon": "🗻", "category": "continents"},
            {"id": "continents_4", "title": "Multi-Continental", "description": "Visit 4 continents", "icon": "🏔️", "category": "continents"},
            {"id": "continents_6", "title": "Global Explorer", "description": "Visit 6 continents", "icon": "🌋", "category": "continents"},
            # Airport achievements
            {"id": "airports_5", "title": "Airport Hopper", "description": "Visit 5 airports", "icon": "🛬", "category": "airports"},
            {"id": "airports_10", "title": "Airport Regular", "description": "Visit 10 airports", "icon": "🛩️", "category": "airports"},
            {"id": "airports_25", "title": "Airport Expert", "description": "Visit 25 airports", "icon": "🏛️", "category": "airports"},
            {"id": "airports_50", "title": "Airport Collector", "description": "Visit 50 airports", "icon": "🎖️", "category": "airports"},
        ]

        # Achievement thresholds mapping
        thresholds = {
            "flights_1": total_flights >= 1,
            "flights_10": total_flights >= 10,
            "flights_50": total_flights >= 50,
            "flights_100": total_flights >= 100,
            "km_10k": total_km >= 10000,
            "km_50k": total_km >= 50000,
            "km_100k": total_km >= 100000,
            "km_500k": total_km >= 500000,
            "airlines_3": len(unique_airlines) >= 3,
            "airlines_5": len(unique_airlines) >= 5,
            "airlines_10": len(unique_airlines) >= 10,
            "airlines_20": len(unique_airlines) >= 20,
            "countries_3": len(unique_countries) >= 3,
            "countries_5": len(unique_countries) >= 5,
            "countries_10": len(unique_countries) >= 10,
            "countries_20": len(unique_countries) >= 20,
            "continents_2": len(unique_continents) >= 2,
            "continents_4": len(unique_continents) >= 4,
            "continents_6": len(unique_continents) >= 6,
            "airports_5": len(unique_airports) >= 5,
            "airports_10": len(unique_airports) >= 10,
            "airports_25": len(unique_airports) >= 25,
            "airports_50": len(unique_airports) >= 50,
        }

        result = []
        for ach in achievements:
            achieved = thresholds.get(ach["id"], False)
            result.append(Achievement(**ach, achieved=achieved))

        return result

    # Statistics
    def get_statistics(self) -> TravelStatistics:
        """Calculate travel statistics"""
        flights = self.get_flights()
        current_year = datetime.now().year

        total_flights = len(flights)
        total_km = sum(f.distance or 0 for f in flights)
        total_cost = sum(f.cost or 0 for f in flights)

        # Count unique cities, airports and airlines
        cities = set()
        airports = set()
        airlines = set()
        this_year_flights = 0

        for flight in flights:
            cities.add(flight.origin)
            cities.add(flight.destination)
            airports.add(flight.origin)
            airports.add(flight.destination)
            airlines.add(flight.airline)
            # Count this year's flights
            try:
                flight_year = int(flight.date[:4])
                if flight_year == current_year:
                    this_year_flights += 1
            except:
                pass

        # Find favorite airline
        airline_counts = defaultdict(int)
        for flight in flights:
            airline_counts[flight.airline] += 1

        favorite_airline = max(airline_counts.items(), key=lambda x: x[1])[0] if airline_counts else None

        return TravelStatistics(
            total_flights=total_flights,
            total_km=total_km,
            total_cost=total_cost,
            cities_visited=len(cities),
            airports_visited=len(airports),
            airlines_used=len(airlines),
            favorite_airline=favorite_airline,
            this_year_flights=this_year_flights
        )


# Global instance
travel_service = TravelService()
