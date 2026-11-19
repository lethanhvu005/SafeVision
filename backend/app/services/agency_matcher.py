import json
from typing import Iterable

from backend.app.models.agency import Agency


class AgencyMatcher:
    @staticmethod
    def point_in_polygon(lat: float, lon: float, polygon: list[list[float]]) -> bool:
        inside = False
        j = len(polygon) - 1
        for i in range(len(polygon)):
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            intersects = ((yi > lon) != (yj > lon)) and (lat < (xj - xi) * (lon - yi) / ((yj - yi) or 1e-9) + xi)
            if intersects:
                inside = not inside
            j = i
        return inside

    @classmethod
    def match(cls, lat: float | None, lon: float | None, agencies: Iterable[Agency]) -> Agency | None:
        active = [agency for agency in agencies if agency.is_active]
        if lat is None or lon is None:
            return next((agency for agency in active if agency.is_default), None)

        for agency in active:
            if agency.lat_min is not None and agency.lat_max is not None and agency.lon_min is not None and agency.lon_max is not None:
                if agency.lat_min <= lat <= agency.lat_max and agency.lon_min <= lon <= agency.lon_max:
                    return agency
            if agency.polygon_geojson:
                try:
                    data = json.loads(agency.polygon_geojson)
                    coordinates = data.get('coordinates', [[]])[0]
                    polygon = [[point[1], point[0]] for point in coordinates]
                    if polygon and cls.point_in_polygon(lat, lon, polygon):
                        return agency
                except (json.JSONDecodeError, TypeError, KeyError, IndexError):
                    continue
        return next((agency for agency in active if agency.is_default), None)
