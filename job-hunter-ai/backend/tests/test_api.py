DESC = ("Missions : administration Windows Server 2022 et Active Directory, gestion DNS/DHCP et VLAN. "
        "Compétences indispensables : Active Directory, Windows Server. Un plus : Azure. Bac+3, débutant accepté.")


def _import(c, **kw):
    body = {"title": "Alternance Administrateur Systèmes et Réseaux H/F", "company": "Safran", "description": DESC,
            "location": "Creil", "contract": "Apprentissage"} | kw
    return c.post("/api/offers/import", json=body).json()["imported"][0]


def test_auth_required(client):
    assert client.get("/api/dashboard").status_code == 401


def test_registration_closed_after_first_user(auth_client):
    auth_client.post("/api/auth/logout")
    r = auth_client.post("/api/auth/register", json={"email": "other@example.com", "password": "Sup3r-secret!"})
    assert r.status_code == 403


def test_weak_password_rejected(client):
    assert client.post("/api/auth/register", json={"email": "x@example.com", "password": "short"}).status_code == 422


def test_import_dedup_and_filters(auth_client):
    a = _import(auth_client)
    assert a["status"] == "new" and a["offer"]["score"] >= 70
    b = _import(auth_client, title="Administrateur systèmes et réseaux (H/F) en alternance", company="SAFRAN SA", source="indeed")
    assert b["status"] == "duplicate" and b["offer"]["id"] == a["offer"]["id"]
    offer = auth_client.get(f"/api/offers/{a['offer']['id']}").json()
    assert {s["source"] for s in offer["source_links"]} == {"manual", "indeed"}
    assert auth_client.post("/api/offers/search", json={"contracts": ["cdi"]}).json()["total"] == 0
    assert auth_client.post("/api/offers/search", json={"contracts": ["alternance"], "min_score": 60}).json()["total"] == 1
    assert auth_client.post("/api/offers/search", json={"locations": ["Versailles"], "radius_km": 10}).json()["total"] == 0
    assert auth_client.post("/api/offers/search", json={"locations": ["Creil"], "radius_km": 10}).json()["total"] == 1


def test_offer_isolation_between_users(auth_client):
    from app.config import get_settings

    oid = _import(auth_client)["offer"]["id"]
    auth_client.post("/api/auth/logout")
    get_settings().allow_registration = True
    try:
        auth_client.post("/api/auth/register", json={"email": "b@example.com", "password": "Sup3r-secret!"})
        assert auth_client.get(f"/api/offers/{oid}").status_code == 404
    finally:
        get_settings().allow_registration = False


def test_cv_tailor_never_invents(auth_client):
    oid = _import(auth_client, description=DESC + " Kubernetes et Terraform indispensables.")["offer"]["id"]
    t = auth_client.post("/api/studio/cvs/tailor", json={"offer_id": oid}).json()
    text = str(t["cv"]["content"])
    assert "Kubernetes" not in text and "Terraform" not in text
    assert any("absents de votre parcours" in c for c in t["changes"])
    pdf = auth_client.get(f"/api/studio/cvs/{t['cv']['id']}/export?format=pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    docx = auth_client.get(f"/api/studio/cvs/{t['cv']['id']}/export?format=docx")
    assert docx.status_code == 200 and docx.content[:2] == b"PK"


def test_cv_revisions(auth_client):
    cv = auth_client.get("/api/studio/cvs").json()[0]
    full = auth_client.get(f"/api/studio/cvs/{cv['id']}").json()
    full["content"]["summary"] = "Nouveau résumé"
    saved = auth_client.put(f"/api/studio/cvs/{cv['id']}", json={"name": full["name"], "template": "minimal", "theme": {}, "content": full["content"]}).json()
    assert saved["revision"] == 2
    revs = auth_client.get(f"/api/studio/cvs/{cv['id']}/revisions").json()
    assert len(revs) == 1
    restored = auth_client.post(f"/api/studio/cvs/{cv['id']}/revisions/{revs[0]['id']}/restore").json()
    assert restored["content"]["summary"] != "Nouveau résumé"


def test_letter_analysis_flags_generic(auth_client):
    oid = _import(auth_client)["offer"]["id"]
    letter = auth_client.post("/api/studio/letters/generate", json={"offer_id": oid}).json()
    assert letter["generated_by"] == "template"  # pas de clé API en test : brouillon signalé comme tel
    body = "Actuellement étudiant en informatique, je suis dynamique et motivé.\n\nJ'ai un bon esprit d'équipe."
    saved = auth_client.put(f"/api/studio/letters/{letter['id']}", json={"title": "x", "body": body}).json()
    assert saved["analysis"]["scores"]["originalite"] < 70
    assert saved["analysis"]["generic_phrases"]


def test_application_workflow_requires_confirmation(auth_client):
    oid = _import(auth_client)["offer"]["id"]
    app_ = auth_client.post(f"/api/applications/from-offer/{oid}").json()
    r = auth_client.post(f"/api/applications/{app_['id']}/send", json={"to": "rh@example.com", "subject": "s", "body": "b", "confirm": True})
    assert r.status_code == 400  # dossier non validé
    cv_id = auth_client.get("/api/studio/cvs").json()[0]["id"]
    v = auth_client.post(f"/api/applications/{app_['id']}/validate", json={"cv_id": cv_id}).json()
    assert v["validated"] and v["documents"][0]["has_pdf"]
    p = auth_client.patch(f"/api/applications/{app_['id']}", json={"status": "entretien_rh"}).json()
    assert any(e["payload"].get("to") == "entretien_rh" for e in p["events"])
    assert auth_client.get("/api/dashboard").json()["kpis"]["interviews"] == 1


def test_scheduler_is_reported_inactive(auth_client):
    s = auth_client.get("/api/dashboard").json()["scheduler"]
    assert s["active"] is False and "PAS active" in s["message"]
