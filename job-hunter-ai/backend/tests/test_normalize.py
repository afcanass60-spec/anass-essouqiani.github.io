from app.services.normalize import (annualize, classify_company, parse_contracts, parse_education, parse_english,
                                    parse_experience, parse_license, parse_salary, parse_work_mode)
from app.services.skills import extract_skills, split_required_desired


def test_contracts():
    assert set(parse_contracts("Contrat d'apprentissage")) >= {"apprentissage", "alternance"}
    assert "professionnalisation" in parse_contracts("contrat de professionnalisation")
    assert parse_contracts("CDI temps plein") == ["cdi"]
    assert "stage" in parse_contracts("Stage de fin d'études")


def test_salary():
    assert parse_salary("35-40 k€") == (35000.0, 40000.0, "year")
    mn, mx, p = parse_salary("Mensuel de 1800.00 Euros à 2200.00 Euros sur 12 mois")
    assert p == "month" and mn == 1800 and mx == 2200
    assert annualize(2000, "month") == 24000
    assert parse_salary(None) == (None, None, None)


def test_education_experience():
    assert parse_education("Bac+5 / Master informatique") == 5
    assert parse_education("BTS SIO ou équivalent bac+2") == 2
    assert parse_experience("3 ans d'expérience minimum")[0] == 3
    assert parse_experience("Débutant accepté")[1] is True


def test_conditions():
    assert parse_work_mode("2 jours de télétravail par semaine") == "hybrid"
    assert parse_work_mode("Full remote") == "remote"
    assert parse_license("Permis B obligatoire") is True
    assert parse_english("Anglais courant exigé") is True
    assert parse_english("anglais technique") is False


def test_company_classification():
    assert classify_company("Capgemini Technology Services")[0] == "esn"
    assert classify_company("Safran Aircraft Engines")[0] == "grand_groupe"
    assert classify_company("Mairie de Creil") == ("public", "public")


def test_skills_required_vs_desired():
    text = "Compétences indispensables : Active Directory, Windows Server.\nUn plus : connaissance de Terraform."
    req, des = split_required_desired(text)
    assert "Active Directory" in req and "Windows Server" in req
    assert "Terraform / IaC" in des
    assert "Proxmox" in extract_skills("Virtualisation sous Proxmox et VMware")
