import math
from typing import List, Tuple

def calculate_heading(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates bearing/heading from point 1 to point 2 in degrees (0-360)."""
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(d_lon)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two lat/lon coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def interpolate_position(start_point: Tuple[float, float], end_point: Tuple[float, float], fraction: float) -> Tuple[float, float]:
    """Interpolates position between start_point (lat, lon) and end_point (lat, lon)."""
    lat = start_point[0] + (end_point[0] - start_point[0]) * fraction
    lon = start_point[1] + (end_point[1] - start_point[1]) * fraction
    return (lat, lon)

def get_position_along_road_path(
    path: List[Tuple[float, float]],
    distance_meters: float
) -> Tuple[float, float, float, float]:
    """
    Traverses a multi-point road polyline path by an exact distance in meters.
    Guarantees 100% strict snap-to-road: position ALWAYS lies directly on a road polyline segment.

    Returns:
        (latitude, longitude, heading_degrees, total_path_length_meters)
    """
    if not path or len(path) < 2:
        lat, lon = path[0] if path else (0.0, 0.0)
        return (lat, lon, 0.0, 0.0)

    # 1. Calculate cumulative distances along all road segments
    segment_lengths = []
    total_length = 0.0
    for i in range(len(path) - 1):
        seg_len = haversine_distance(path[i][0], path[i][1], path[i+1][0], path[i+1][1])
        segment_lengths.append(seg_len)
        total_length += seg_len

    if total_length == 0:
        return (path[0][0], path[0][1], 0.0, 0.0)

    # 2. Wrap distance around closed loop route
    target_dist = distance_meters % total_length

    # 3. Find exact segment containing target_dist
    accumulated = 0.0
    for i in range(len(segment_lengths)):
        seg_len = segment_lengths[i]
        if accumulated + seg_len >= target_dist:
            # Fraction along segment i
            segment_dist = target_dist - accumulated
            fraction = segment_dist / seg_len if seg_len > 0 else 0.0
            
            p1 = path[i]
            p2 = path[i + 1]

            lat, lon = interpolate_position(p1, p2, fraction)
            heading = calculate_heading(p1[0], p1[1], p2[0], p2[1])
            return (lat, lon, heading, total_length)

        accumulated += seg_len

    # Fallback to end of path
    last_p1 = path[-2]
    last_p2 = path[-1]
    heading = calculate_heading(last_p1[0], last_p1[1], last_p2[0], last_p2[1])
    return (last_p2[0], last_p2[1], heading, total_length)
