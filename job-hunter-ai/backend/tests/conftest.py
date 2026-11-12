import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/test.db")
os.environ.setdefault("STORAGE_DIR", f"{_tmp}/storage")
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.profile_data import initial_profile  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_client(client):
    r = client.post("/api/auth/register", json={"email": "anass@example.com", "password": "Sup3r-secret!", "full_name": "Test"})
    assert r.status_code == 200
    return client


@pytest.fixture()
def profile():
    return initial_profile()


class FakeOffer:
    """Objet minimal compatible avec le moteur de scoring."""

    def __init__(self, **kw):
        defaults = dict(title="", description="", company="", contract_types=[], skills_required=[], skills_desired=[],
                        education_level=None, experience_years=None, beginner_ok=None, work_mode=None, travel_minutes=None,
                        travel_source=None, latitude=None, longitude=None, salary_max_annual=None, salary_label=None,
                        license_required=None, english_required=None, location_label="", needs_details=False, is_urgent=False,
                        company_type=None)
        defaults.update(kw)
        self.__dict__.update(defaults)


@pytest.fixture()
def make_offer():
    return FakeOffer
