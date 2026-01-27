"""
Airport Data Service - 机场信息映射服务
提供机场代码到国家、大洲的映射
"""
from typing import Optional, Dict, Tuple
import json
import os

# 大洲映射
CONTINENTS = {
    "AS": "Asia",
    "EU": "Europe",
    "NA": "North America",
    "SA": "South America",
    "AF": "Africa",
    "OC": "Oceania",
    "AN": "Antarctica"
}

# 国家到大洲映射
COUNTRY_TO_CONTINENT = {
    # Asia
    "CN": "AS", "JP": "AS", "KR": "AS", "TW": "AS", "HK": "AS", "MO": "AS",
    "SG": "AS", "TH": "AS", "VN": "AS", "MY": "AS", "ID": "AS", "PH": "AS",
    "IN": "AS", "PK": "AS", "BD": "AS", "LK": "AS", "NP": "AS",
    "AE": "AS", "SA": "AS", "QA": "AS", "KW": "AS", "BH": "AS", "OM": "AS",
    "IL": "AS", "TR": "AS", "IR": "AS", "IQ": "AS", "JO": "AS", "LB": "AS",
    "KZ": "AS", "UZ": "AS", "MN": "AS", "MM": "AS", "KH": "AS", "LA": "AS",
    # Europe
    "GB": "EU", "FR": "EU", "DE": "EU", "IT": "EU", "ES": "EU", "PT": "EU",
    "NL": "EU", "BE": "EU", "CH": "EU", "AT": "EU", "SE": "EU", "NO": "EU",
    "DK": "EU", "FI": "EU", "IE": "EU", "PL": "EU", "CZ": "EU", "HU": "EU",
    "GR": "EU", "RU": "EU", "UA": "EU", "RO": "EU", "BG": "EU", "HR": "EU",
    "SK": "EU", "SI": "EU", "RS": "EU", "LT": "EU", "LV": "EU", "EE": "EU",
    "IS": "EU", "LU": "EU", "MT": "EU", "CY": "EU", "MC": "EU",
    # North America
    "US": "NA", "CA": "NA", "MX": "NA", "CU": "NA", "JM": "NA", "HT": "NA",
    "DO": "NA", "PR": "NA", "BS": "NA", "PA": "NA", "CR": "NA", "GT": "NA",
    "HN": "NA", "SV": "NA", "NI": "NA", "BZ": "NA", "TT": "NA", "BB": "NA",
    # South America
    "BR": "SA", "AR": "SA", "CL": "SA", "CO": "SA", "PE": "SA", "VE": "SA",
    "EC": "SA", "BO": "SA", "PY": "SA", "UY": "SA", "GY": "SA", "SR": "SA",
    # Africa
    "ZA": "AF", "EG": "AF", "MA": "AF", "NG": "AF", "KE": "AF", "ET": "AF",
    "TZ": "AF", "GH": "AF", "CI": "AF", "SN": "AF", "TN": "AF", "DZ": "AF",
    "UG": "AF", "ZW": "AF", "MU": "AF", "RW": "AF", "CM": "AF", "AO": "AF",
    # Oceania
    "AU": "OC", "NZ": "OC", "FJ": "OC", "PG": "OC", "NC": "OC", "PF": "OC",
    "GU": "OC", "WS": "OC", "TO": "OC", "VU": "OC",
}

