from fastapi.testclient import TestClient

from app.main import app


def test_health_exposes_cache_metrics():
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert set(body["cache"]) == {"data", "gaming", "namespaces"}
