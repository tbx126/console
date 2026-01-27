from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Flight(BaseModel):
    """Flight model"""
    id: Optional[str] = None
    airline: str
    airline_code: Optional[str] = None  # IATA code for logo display
    flight_number: str
    origin: str
    destination: str
    date: str  # ISO format date string
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    distance: Optional[float] = None  # in km
    cost: Optional[float] = None
    travel_class: str = "economy"  # economy, business, first
    seat: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class AirlineStats(BaseModel):
    """Airline statistics model"""
    airline: str
    total_flights: int = 0
    total_km: float = 0
    total_cost: float = 0
    favorite_route: Optional[str] = None


class Achievement(BaseModel):
    """Travel achievement model"""
    id: str
    title: str
    description: str
    icon: str
    category: Optional[str] = None
    achieved: bool = False
    achieved_date: Optional[str] = None


class TravelStatistics(BaseModel):
    """Travel statistics model"""
    total_flights: int = 0
    total_km: float = 0
    total_cost: float = 0
    countries_visited: int = 0
    cities_visited: int = 0
    airports_visited: int = 0
    airlines_used: int = 0
    favorite_airline: Optional[str] = None
    this_year_flights: int = 0
