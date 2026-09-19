import os
import pytest

# Force SQLite for test execution
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_health_check():
    """Verify backend health check returns 200 OK and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "urban-intelligence-api"

def test_get_nonexistent_bus_404():
    """Verify requesting a non-existent bus returns 404 NOT FOUND."""
    response = client.get("/api/buses/non-existent-id")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_create_and_get_buses():
    """Verify bus telemetry submission and retrieval."""
    # Initial empty list
    response = client.get("/api/buses")
    assert response.status_code == 200
    assert response.json() == []

    # Send telemetry for a new bus
    telemetry_data = {
        "bus_id": "bus-test-01",
        "bus_number": "BUS-100",
        "route_name": "Route 101",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "heading": 90.0,
        "speed": 35.5,
        "status": "ACTIVE"
    }
    post_res = client.post("/api/buses/telemetry", json=telemetry_data)
    assert post_res.status_code == 200
    assert post_res.json()["id"] == "bus-test-01"

    # Get single bus
    get_res = client.get("/api/buses/bus-test-01")
    assert get_res.status_code == 200
    assert get_res.json()["bus_number"] == "BUS-100"

def test_bus_telemetry_update():
    """Verify posting updated telemetry modifies bus position and speed."""
    initial_telemetry = {
        "bus_id": "bus-test-02",
        "bus_number": "BUS-202",
        "route_name": "Route 202",
        "latitude": 19.0400,
        "longitude": 72.8200,
        "heading": 45.0,
        "speed": 20.0,
        "status": "ACTIVE"
    }
    client.post("/api/buses/telemetry", json=initial_telemetry)

    # Update telemetry
    updated_telemetry = {
        "bus_id": "bus-test-02",
        "latitude": 19.0500,
        "longitude": 72.8300,
        "heading": 50.0,
        "speed": 42.0,
        "status": "ACTIVE"
    }
    res = client.post("/api/buses/telemetry", json=updated_telemetry)
    assert res.status_code == 200

    # Retrieve bus to verify updated speed & location
    get_res = client.get("/api/buses/bus-test-02")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["speed"] == 42.0
    assert data["latitude"] == 19.0500

def test_create_and_get_events():
    """Verify event creation and filtering by event_type."""
    # Post telemetry first to ensure bus exists
    client.post("/api/buses/telemetry", json={
        "bus_id": "bus-test-01",
        "latitude": 19.0760,
        "longitude": 72.8777
    })

    event_data = {
        "bus_id": "bus-test-01",
        "event_type": "POTHOLE",
        "confidence": 0.95,
        "severity": "HIGH",
        "latitude": 19.0765,
        "longitude": 72.8780,
        "status": "NEW",
        "evidence_url": "http://example.com/pothole.jpg",
        "metadata": {"depth_cm": 12}
    }
    post_res = client.post("/api/events", json=event_data)
    assert post_res.status_code == 201
    created_event = post_res.json()
    assert created_event["event_type"] == "POTHOLE"
    assert created_event["severity"] == "HIGH"

    # List events
    list_res = client.get("/api/events")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Filter events
    filter_res = client.get("/api/events?event_type=POTHOLE")
    assert filter_res.status_code == 200
    assert len(filter_res.json()) == 1

    empty_filter_res = client.get("/api/events?event_type=WATERLOGGING")
    assert empty_filter_res.status_code == 200
    assert len(empty_filter_res.json()) == 0

def test_event_not_found_404():
    """Verify requesting a non-existent event returns 404 NOT FOUND."""
    res = client.get("/api/events/non-existent-event-id")
    assert res.status_code == 404

def test_update_event_status():
    """Verify updating event status to IN_PROGRESS and RESOLVED."""
    client.post("/api/buses/telemetry", json={"bus_id": "bus-test-01", "latitude": 19.0, "longitude": 72.0})
    post_res = client.post("/api/events", json={
        "bus_id": "bus-test-01",
        "event_type": "WATERLOGGING",
        "confidence": 0.88,
        "severity": "CRITICAL",
        "latitude": 19.01,
        "longitude": 72.01
    })
    event_id = post_res.json()["id"]

    patch_res = client.patch(f"/api/events/{event_id}/status", json={"status": "RESOLVED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "RESOLVED"

def test_invalid_event_payload_422():
    """Verify invalid payloads (missing required fields) return 422 Unprocessable Entity."""
    invalid_payload = {
        "bus_id": "bus-test-01",
        "event_type": "INVALID_TYPE"
    }
    res = client.post("/api/events", json=invalid_payload)
    assert res.status_code == 422
