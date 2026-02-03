# SADA
**System Assistant for Absences**

Attendance analysis platform that compares employee schedules with entrance and exit timestamps to generate detailed absence and punctuality reports.

---

## 🎯 Purpose

SADA is designed to centralize and simplify attendance analysis. It replaces manual spreadsheet reviews with a structured system that detects inconsistencies between scheduled working hours and real entrance/exit timestamps.

The platform focuses on reliability, auditability, and scalability from its very first phase.

---

## 🚀 Project Roadmap

### Phase I — Excel-Based Processing (MVP)

The initial phase focuses on correctness and traceability using Excel files as the primary data source.

**Features:**
- Import employee schedules from Excel
- Import entrance and exit timestamps from Excel
- Store schedules and timestamps in a database
- Process attendance data via a comparison engine
- Generate per-employee reports including:
  - Late arrivals
  - Early departures
  - Missing entrance with recorded exit
  - Recorded entrance with missing exit

---

### Phase II — Reduced Excel Dependency

This phase improves usability and prepares the system for daily operational use.

**Features:**
- Web-based weekly schedule editor
- Create, edit, and deactivate schedules
- Create, edit, and deactivate employees
- Preserve historical schedule data
- Continue supporting Excel imports for timestamps

---

### Phase III — Automation & Insights

The final phase transforms SADA into an active assistant for administrators.

**Features:**
- Automatic schedule creation without collisions
- Automatic schedule assignment to employees
- API integration with external timestamp generators
- Daily email alerts highlighting critical attendance issues
- Interactive dashboard with metrics and trends

---

## 🧠 Core Concepts

- **Raw vs Processed Data**  
  Original timestamps are always preserved. Attendance results are derived data and can be recalculated if rules change.

- **Auditability**  
  All imports, processing actions, and changes are traceable.

- **Configurability**  
  Attendance rules such as grace periods, valid time windows, and overnight shifts are configurable.

- **Scalable Architecture**  
  Each phase builds upon the previous one without requiring rework.

---

## 👥 Intended Users

- **Administrators / HR:** Review reports, receive alerts, analyze trends
- **Operators:** Manage employees and schedules
- *(Future)* Supervisors or department managers

---

## 📈 Vision

SADA starts as a structured attendance reporting tool and evolves into a proactive system that helps organizations detect, understand, and prevent attendance issues through automation and insight.
