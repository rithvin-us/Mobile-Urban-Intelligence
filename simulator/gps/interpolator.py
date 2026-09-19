import math

def calculate_heading(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates bearing/heading from point 1 to point 2 in degrees (0-360)."""
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(d_lon)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

def interpolate_position(start_point: tuple, end_point: tuple, fraction: float) -> tuple:
    """Interpolates position between start_point (lat, lon) and end_point (lat, lon)."""
    lat = start_point[0] + (end_point[0] - start_point[0]) * fraction
    lon = start_point[1] + (end_point[1] - start_point[1]) * fraction
    return (lat, lon)
