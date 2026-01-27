from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from app.models.travel import Flight, AirlineStats, Achievement, TravelStatistics
from app.services.travel_service import travel_service
from app.services.flight_lookup_service import flight_lookup_service
from app.services.airport_data_service import airport_data_service
from app.services.data_manager import DataManager

router = APIRouter()
data_manager = DataManager()


# Flight endpoints
@router.get("/flights", response_model=List[Flight])
async def get_flights():
    """Get all flights"""
    return travel_service.get_flights()


@router.get("/flights/{flight_id}", response_model=Flight)
async def get_flight(flight_id: str):
    """Get flight by ID"""
    flight = travel_service.get_flight(flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight


@router.post("/flights", response_model=Flight)
async def create_flight(flight: Flight):
    """Create new flight"""
    return travel_service.create_flight(flight)


@router.put("/flights/{flight_id}", response_model=Flight)
async def update_flight(flight_id: str, flight: Flight):
    """Update flight"""
    updated = travel_service.update_flight(flight_id, flight)
    if not updated:
        raise HTTPException(status_code=404, detail="Flight not found")
    return updated


@router.delete("/flights/{flight_id}")
async def delete_flight(flight_id: str):
    """Delete flight"""
    success = travel_service.delete_flight(flight_id)
    if not success:
        raise HTTPException(status_code=404, detail="Flight not found")
    return {"message": "Flight deleted successfully"}


# Airline statistics endpoints
@router.get("/airlines", response_model=List[AirlineStats])
async def get_airline_stats():
    """Get airline statistics"""
    return travel_service.get_airline_stats()


# Achievements endpoint
@router.get("/achievements", response_model=List[Achievement])
async def get_achievements():
    """Get travel achievements"""
    return travel_service.get_achievements()


# Statistics endpoint
@router.get("/statistics", response_model=TravelStatistics)
async def get_statistics():
    """Get travel statistics"""
    return travel_service.get_statistics()


# Flight lookup endpoint
@router.get("/lookup")
async def lookup_flight(
    flight_number: str = Query(..., description="航班号 (如 CA123, UA456)"),
    date: str = Query(..., description="日期 (YYYY-MM-DD)")
):
    """
    查询航班信息
    级联查询: AeroDataBox -> OpenSky -> AirLabs -> AviationStack
    """
    # 从配置加载 API 密钥
    config = data_manager.read_data("config.json")
    api_keys = config.get("api_keys", {})
    flight_lookup_service.set_api_keys(
        aerodatabox_key=api_keys.get("aerodatabox_key"),
        opensky_username=api_keys.get("opensky_username"),
        opensky_password=api_keys.get("opensky_password"),
        airlabs_key=api_keys.get("airlabs_key"),
        aviationstack_key=api_keys.get("aviationstack_key")
    )

    result = await flight_lookup_service.lookup_flight(flight_number, date)
    return result


@router.get("/map-data")
async def get_map_data() -> Dict[str, Any]:
    """Get flight data formatted for map display"""
    flights = travel_service.get_flights()

    airports = {}
    routes = []

    for flight in flights:
        origin = flight.origin.upper()
        dest = flight.destination.upper()

        # Get coordinates for origin
        if origin not in airports:
            coords = airport_data_service.get_coordinates(origin)
            if coords:
                airports[origin] = {
                    "code": origin,
                    "lat": coords[0],
                    "lng": coords[1],
                    "country": airport_data_service.get_country(origin),
                    "flights": 0
                }
        if origin in airports:
            airports[origin]["flights"] += 1

        # Get coordinates for destination
        if dest not in airports:
            coords = airport_data_service.get_coordinates(dest)
            if coords:
                airports[dest] = {
                    "code": dest,
                    "lat": coords[0],
                    "lng": coords[1],
                    "country": airport_data_service.get_country(dest),
                    "flights": 0
                }
        if dest in airports:
            airports[dest]["flights"] += 1

        # Add route if both airports have coordinates
        if origin in airports and dest in airports:
            routes.append({
                "id": flight.id,
                "origin": origin,
                "destination": dest,
                "originCoords": [airports[origin]["lat"], airports[origin]["lng"]],
                "destCoords": [airports[dest]["lat"], airports[dest]["lng"]],
                "airline": flight.airline,
                "flightNumber": flight.flight_number,
                "date": flight.date,
                "distance": flight.distance
            })

    return {
        "airports": list(airports.values()),
        "routes": routes
    }
