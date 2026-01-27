"""
Flight Lookup Service - 级联查询航班信息
优先级: OpenSky Network -> AirLabs -> AviationStack
"""
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio


class FlightLookupService:
    """航班信息查询服务"""

    def __init__(self):
        self.opensky_base = "https://opensky-network.org/api"
        self.airlabs_base = "https://airlabs.co/api/v9"
        self.aviationstack_base = "http://api.aviationstack.com/v1"
        self.aerodatabox_base = "https://aerodatabox.p.rapidapi.com"

        # API keys (从配置加载)
        self.airlabs_key = None
        self.aviationstack_key = None
        self.aerodatabox_key = None
        self.opensky_username = None
        self.opensky_password = None

    def set_api_keys(
        self,
        airlabs_key: str = None,
        aviationstack_key: str = None,
        aerodatabox_key: str = None,
        opensky_username: str = None,
        opensky_password: str = None
    ):
        """设置 API 密钥"""
        self.airlabs_key = airlabs_key
        self.aviationstack_key = aviationstack_key
        self.aerodatabox_key = aerodatabox_key
        self.opensky_username = opensky_username
        self.opensky_password = opensky_password

    async def lookup_flight(self, flight_number: str, date: str) -> Dict[str, Any]:
        """
        级联查询航班信息
        Args:
            flight_number: 航班号 (如 CA123, UA456)
            date: 日期 (YYYY-MM-DD)
        Returns:
            航班信息字典
        """
        result = {
            "success": False,
            "source": None,
            "data": None,
            "error": None
        }

        # 解析航班号
        airline_code, flight_num = self._parse_flight_number(flight_number)
        if not airline_code:
            result["error"] = "Invalid flight number format"
            return result

        # 1. 尝试 AeroDataBox (航班时刻表，支持任意日期)
        if self.aerodatabox_key:
            aero_data = await self._query_aerodatabox(flight_number, date)
            if aero_data:
                result["success"] = True
                result["source"] = "AeroDataBox"
                result["data"] = aero_data
                return result

        # 2. 尝试 OpenSky Network (需要认证访问历史数据)
        opensky_data = await self._query_opensky(airline_code, flight_num, date)
        if opensky_data:
            result["success"] = True
            result["source"] = "OpenSky Network"
            result["data"] = opensky_data
            return result

        # 3. 尝试 AirLabs (1000次/月)
        if self.airlabs_key:
            airlabs_data = await self._query_airlabs(flight_number, date)
            if airlabs_data:
                result["success"] = True
                result["source"] = "AirLabs"
                result["data"] = airlabs_data
                return result

        # 4. 尝试 AviationStack (100次/月)
        if self.aviationstack_key:
            avstack_data = await self._query_aviationstack(flight_number, date)
            if avstack_data:
                result["success"] = True
                result["source"] = "AviationStack"
                result["data"] = avstack_data
                return result

        result["error"] = "Flight not found. Please configure API keys in Settings."
        return result

    def _parse_flight_number(self, flight_number: str) -> tuple:
        """解析航班号为航空公司代码和航班数字"""
        flight_number = flight_number.upper().strip()

        # 尝试分离字母和数字
        airline_code = ""
        flight_num = ""

        for i, char in enumerate(flight_number):
            if char.isdigit():
                airline_code = flight_number[:i]
                flight_num = flight_number[i:]
                break

        if not airline_code or not flight_num:
            return None, None

        return airline_code, flight_num

    async def _query_opensky(self, airline_code: str, flight_num: str, date: str) -> Optional[Dict[str, Any]]:
        """查询 OpenSky Network API (需要认证访问历史数据)"""
        try:
            # 解析日期范围 (当天 00:00 到 23:59)
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            begin = int(date_obj.timestamp())
            end = int((date_obj + timedelta(days=1)).timestamp())

            # 设置认证 (如果有)
            auth = None
            if self.opensky_username and self.opensky_password:
                auth = (self.opensky_username, self.opensky_password)

            async with httpx.AsyncClient(timeout=15.0, auth=auth) as client:
                response = await client.get(
                    f"{self.opensky_base}/flights/all",
                    params={"begin": begin, "end": end}
                )

                if response.status_code != 200:
                    print(f"OpenSky error: {response.status_code} - {response.text[:200]}")
                    return None

                flights = response.json()

                # 在结果中查找匹配的航班
                for flight in flights:
                    callsign = flight.get("callsign", "").strip()
                    if callsign.startswith(f"{airline_code}{flight_num}"):
                        return self._normalize_opensky_data(flight, airline_code, flight_num, date)

                return None
        except Exception as e:
            print(f"OpenSky query error: {e}")
            return None

    def _normalize_opensky_data(self, flight: Dict, airline_code: str, flight_num: str, date: str) -> Dict[str, Any]:
        """标准化 OpenSky 数据格式"""
        return {
            "flight_number": f"{airline_code}{flight_num}",
            "airline_code": airline_code,
            "date": date,
            "departure_airport": flight.get("estDepartureAirport"),
            "arrival_airport": flight.get("estArrivalAirport"),
            "departure_time": self._timestamp_to_time(flight.get("firstSeen")),
            "arrival_time": self._timestamp_to_time(flight.get("lastSeen")),
            "status": "completed" if flight.get("lastSeen") else "in_flight",
            "aircraft_icao24": flight.get("icao24"),
        }

    def _timestamp_to_time(self, timestamp: Optional[int]) -> Optional[str]:
        """将时间戳转换为时间字符串"""
        if not timestamp:
            return None
        return datetime.fromtimestamp(timestamp).strftime("%H:%M")

    async def _query_airlabs(self, flight_number: str, date: str) -> Optional[Dict[str, Any]]:
        """查询 AirLabs API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.airlabs_base}/flight",
                    params={
                        "api_key": self.airlabs_key,
                        "flight_iata": flight_number
                    }
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                if not data.get("response"):
                    return None

                flight = data["response"]
                return self._normalize_airlabs_data(flight, date)
        except Exception as e:
            print(f"AirLabs query error: {e}")
            return None

    def _normalize_airlabs_data(self, flight: Dict, date: str) -> Dict[str, Any]:
        """标准化 AirLabs 数据格式"""
        return {
            "flight_number": flight.get("flight_iata"),
            "airline_code": flight.get("airline_iata"),
            "airline_name": flight.get("airline_name"),
            "date": date,
            "departure_airport": flight.get("dep_iata"),
            "departure_city": flight.get("dep_city"),
            "arrival_airport": flight.get("arr_iata"),
            "arrival_city": flight.get("arr_city"),
            "departure_time": flight.get("dep_time"),
            "arrival_time": flight.get("arr_time"),
            "status": flight.get("status"),
            "aircraft_type": flight.get("aircraft_icao"),
        }

    async def _query_aviationstack(self, flight_number: str, date: str) -> Optional[Dict[str, Any]]:
        """查询 AviationStack API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.aviationstack_base}/flights",
                    params={
                        "access_key": self.aviationstack_key,
                        "flight_iata": flight_number,
                        "flight_date": date
                    }
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                flights = data.get("data", [])
                if not flights:
                    return None

                return self._normalize_aviationstack_data(flights[0], date)
        except Exception as e:
            print(f"AviationStack query error: {e}")
            return None

    def _normalize_aviationstack_data(self, flight: Dict, date: str) -> Dict[str, Any]:
        """标准化 AviationStack 数据格式"""
        dep = flight.get("departure", {})
        arr = flight.get("arrival", {})
        airline = flight.get("airline", {})
        aircraft = flight.get("aircraft", {})

        return {
            "flight_number": flight.get("flight", {}).get("iata"),
            "airline_code": airline.get("iata"),
            "airline_name": airline.get("name"),
            "date": date,
            "departure_airport": dep.get("iata"),
            "departure_city": dep.get("timezone", "").split("/")[-1] if dep.get("timezone") else None,
            "arrival_airport": arr.get("iata"),
            "arrival_city": arr.get("timezone", "").split("/")[-1] if arr.get("timezone") else None,
            "departure_time": dep.get("scheduled", "").split("T")[-1][:5] if dep.get("scheduled") else None,
            "arrival_time": arr.get("scheduled", "").split("T")[-1][:5] if arr.get("scheduled") else None,
            "status": flight.get("flight_status"),
            "aircraft_type": aircraft.get("iata"),
        }

    async def _query_aerodatabox(self, flight_number: str, date: str) -> Optional[Dict[str, Any]]:
        """查询 AeroDataBox API (航班时刻表)"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.aerodatabox_base}/flights/number/{flight_number}/{date}",
                    headers={
                        "X-RapidAPI-Key": self.aerodatabox_key,
                        "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
                    }
                )

                if response.status_code != 200:
                    return None

                flights = response.json()
                if not flights:
                    return None

                return self._normalize_aerodatabox_data(flights[0], date)
        except Exception as e:
            print(f"AeroDataBox query error: {e}")
            return None

    def _normalize_aerodatabox_data(self, flight: Dict, date: str) -> Dict[str, Any]:
        """标准化 AeroDataBox 数据格式"""
        dep = flight.get("departure", {})
        arr = flight.get("arrival", {})

        # 提取时间 (嵌套结构: scheduledTime.local, revisedTime.local)
        scheduled_dep = dep.get("scheduledTime", {}).get("local")
        scheduled_arr = arr.get("scheduledTime", {}).get("local")
        revised_dep = dep.get("revisedTime", {}).get("local")
        revised_arr = arr.get("revisedTime", {}).get("local")

        # 优先使用修订时间，否则使用计划时间
        dep_time = revised_dep or scheduled_dep
        arr_time = revised_arr or scheduled_arr

        # 获取飞行距离 (km)
        distance_km = flight.get("greatCircleDistance", {}).get("km")

        # 计算飞行时长 (分钟)
        duration_minutes = None
        dep_utc = dep.get("revisedTime", {}).get("utc") or dep.get("scheduledTime", {}).get("utc")
        arr_utc = arr.get("revisedTime", {}).get("utc") or arr.get("scheduledTime", {}).get("utc")
        if dep_utc and arr_utc:
            try:
                dep_dt = datetime.strptime(dep_utc.replace("Z", ""), "%Y-%m-%d %H:%M")
                arr_dt = datetime.strptime(arr_utc.replace("Z", ""), "%Y-%m-%d %H:%M")
                duration_minutes = int((arr_dt - dep_dt).total_seconds() / 60)
            except:
                pass

        return {
            "flight_number": flight.get("number"),
            "airline_code": flight.get("airline", {}).get("iata"),
            "airline_name": flight.get("airline", {}).get("name"),
            "date": date,
            "departure_airport": dep.get("airport", {}).get("iata"),
            "departure_city": dep.get("airport", {}).get("municipalityName"),
            "arrival_airport": arr.get("airport", {}).get("iata"),
            "arrival_city": arr.get("airport", {}).get("municipalityName"),
            "departure_time": self._extract_time(dep_time),
            "arrival_time": self._extract_time(arr_time),
            "scheduled_departure": self._extract_time(scheduled_dep),
            "scheduled_arrival": self._extract_time(scheduled_arr),
            "distance_km": distance_km,
            "duration_minutes": duration_minutes,
            "status": flight.get("status"),
            "aircraft_type": flight.get("aircraft", {}).get("model"),
            "aircraft_registration": flight.get("aircraft", {}).get("reg"),
            "departure_gate": dep.get("gate"),
            "arrival_terminal": arr.get("terminal"),
            "arrival_gate": arr.get("gate"),
        }

    def _extract_time(self, datetime_str: Optional[str]) -> Optional[str]:
        """从日期时间字符串提取时间"""
        if not datetime_str:
            return None
        try:
            # 格式: "2025-12-29 16:19+08:00" 或 "2025-12-29T16:19:00"
            if " " in datetime_str:
                # 空格分隔格式
                time_part = datetime_str.split(" ")[1]
                return time_part[:5]
            elif "T" in datetime_str:
                return datetime_str.split("T")[1][:5]
            return datetime_str[:5]
        except:
            return None


# 创建单例实例
flight_lookup_service = FlightLookupService()
