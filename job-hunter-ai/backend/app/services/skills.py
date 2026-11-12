"""Taxonomie de compétences IT (canonique -> synonymes) et domaines métiers.

Sert au matching déterministe : extraction des compétences d'une annonce, distinction
indispensable / souhaité, et rapprochement avec les compétences du profil.
"""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

# canonique : [motifs regex (sur texte normalisé sans accents, minuscule)]
SKILLS: dict[str, list[str]] = {
    "Windows Server": [r"windows server", r"\bwin(dows)? ?srv\b", r"windows 20(16|19|22)"],
    "Active Directory": [r"active directory", r"\bad ds\b", r"\badds\b", r"\bgpo\b", r"strategies? de groupe", r"group policy"],
    "DNS": [r"\bdns\b"],
    "DHCP": [r"\bdhcp\b"],
    "Linux": [r"\blinux\b", r"\bdebian\b", r"\bubuntu\b", r"\bred ?hat\b", r"\brhel\b", r"\bcentos\b", r"\brocky\b"],
    "Bash / Shell": [r"\bbash\b", r"\bshell\b", r"scripting shell"],
    "PowerShell": [r"powershell"],
    "Python": [r"\bpython\b"],
    "Réseaux TCP/IP": [r"tcp ?/ ?ip", r"\breseaux?\b", r"\bnetwork(ing)?\b", r"\blan\b", r"\bwan\b"],
    "VLAN": [r"\bvlans?\b"],
    "Routage / Switching": [r"routage", r"\brouting\b", r"switch(ing|s)?\b", r"commutation", r"\bospf\b", r"\bbgp\b"],
    "802.1X": [r"802\.?1x", r"\bnac\b", r"\bradius\b"],
    "DMZ": [r"\bdmz\b"],
    "Pare-feu": [r"pare[- ]?feu", r"firewall", r"fortinet", r"fortigate", r"palo ?alto", r"pfsense", r"stormshield", r"checkpoint"],
    "VPN": [r"\bvpn\b", r"ipsec", r"wireguard", r"openvpn"],
    "Cisco": [r"\bcisco\b", r"\bccna\b", r"\bios\b(?! ?/)"],
    "Wi-Fi": [r"wi-?fi", r"\bwlan\b", r"aruba", r"meraki"],
    "Microsoft Azure": [r"\bazure\b", r"\baz-?(104|900|500|305|400)\b", r"entra id", r"azure ad"],
    "Microsoft 365": [r"microsoft 365", r"\bm365\b", r"office 365", r"\bo365\b", r"exchange online", r"sharepoint", r"\bteams\b", r"intune"],
    "Exchange": [r"\bexchange\b"],
    "Intune / MDM": [r"intune", r"\bmdm\b", r"endpoint manager", r"\bsccm\b", r"\bmecm\b"],
    "AWS": [r"\baws\b", r"amazon web services", r"\bec2\b", r"\bs3\b"],
    "GCP": [r"\bgcp\b", r"google cloud"],
    "Cloud Computing": [r"\bcloud\b", r"\biaas\b", r"\bpaas\b", r"\bsaas\b"],
    "Virtualisation": [r"virtualisation", r"virtualization", r"hyperviseur", r"hypervisor"],
    "VMware": [r"vmware", r"vsphere", r"\besxi?\b", r"vcenter"],
    "Hyper-V": [r"hyper-?v\b"],
    "Proxmox": [r"proxmox"],
    "VirtualBox": [r"virtualbox"],
    "Docker": [r"\bdocker\b", r"conteneur", r"container"],
    "Kubernetes": [r"kubernetes", r"\bk8s\b", r"\baks\b", r"\beks\b", r"openshift"],
    "CI/CD": [r"ci ?/ ?cd", r"integration continue", r"deploiement continu", r"gitlab[- ]ci", r"github actions", r"jenkins", r"azure devops", r"pipelines?"],
    "Git": [r"\bgit\b", r"gitlab", r"github"],
    "DevOps": [r"devops", r"devsecops"],
    "Terraform / IaC": [r"terraform", r"infrastructure as code", r"\biac\b", r"bicep", r"pulumi"],
    "Ansible": [r"ansible"],
    "Supervision": [r"supervision", r"monitoring", r"zabbix", r"nagios", r"centreon", r"prometheus", r"grafana", r"prtg"],
    "Sauvegarde": [r"sauvegarde", r"backup", r"veeam", r"\bpra\b", r"\bpca\b"],
    "ITIL": [r"\bitil\b"],
    "GLPI": [r"\bglpi\b"],
    "ITSM / Ticketing": [r"servicenow", r"\bitsm\b", r"ticketing", r"\btickets?\b", r"jira service", r"easyvista"],
    "Support N2": [r"niveau 2", r"\bn2\b", r"support (de )?niveau 2", r"level 2", r"\bl2\b"],
    "Support utilisateurs": [r"support (aux |des )?utilisateurs", r"helpdesk", r"help desk", r"service desk", r"assistance utilisateurs?", r"\bn1\b"],
    "Cybersécurité": [r"cyber ?securite", r"cybersecurity", r"securite (des )?(si|systemes d.information|informatique)", r"\bsoc\b", r"\bsiem\b", r"\bedr\b", r"\bxdr\b"],
    "Audit de sécurité": [r"audit (de )?securite", r"\baudit\b", r"pentest", r"tests? d.intrusion", r"vulnerabilit"],
    "ISO 27001 / Conformité": [r"iso ?27001", r"\brgpd\b", r"\bgdpr\b", r"\banssi\b", r"\bnis ?2\b", r"conformite"],
    "Gestion de projet": [r"gestion de projets?", r"chef de projet", r"project manag", r"\bagile\b", r"\bscrum\b", r"pmo"],
    "SQL": [r"\bsql\b", r"postgres", r"mysql", r"sql server", r"mariadb", r"oracle db"],
    "Data Engineering": [r"data engineer", r"\betl\b", r"\belt\b", r"spark", r"airflow", r"data pipeline", r"databricks", r"snowflake"],
    "Intelligence artificielle": [r"intelligence artificielle", r"machine learning", r"\bia\b", r"\bai\b", r"\bllm\b", r"deep learning"],
    "Anglais": [r"\banglais\b", r"\benglish\b", r"\btoeic\b"],
}

