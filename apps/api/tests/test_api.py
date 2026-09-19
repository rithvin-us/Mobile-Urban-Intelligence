import pytest
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
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_create_and_get_buses():
    # Initial empty list
    response = client.get("/api/buses")
    assert response.status_code == 200
    assert response.json() == []

    # Send telemetry for a new bus
    telemetry_data = {
        "bus_id": "bus-test-01",
        "bus_number": "BUS-100",
        "route_name": "Route A",
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

def test_create_and_get_events():
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