# 常用机场代码到国家代码映射
AIRPORT_TO_COUNTRY = {
    # China
    "PEK": "CN", "PKX": "CN", "PVG": "CN", "SHA": "CN", "CAN": "CN", "SZX": "CN",
    "CTU": "CN", "TFU": "CN", "CKG": "CN", "HGH": "CN", "NKG": "CN", "WUH": "CN",
    "XIY": "CN", "TAO": "CN", "DLC": "CN", "SHE": "CN", "TSN": "CN", "KMG": "CN",
    "XMN": "CN", "NNG": "CN", "HAK": "CN", "SYX": "CN", "CGO": "CN", "CSX": "CN",
    "HRB": "CN", "CGQ": "CN", "TNA": "CN", "FOC": "CN", "WNZ": "CN", "NGB": "CN", "TYN": "CN",
    # Hong Kong, Macau, Taiwan
    "HKG": "HK", "MFM": "MO", "TPE": "TW", "TSA": "TW", "KHH": "TW", "RMQ": "TW",
    # Japan
    "NRT": "JP", "HND": "JP", "KIX": "JP", "ITM": "JP", "NGO": "JP", "CTS": "JP",
    "FUK": "JP", "OKA": "JP", "KOJ": "JP", "HIJ": "JP", "SDJ": "JP", "NGS": "JP",
    # Korea
    "ICN": "KR", "GMP": "KR", "PUS": "KR", "CJU": "KR", "TAE": "KR", "KWJ": "KR",
    # Southeast Asia
    "SIN": "SG", "BKK": "TH", "DMK": "TH", "HKT": "TH", "CNX": "TH",
    "SGN": "VN", "HAN": "VN", "DAD": "VN", "CXR": "VN",
    "KUL": "MY", "PEN": "MY", "BKI": "MY", "KCH": "MY", "LGK": "MY",
    "CGK": "ID", "DPS": "ID", "SUB": "ID", "JOG": "ID", "UPG": "ID",
    "MNL": "PH", "CEB": "PH", "DVO": "PH", "CRK": "PH",
    "RGN": "MM", "MDL": "MM", "PNH": "KH", "REP": "KH", "VTE": "LA",
    # South Asia
    "DEL": "IN", "BOM": "IN", "BLR": "IN", "MAA": "IN", "CCU": "IN", "HYD": "IN",
    "CMB": "LK", "KTM": "NP", "DAC": "BD", "ISB": "PK", "KHI": "PK", "LHE": "PK",
    # Middle East
    "DXB": "AE", "AUH": "AE", "SHJ": "AE", "DOH": "QA", "RUH": "SA", "JED": "SA",
    "KWI": "KW", "BAH": "BH", "MCT": "OM", "TLV": "IL", "AMM": "JO", "BEY": "LB",
    "IST": "TR", "SAW": "TR", "ESB": "TR", "AYT": "TR", "IKA": "IR", "THR": "IR",
    # Europe
    "LHR": "GB", "LGW": "GB", "STN": "GB", "MAN": "GB", "EDI": "GB", "BHX": "GB",
    "CDG": "FR", "ORY": "FR", "NCE": "FR", "LYS": "FR", "MRS": "FR",
    "FRA": "DE", "MUC": "DE", "TXL": "DE", "BER": "DE", "DUS": "DE", "HAM": "DE",
    "FCO": "IT", "MXP": "IT", "LIN": "IT", "VCE": "IT", "NAP": "IT",
    "MAD": "ES", "BCN": "ES", "PMI": "ES", "AGP": "ES", "ALC": "ES",
    "LIS": "PT", "OPO": "PT", "FAO": "PT",
    "AMS": "NL", "BRU": "BE", "ZRH": "CH", "GVA": "CH", "VIE": "AT",
    "ARN": "SE", "GOT": "SE", "OSL": "NO", "CPH": "DK", "HEL": "FI",
    "DUB": "IE", "WAW": "PL", "KRK": "PL", "PRG": "CZ", "BUD": "HU",
    "ATH": "GR", "SKG": "GR", "SVO": "RU", "DME": "RU", "VKO": "RU", "LED": "RU",
    # North America
    "JFK": "US", "EWR": "US", "LGA": "US", "LAX": "US", "SFO": "US", "SJC": "US",
    "ORD": "US", "ATL": "US", "DFW": "US", "IAH": "US", "DEN": "US", "SEA": "US",
    "MIA": "US", "BOS": "US", "PHL": "US", "IAD": "US", "DCA": "US", "MSP": "US",
    "DTW": "US", "PHX": "US", "LAS": "US", "SAN": "US", "MCO": "US", "TPA": "US",
    "YYZ": "CA", "YVR": "CA", "YUL": "CA", "YYC": "CA", "YOW": "CA", "YEG": "CA",
    "MEX": "MX", "CUN": "MX", "GDL": "MX", "MTY": "MX", "SJD": "MX", "PVR": "MX",
    "HAV": "CU", "MBJ": "JM", "KIN": "JM", "SDQ": "DO", "PUJ": "DO",
    "PTY": "PA", "SJO": "CR", "GUA": "GT", "SAL": "SV",
    # South America
    "GRU": "BR", "GIG": "BR", "BSB": "BR", "CNF": "BR", "SSA": "BR", "REC": "BR",
    "EZE": "AR", "AEP": "AR", "SCL": "CL", "BOG": "CO", "MDE": "CO",
    "LIM": "PE", "CCS": "VE", "UIO": "EC", "GYE": "EC",
    # Africa
    "JNB": "ZA", "CPT": "ZA", "DUR": "ZA", "CAI": "EG", "HRG": "EG", "SSH": "EG",
    "CMN": "MA", "RAK": "MA", "LOS": "NG", "ABV": "NG", "NBO": "KE", "MBA": "KE",
    "ADD": "ET", "DAR": "TZ", "ACC": "GH", "ABJ": "CI", "DSS": "SN",
    "TUN": "TN", "ALG": "DZ", "MRU": "MU",
    # Oceania
    "SYD": "AU", "MEL": "AU", "BNE": "AU", "PER": "AU", "ADL": "AU", "CBR": "AU",
    "AKL": "NZ", "WLG": "NZ", "CHC": "NZ", "ZQN": "NZ",
    "NAN": "FJ", "SUV": "FJ", "PPT": "PF", "NOU": "NC",
}

