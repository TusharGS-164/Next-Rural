# backend/data/seed.py
"""
Run once to populate the database with sample data:
  python -m data.seed
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, engine, Base
from models.db_models import Career, Opportunity

Base.metadata.create_all(bind=engine)

CAREERS = [
    {
        "title": "Electrician / Wireman",
        "category": "trade",
        "education_min": "8th",
        "duration": "1–2 Years (ITI)",
        "salary_range": "₹15K–30K/mo",
        "description": "High-demand trade with excellent local job prospects. ITI certification opens doors to construction, factories, and self-employment.",
        "skills": "ITI Certificate,NCVT,Apprenticeship,Wiring,Safety",
        "match_interests": "trade,tech",
    },
    {
        "title": "ANM / Community Health Worker",
        "category": "health",
        "education_min": "10th",
        "duration": "2 Years",
        "salary_range": "₹18K–28K/mo",
        "description": "Critical healthcare role in rural areas. Government-funded training with postings in primary health centres.",
        "skills": "GNM Diploma,PHC Posting,First Aid,Nursing",
        "match_interests": "health",
    },
    {
        "title": "Agri-Entrepreneur / FPO Leader",
        "category": "agri",
        "education_min": "8th",
        "duration": "6 Months (KVK Training)",
        "salary_range": "₹20K–60K/mo",
        "description": "Lead farmer producer organisations, access PM-KISAN and NABARD schemes, and build a sustainable agribusiness.",
        "skills": "FPO Training,NABARD Loan,Agri-Tech,Market Linkage",
        "match_interests": "agri",
    },
    {
        "title": "Computer Operator / DTP",
        "category": "tech",
        "education_min": "10th",
        "duration": "3–6 Months (NIELIT)",
        "salary_range": "₹12K–22K/mo",
        "description": "Essential digital skills for small businesses, government offices, and schools. Short course with immediate employment.",
        "skills": "NIELIT O Level,MS Office,DTP,CSC VLE",
        "match_interests": "tech",
    },
    {
        "title": "Police Constable / KSP",
        "category": "govt",
        "education_min": "12th",
        "duration": "1 Year (Training after selection)",
        "salary_range": "₹25K–40K/mo",
        "description": "Stable government job with pension. Physical fitness and written exam required. High demand in rural Karnataka.",
        "skills": "KSP Written Exam,Physical Test,Kannada,Discipline",
        "match_interests": "govt",
    },
    {
        "title": "Welder / Fabricator",
        "category": "trade",
        "education_min": "8th",
        "duration": "1 Year (ITI)",
        "salary_range": "₹12K–25K/mo",
        "description": "Welding is one of the most in-demand ITI trades. Local industries, construction, and fabrication shops hire immediately.",
        "skills": "ITI Certificate,Arc Welding,Gas Welding,MIG/TIG",
        "match_interests": "trade",
    },
]

OPPORTUNITIES = [
    {
        "name": "Government ITI Dharwad",
        "type": "iti",
        "district": "Dharwad",
        "address": "Station Road, Dharwad - 580001",
        "phone": "0836-2447123",
        "description": "Electrician, Fitter, Welder, COPA trades. 2-year NCVT certified programs. Hostel available for outstation students.",
        "benefit": "Govt subsidised fees + NCVT certification",
        "apply_url": "https://itti.kar.nic.in",
        "career_tags": "trade,tech",
    },
    {
        "name": "PMKVY 4.0 — Skill India",
        "type": "scheme",
        "district": "All Districts",
        "address": "District Skill Development Centre",
        "phone": "1800-123-9626",
        "description": "Free certified skill training across 300+ trades. RPL (Recognition of Prior Learning) for informal workers.",
        "benefit": "Free training + ₹8,000 cash stipend on certification",
        "apply_url": "https://pmkvyofficial.org",
        "career_tags": "trade,tech,health,agri",
    },
    {
        "name": "NAPS — National Apprenticeship",
        "type": "apprenticeship",
        "district": "Hubli",
        "address": "DGET Office, Hubli",
        "phone": "0836-2362015",
        "description": "Earn while learning. Government pays 25% of stipend. 40+ companies hiring in Dharwad, Hubli, Gadag.",
        "benefit": "₹6,000/month + NCVT certificate after 1 year",
        "apply_url": "https://apprenticeshipindia.org",
        "career_tags": "trade,tech",
    },
    {
        "name": "ANM Training Centre — Hubli",
        "type": "iti",
        "district": "Hubli",
        "address": "KIMS Campus, Hubli - 580022",
        "phone": "0836-2370444",
        "description": "2-year government-funded nursing aide program. Guaranteed posting in PHC after completion.",
        "benefit": "100% job placement + ₹5,000/month stipend during training",
        "apply_url": "https://dme.kar.nic.in",
        "career_tags": "health",
    },
    {
        "name": "KVK Gadag — Agri Training",
        "type": "iti",
        "district": "Gadag",
        "address": "University of Agricultural Sciences, Gadag",
        "phone": "08372-220221",
        "description": "Free farm entrepreneurship, FPO formation, organic farming, and agri-marketing training.",
        "benefit": "Free residential training + seed kit + NABARD linkage",
        "apply_url": "https://kvkgadag.in",
        "career_tags": "agri",
    },
    {
        "name": "Karnataka Skill Connect — SC/ST Youth",
        "type": "scheme",
        "district": "All Districts",
        "address": "Dist. Social Welfare Office",
        "phone": "080-22259024",
        "description": "State-sponsored ITI enrolment with hostel support for SC/ST youth from Tier 3 districts.",
        "benefit": "Free ITI + hostel + ₹3,000/month stipend",
        "apply_url": "https://swd.kar.nic.in",
        "career_tags": "trade,tech,health",
    },
]

def seed():
    db = SessionLocal()
    try:
        # Only seed if tables are empty
        if db.query(Career).count() == 0:
            for c in CAREERS:
                db.add(Career(**c))
            print(f"✓ Seeded {len(CAREERS)} careers")
        else:
            print("Careers table already has data, skipping.")

        if db.query(Opportunity).count() == 0:
            for o in OPPORTUNITIES:
                db.add(Opportunity(**o))
            print(f"✓ Seeded {len(OPPORTUNITIES)} opportunities")
        else:
            print("Opportunities table already has data, skipping.")

        db.commit()
        print("✓ Seed complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
