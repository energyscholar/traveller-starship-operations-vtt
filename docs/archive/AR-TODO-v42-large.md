# AR TODOs from V42 - Large Systems (Processed 2025-12-11)

## AR-77: Character Creation & Maintenance System
**Priority:** LOW (deferred)
**Source:** prompts_for_todos_V42.txt line 6
**Risk:** HIGH - Large scope

### Phases
| Phase | Description | Scope |
|-------|-------------|-------|
| 77.1 | Character data schema design | 2hr |
| 77.2 | Character CRUD API | 4hr |
| 77.3 | Character creation wizard UI | 6hr |
| 77.4 | Traveller career path generation | 8hr |
| 77.5 | Character sheet display | 4hr |
| 77.6 | Integration with crew slots | 2hr |

**Total:** ~26hr

---

## AR-78: Security/Marines System
**Priority:** LOW (deferred)
**Source:** prompts_for_todos_V42.txt lines 27-33
**Risk:** MEDIUM

### Phases
| Phase | Description | Scope |
|-------|-------------|-------|
| 78.1 | Marine detachment data structure | 2hr |
| 78.2 | Marine NPC stats/personality | 4hr |
| 78.3 | Security patrol/boarding prep UI | 3hr |
| 78.4 | Boarding action combat rules | 8hr |
| 78.5 | Casualty tracking system | 3hr |
| 78.6 | Integration with High Guard rules | 4hr |

**Total:** ~24hr

---

## AR-79: Medical System
**Priority:** LOW (deferred)
**Source:** prompts_for_todos_V42.txt line 35
**Risk:** MEDIUM

### Phases
| Phase | Description | Scope |
|-------|-------------|-------|
| 79.1 | Medical bay data structure | 2hr |
| 79.2 | Wound/illness tracking | 3hr |
| 79.3 | Emergency medical UI | 4hr |
| 79.4 | Long-term recovery mechanics | 3hr |
| 79.5 | Ship physician NPC role | 2hr |
| 79.6 | Integration with combat damage | 4hr |

**Total:** ~18hr

---

## AR-80: Email/Communications System
**Priority:** LOW (deferred)
**Source:** prompts_for_todos_V42.txt lines 41-43
**Risk:** HIGH - Complex scope

### Phases
| Phase | Description | Scope |
|-------|-------------|-------|
| 80.1 | Email schema (inbox, sent, archive) | 2hr |
| 80.2 | Contact list system (PC, NPC, Ship) | 3hr |
| 80.3 | Email CRUD API | 3hr |
| 80.4 | Email UI (simplified client) | 6hr |
| 80.5 | Multi-week delivery delay mechanics | 2hr |
| 80.6 | AI NPC email responses (API) | 8hr |
| 80.7 | Search and filtering | 3hr |

**Total:** ~27hr

---

## AR-81: Time Tracking & Callbacks System
**Priority:** MEDIUM (enables other features)
**Source:** prompts_for_todos_V42.txt line 59
**Risk:** MEDIUM

### Phases
| Phase | Description | Scope |
|-------|-------------|-------|
| 81.1 | Time event registry design | 2hr |
| 81.2 | Register/unregister callbacks API | 2hr |
| 81.3 | Time advance triggers callbacks | 3hr |
| 81.4 | Integrate fuel consumption | 1hr |
| 81.5 | Integrate jump space transit | 1hr |
| 81.6 | Integrate repairs over time | 2hr |
| 81.7 | Integrate fuel processing | 1hr |

**Total:** ~12hr

---

## AR-82: Combat Stations Black Screen Bug
**Priority:** LOW (deferred)
**Source:** prompts_for_todos_V42.txt line 85-86
**Risk:** LOW - Investigation

**Symptoms:**
- Click Combat Stations → black screen
- Requires reload
- May be unfinished component

**Investigation:**
1. Reproduce bug
2. Check console errors
3. Trace combat mode transition code
4. Fix or stub component

**Scope:** 2-4hr

---

## Summary

| AR | Title | Priority | Total Scope |
|----|-------|----------|-------------|
| AR-77 | Character System | LOW | 26hr |
| AR-78 | Security/Marines | LOW | 24hr |
| AR-79 | Medical System | LOW | 18hr |
| AR-80 | Email System | LOW | 27hr |
| AR-81 | Time Callbacks | **MED** | 12hr |
| AR-82 | Combat Bug | LOW | 4hr |

**Grand Total:** ~111hr of deferred work

---

## Execution Notes

- **AR-81 (Time Callbacks)** should be done before AR-77-80 as they depend on it
- **AR-82** is quick investigation, can be done anytime
- **AR-77-80** are large standalone systems, do after core journey features complete