# 本地缓存（运行时从API获取的数据）
_airport_cache: Dict[str, str] = {}

# 机场坐标数据 (lat, lng)
AIRPORT_COORDINATES = {
    # China
    "PEK": (40.0799, 116.6031), "PKX": (39.5098, 116.4105), "PVG": (31.1443, 121.8083),
    "SHA": (31.1979, 121.3363), "CAN": (23.3924, 113.2988), "SZX": (22.6393, 113.8107),
    "CTU": (30.5785, 103.9471), "CKG": (29.7192, 106.6417), "HGH": (30.2295, 120.4344),
    "NKG": (31.7420, 118.8620), "WUH": (30.7838, 114.2081), "XIY": (34.4471, 108.7516),
    "TAO": (36.2661, 120.3744), "DLC": (38.9657, 121.5386), "SHE": (41.6398, 123.4833),
    "TSN": (39.1244, 117.3463), "KMG": (24.9924, 102.7432), "XMN": (24.5440, 118.1277),
    "CSX": (28.1892, 113.2200), "TYN": (37.7469, 112.6283),
    # Hong Kong, Macau, Taiwan
    "HKG": (22.3080, 113.9185), "MFM": (22.1496, 113.5920),
    "TPE": (25.0777, 121.2328), "KHH": (22.5771, 120.3500),
    # Japan
    "NRT": (35.7647, 140.3864), "HND": (35.5494, 139.7798), "KIX": (34.4347, 135.2441),
    "NGO": (34.8584, 136.8049), "CTS": (42.7752, 141.6925), "FUK": (33.5859, 130.4511),
    "OKA": (26.1958, 127.6459),
    # Korea
    "ICN": (37.4602, 126.4407), "GMP": (37.5583, 126.7906), "PUS": (35.1795, 128.9382),
    "CJU": (33.5113, 126.4929),
    # Southeast Asia
    "SIN": (1.3644, 103.9915), "BKK": (13.6900, 100.7501), "DMK": (13.9126, 100.6068),
    "HKT": (8.1132, 98.3169), "SGN": (10.8188, 106.6520), "HAN": (21.2212, 105.8072),
    "KUL": (2.7456, 101.7099), "PEN": (5.2973, 100.2768), "LGK": (6.3297, 99.7287),
    "CGK": (-6.1256, 106.6559), "DPS": (-8.7482, 115.1672), "MNL": (14.5086, 121.0198),
    # South Asia & Middle East
    "DEL": (28.5562, 77.1000), "BOM": (19.0896, 72.8656), "BLR": (13.1986, 77.7066),
    "DXB": (25.2532, 55.3657), "AUH": (24.4330, 54.6511), "DOH": (25.2731, 51.6081),
    "IST": (41.2753, 28.7519), "TLV": (32.0055, 34.8854),
    # Europe
    "LHR": (51.4700, -0.4543), "LGW": (51.1537, -0.1821), "CDG": (49.0097, 2.5479),
    "FRA": (50.0379, 8.5622), "MUC": (48.3538, 11.7861), "AMS": (52.3105, 4.7683),
    "MAD": (40.4983, -3.5676), "BCN": (41.2974, 2.0833), "FCO": (41.8003, 12.2389),
    "ZRH": (47.4647, 8.5492), "VIE": (48.1103, 16.5697), "CPH": (55.6180, 12.6560),
}


class AirportDataService:
    """机场数据服务"""

    def get_country(self, airport_code: str) -> Optional[str]:
        """获取机场所属国家代码"""
        code = airport_code.upper().strip()

        # 1. 查内置表
        if code in AIRPORT_TO_COUNTRY:
            return AIRPORT_TO_COUNTRY[code]

        # 2. 查缓存
        if code in _airport_cache:
            return _airport_cache[code]

        return None

    def get_continent(self, airport_code: str) -> Optional[str]:
        """获取机场所属大洲"""
        country = self.get_country(airport_code)
        if country and country in COUNTRY_TO_CONTINENT:
            return COUNTRY_TO_CONTINENT[country]
        return None

    def get_continent_name(self, continent_code: str) -> str:
        """获取大洲名称"""
        return CONTINENTS.get(continent_code, continent_code)

    def add_to_cache(self, airport_code: str, country_code: str):
        """添加到缓存"""
        _airport_cache[airport_code.upper()] = country_code.upper()

    def get_coordinates(self, airport_code: str) -> Optional[Tuple[float, float]]:
        """获取机场坐标 (lat, lng)"""
        code = airport_code.upper().strip()
        return AIRPORT_COORDINATES.get(code)


# 单例
airport_data_service = AirportDataService()
