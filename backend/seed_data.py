"""Canonical platform data — seeded into MySQL at startup and used to initialize the
live simulation, so the database records and the live metrics describe the same world.
Instance types are real AWS Graviton families (see docs/pricing.html)."""

USERS = [
    {"username": "admin",   "name": "Anshuman Atrey",  "email": "admin@gamecloud.gg",   "role": "admin"},
    {"username": "manager", "name": "Ops Manager",     "email": "manager@gamecloud.gg", "role": "manager"},
    {"username": "ops",     "name": "NOC Operator",    "email": "ops@gamecloud.gg",     "role": "ops"},
]

# code, display name, edge city, baseline peak CCU
REGIONS = [
    {"code": "us-east-1",      "name": "US East (N. Virginia)",     "city": "Ashburn",   "base_ccu": 42000},
    {"code": "eu-west-1",      "name": "EU West (Ireland)",         "city": "Dublin",    "base_ccu": 31000},
    {"code": "ap-south-1",     "name": "Asia Pacific (Mumbai)",     "city": "Mumbai",    "base_ccu": 38000},
    {"code": "ap-southeast-1", "name": "Asia Pacific (Singapore)",  "city": "Singapore", "base_ccu": 24000},
    {"code": "sa-east-1",      "name": "South America (São Paulo)", "city": "São Paulo", "base_ccu": 16000},
]

# id, region, fleet name, instance type, CCU capacity
FLEETS = [
    {"id": "flt-use1-br",  "region": "us-east-1",      "name": "battle-royale-prod",   "instance": "c6g.4xlarge",  "max_cap": 30000},
    {"id": "flt-use1-tdm", "region": "us-east-1",      "name": "team-deathmatch-prod", "instance": "c6gn.2xlarge", "max_cap": 18000},
    {"id": "flt-euw1-br",  "region": "eu-west-1",      "name": "battle-royale-prod",   "instance": "c6g.4xlarge",  "max_cap": 22000},
    {"id": "flt-euw1-rk",  "region": "eu-west-1",      "name": "ranked-ladder-prod",   "instance": "c6g.2xlarge",  "max_cap": 12000},
    {"id": "flt-aps1-br",  "region": "ap-south-1",     "name": "battle-royale-prod",   "instance": "c6g.4xlarge",  "max_cap": 26000},
    {"id": "flt-aps1-cas", "region": "ap-south-1",     "name": "casual-prod",          "instance": "c6g.2xlarge",  "max_cap": 14000},
    {"id": "flt-apse1-br", "region": "ap-southeast-1", "name": "battle-royale-prod",   "instance": "c6g.2xlarge",  "max_cap": 16000},
    {"id": "flt-apse1-rk", "region": "ap-southeast-1", "name": "ranked-ladder-prod",   "instance": "c6g.xlarge",   "max_cap": 9000},
    {"id": "flt-sae1-br",  "region": "sa-east-1",      "name": "battle-royale-prod",   "instance": "c6g.2xlarge",  "max_cap": 11000},
    {"id": "flt-sae1-cas", "region": "sa-east-1",      "name": "casual-prod",          "instance": "c6g.xlarge",   "max_cap": 6000},
]

# pre-seeded approval chains so the Workflows page is populated on first load
SEED_WORKFLOWS = [
    {"type": "region_expansion", "title": "Provision new region: me-central-1 (UAE)",
     "detail": "Expand to Middle East for the MENA esports league; est. 18k peak CCU.",
     "requested_by": "manager", "status": "pending", "amount": 42000, "region_code": "me-central-1"},
    {"type": "fleet_provision", "title": "Add battle-royale fleet in ap-south-1",
     "detail": "Mumbai peak sustained at 86% capacity; add one c6g.4xlarge fleet.",
     "requested_by": "ops", "status": "pending", "amount": 9800, "region_code": "ap-south-1"},
    {"type": "maintenance", "title": "Rolling MySQL minor-version upgrade (RDS Multi-AZ)",
     "detail": "8.0.35 → 8.0.39 across primary + standby, off-peak window 02:00–04:00 UTC.",
     "requested_by": "ops", "status": "pending", "amount": None, "region_code": None},
    {"type": "tournament", "title": "Reserve burst capacity: Summer Invitational finals",
     "detail": "Burst +40k CCU for 6h across us-east-1 + eu-west-1.",
     "requested_by": "manager", "status": "approved", "approver": "admin", "amount": 15000, "region_code": "us-east-1"},
    {"type": "refund", "title": "Bulk goodwill credit: matchmaking outage 06/12",
     "detail": "2,140 affected players, in-game currency credit.",
     "requested_by": "ops", "status": "rejected", "approver": "manager", "amount": 3200, "region_code": None},
]

SEED_ALERTS = [
    {"severity": "warning",  "source": "ap-south-1",          "message": "Mumbai fleet capacity at 86% — auto-scale armed",          "status": "active"},
    {"severity": "critical", "source": "matchmaking",         "message": "FlexMatch P99 ticket time > 45s in sa-east-1",             "status": "ack"},
    {"severity": "info",     "source": "battle-royale-prod",  "message": "Fleet scaled 3 → 4 instances in us-east-1",                "status": "resolved"},
]