# Domaines métiers ciblés : motifs de titre/description -> domaine
DOMAINS: dict[str, list[str]] = {
    "admin_sys_reseau": [r"administrat\w* (systemes?|reseaux?|sys)", r"admin(istrateur)? sys", r"sysadmin", r"technicien (systemes?|reseaux?|infra)", r"ingenieur (systemes?|reseaux?)"],
    "infrastructure": [r"infrastructure", r"\binfra\b", r"exploitation", r"production informatique", r"datacenter"],
    "cloud": [r"\bcloud\b", r"azure", r"\baws\b", r"\bgcp\b"],
    "devops": [r"devops", r"devsecops", r"\bsre\b", r"site reliability", r"platform engineer"],
    "cyber": [r"cyber", r"securite", r"\bsoc\b", r"pentest", r"\bgrc\b", r"\brssi\b"],
    "support_n2": [r"support", r"helpdesk", r"service desk", r"technicien (de proximite|informatique|support)", r"poste de travail", r"workplace"],
    "m365": [r"microsoft 365", r"\bm365\b", r"office 365", r"modern workplace", r"intune"],
    "projet_it": [r"chef de projet", r"gestion de projet", r"project manager", r"\bpmo\b", r"coordinat"],
    "data_ia": [r"\bdata\b", r"intelligence artificielle", r"machine learning", r"\bia\b", r"\bml\b"],
}

DOMAIN_LABELS = {
    "admin_sys_reseau": "Administration systèmes & réseaux",
    "infrastructure": "Infrastructure IT",
    "cloud": "Cloud Computing",
    "devops": "DevOps / DevSecOps",
    "cyber": "Cybersécurité",
    "support_n2": "Support informatique N2",
    "m365": "Administration Microsoft 365",
    "projet_it": "Gestion de projets IT",
    "data_ia": "Data / IA",
}

# Intitulés alternatifs pour élargir les recherches au-delà des intitulés exacts
SEARCH_KEYWORDS_BY_DOMAIN: dict[str, list[str]] = {
    "admin_sys_reseau": ["administrateur systèmes et réseaux", "administrateur systèmes", "technicien systèmes et réseaux", "ingénieur systèmes", "ingénieur réseaux"],
    "infrastructure": ["technicien infrastructure", "ingénieur infrastructure", "administrateur infrastructure", "technicien d'exploitation"],
    "cloud": ["administrateur cloud", "ingénieur cloud", "cloud azure", "technicien cloud"],
    "devops": ["devops", "ingénieur devops", "devsecops", "sre"],
    "cyber": ["analyste soc", "cybersécurité", "technicien sécurité informatique", "administrateur sécurité"],
    "support_n2": ["technicien support niveau 2", "technicien informatique", "support informatique", "technicien de proximité"],
    "m365": ["administrateur microsoft 365", "administrateur office 365", "modern workplace"],
    "projet_it": ["chef de projet informatique", "assistant chef de projet it", "coordinateur it"],
    "data_ia": ["data engineer", "ingénieur data"],
}

REQUIRED_MARKERS = [
    r"indispensable", r"obligatoire", r"requis", r"exige", r"imperati", r"necessaire", r"maitrise (de|des|du)",
    r"vous maitrisez", r"must have", r"required", r"mandatory", r"vous avez (une|de l.)? ?experience", r"profil recherche",
]
DESIRED_MARKERS = [
    r"souhait", r"apprecie", r"un plus", r"un atout", r"ideal(ement)?", r"serait un", r"bonus", r"nice to have",
    r"would be a plus", r"preferred", r"connaissance(s)? (de|en)", r"notions?",
]


def normalize(text: str | None) -> str:
    if not text:
        return ""
    t = unicodedata.normalize("NFKD", text)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", t.lower()).strip()


@lru_cache
def _compiled() -> dict[str, list[re.Pattern[str]]]:
    return {k: [re.compile(p) for p in v] for k, v in SKILLS.items()}


@lru_cache
def _compiled_domains() -> dict[str, list[re.Pattern[str]]]:
    return {k: [re.compile(p) for p in v] for k, v in DOMAINS.items()}


def extract_skills(text: str) -> list[str]:
    n = normalize(text)
    return [k for k, pats in _compiled().items() if any(p.search(n) for p in pats)]


GENERIC_SKILLS = {"Réseaux TCP/IP", "Cloud Computing", "Cybersécurité", "Support utilisateurs", "DevOps", "Virtualisation",
                  "Gestion de projet", "Git", "Anglais", "Intelligence artificielle"}


def canonical_skill(name: str) -> str | None:
    """Ramène un libellé libre (ex : 'Win Server 2022') vers la compétence canonique la plus spécifique."""
    n = normalize(name)
    exact = next((k for k in SKILLS if normalize(k) == n), None)
    if exact:
        return exact
    found = [k for k, pats in _compiled().items() if any(p.search(n) for p in pats)]
    specific = [k for k in found if k not in GENERIC_SKILLS]
    return (specific or found or [None])[0]


def split_required_desired(text: str) -> tuple[list[str], list[str]]:
    """Classe les compétences détectées en indispensables / souhaitées selon le contexte.

    - une ligne/phrase portant un marqueur « souhaité » -> souhaitée ; « requis » -> indispensable ;
    - une ligne d'en-tête (« Compétences indispensables : ») donne son mode aux lignes suivantes
      jusqu'à une ligne vide ou un nouvel en-tête ;
    - sans marqueur : indispensable si citée au moins 2 fois, souhaitée sinon.
    """
    n = normalize_keep_lines(text)
    req: set[str] = set()
    des: set[str] = set()
    req_re = re.compile("|".join(REQUIRED_MARKERS))
    des_re = re.compile("|".join(DESIRED_MARKERS))
    counts: dict[str, int] = {}
    mode: str | None = None
    for line in n.split("\n"):
        if not line.strip():
            mode = None
            continue
        for chunk in re.split(r"(?<=[a-z0-9\)])\.\s+|;|•|^\s*[-*]\s+", line):
            if not chunk or not chunk.strip():
                continue
            found = [k for k, pats in _compiled().items() if any(p.search(chunk) for p in pats)]
            head = chunk.split(":", 1)[0] if ":" in chunk else chunk
            local = "des" if des_re.search(head) else "req" if req_re.search(head) else None
            if ":" in chunk and local:
                mode = local
            elif ":" in chunk and not local and not found:
                mode = None
            for k in found:
                counts[k] = counts.get(k, 0) + 1
            if not found:
                continue
            eff = local or mode
            if eff == "des" or (eff is None and des_re.search(chunk)):
                des.update(found)
            elif eff == "req" or req_re.search(chunk):
                req.update(found)
    for k, c in counts.items():
        if k not in req and k not in des:
            (req if c >= 2 else des).add(k)
    des -= req
    return sorted(req), sorted(des)


def normalize_keep_lines(text: str | None) -> str:
    return "\n".join(normalize(line) for line in (text or "").splitlines())


def detect_domains(text: str) -> list[str]:
    n = normalize(text)
    return [d for d, pats in _compiled_domains().items() if any(p.search(n) for p in pats)]
