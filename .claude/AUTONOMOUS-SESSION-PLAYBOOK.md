# Autonomous Session Playbook - Standard Practice

**Created:** 2025-11-13
**Status:** STANDING ORDERS
**Authority:** Project owner directive
**Scope:** ALL future autonomous sessions

---

## 🎯 CORE PRINCIPLE

**Always maximize safe work per autonomous session by pulling forward dependency-free features from future stages.**

Each autonomous session should:
1. Complete requested work
2. Sweep future stages for pullable work
3. Build comprehensive test coverage
4. Hunt for edge cases and automation opportunities
5. Continue to point of diminishing returns

---

## 📋 MANDATORY PRE-SESSION SWEEP

### Step 1: Future Stage Analysis (30-60 min)

**For each future stage/phase:**

```
[ ] Read stage plan document
[ ] Identify all features/components
[ ] Extract safe, dependency-free candidates
[ ] Categorize by type (data, pure functions, schemas, tests)
[ ] Estimate time and value
[ ] Add to autonomous session plan
```

**Safe Work Categories:**

#### ✅ ALWAYS SAFE (Pull Forward Aggressively)
- **Reference Data Extraction**
  - Tables from rulebooks
  - Official specifications
  - Constants and formulas
  - No interpretation needed

- **Data Structures & Schemas**
  - JSON schemas
  - Type definitions
  - Data models
  - Export/import formats

- **Pure Functions**
  - Input → Output (no side effects)
  - Formatters and transformers
  - Calculators and validators
  - Comparison utilities

- **Validation Modules**
  - Extends existing patterns (lib/ship-*.js)
  - Rule verification
  - Input sanitization
  - Constraint checking

- **Test Infrastructure**
  - Unit tests
  - Integration tests
  - Test utilities
  - Mock data generators

- **Documentation**
  - API documentation
  - Developer guides
  - Reference materials
  - Edge case catalogs

#### ⚠️ EVALUATE CAREFULLY (Needs Risk Assessment)
- **Utilities with Limited Dependencies**
  - Helper functions
  - String/number utilities
  - Date/time helpers
  - Format converters

- **Configuration Structures**
  - Config schemas
  - Default values
  - Option definitions
  - Setting validators

#### ❌ NEVER PULL FORWARD (Has Dependencies)
- **UI Components** (requires user feedback)
- **Integration Code** (requires other incomplete systems)
- **Business Logic** (requirements may change)
- **API Implementations** (endpoints not finalized)
- **Database Schemas** (data model evolving)
- **Server Routes** (routing not stable)

---

### Step 2: Risk Assessment Matrix

**For each candidate feature:**

| Criteria | Score | Weight |
|----------|-------|--------|
| Has zero dependencies? | 0-10 | 3× |
| Based on stable spec? | 0-10 | 3× |
| Pure data/function? | 0-10 | 2× |
| Easy to test? | 0-10 | 2× |
| Won't change? | 0-10 | 3× |
| Time investment? | 0-10 | 1× |

**Weighted Score ≥ 80:** SAFE - Pull forward
**Weighted Score 60-79:** EVALUATE - Assess carefully
**Weighted Score < 60:** DEFER - Don't pull forward

**Example:**
```
Feature: JSON Export Schema (Stage 14)
- Zero dependencies: 10 × 3 = 30
- Stable spec: 10 × 3 = 30 (based on V2 templates)
- Pure data: 10 × 2 = 20
- Easy to test: 10 × 2 = 20
- Won't change: 9 × 3 = 27
- Time: 2h = 9 × 1 = 9
TOTAL: 136/140 = 97% → SAFE ✅
```

---

### Step 3: Test Coverage Expansion (Mandatory)

**Every autonomous session MUST include:**

#### A. Unit Tests for New Code
- [ ] Every new function has ≥3 test cases
- [ ] Edge cases covered (null, empty, invalid)
- [ ] Boundary conditions tested
- [ ] Error paths verified

#### B. Integration Tests
- [ ] Component interactions tested
- [ ] Data flow end-to-end verified
- [ ] Real file/API operations tested
- [ ] Cross-module integration verified

#### C. Test Infrastructure
- [ ] Mock data generators created/expanded
- [ ] Test utilities added
- [ ] Assertions library enhanced
- [ ] Test coverage measurement

**Target:** Add 30-50 new tests per autonomous session

**Rationale:** Tests are ALWAYS safe, high value, never wasted effort.

---

### Step 4: Edge Case Hunting (Mandatory)

**Every autonomous session MUST include edge case sweep:**

```
[ ] Null/undefined inputs
[ ] Empty arrays/objects
[ ] Type mismatches (string numbers, etc.)
[ ] Boundary values (0, -1, MAX_INT)
[ ] Invalid data structures
[ ] Network failures (if applicable)
[ ] File system errors (if applicable)
[ ] Race conditions (if async)
[ ] Unicode/special characters
[ ] Large datasets (performance)
[ ] Malicious inputs (security)
```

**For each edge case found:**
1. Document in `.claude/EDGE-CASES-*.md`
2. Add defensive code (try/catch, null checks, validation)
3. Write test case
4. Verify no regression

**Deliverable:** Edge case report with mitigation status

---

### Step 5: Automation Opportunities (Sweep)

**During autonomous sessions, look for:**

- [ ] Repetitive manual testing → automate
- [ ] Manual validation steps → script
- [ ] Code generation opportunities
- [ ] Build/deploy automation
- [ ] Data transformation pipelines
- [ ] Report generation automation

**Document in:** `.claude/AUTOMATION-OPPORTUNITIES.md`

**Implement:** Only if safe and well-scoped

---

## 🏗️ AUTONOMOUS SESSION STRUCTURE

### Phase 1: Requested Work (40% of time)
- Complete explicitly requested features
- Fix reported bugs
- Implement specified improvements

### Phase 2: Pulled-Forward Work (30% of time)
- Safe features from future stages
- Reference data extraction
- Pure functions and utilities
- Data structures and schemas

### Phase 3: Test & Quality (20% of time)
- Unit test expansion
- Integration test creation
- Edge case coverage
- Defensive coding improvements

### Phase 4: Planning & Documentation (10% of time)
- Edge case documentation
- Automation opportunity sweep
- Refactoring planning
- Next session preparation

---

## 📊 DIMINISHING RETURNS THRESHOLD

**Continue expansion until ANY of:**

1. **Time Limit:** Approaching max autonomous session duration (25h)
2. **Complexity Wall:** Next feature requires significant new patterns
3. **Dependency Block:** All remaining features have dependencies
4. **Test Saturation:** Coverage >90% on relevant modules
5. **Risk Increase:** Only medium-risk features remain
6. **Low Value:** Remaining features <2h time-save in future

**When threshold hit:** Stop expansion, proceed with current plan

---

## ✅ SESSION COMPLETION CHECKLIST

**Every autonomous session MUST deliver:**

- [ ] All requested work completed
- [ ] Pulled-forward work completed (if any)
- [ ] 30-50 new tests added
- [ ] All existing tests passing (zero regressions)
- [ ] Edge case report created/updated
- [ ] Automation opportunities documented
- [ ] Code coverage measured (report %)
- [ ] Completion report written
- [ ] Git commits (atomic, well-described)
- [ ] Next session recommendations

---

## 📝 STANDARD DELIVERABLES

**Every autonomous session produces:**

### Code Artifacts
- New features (requested + pulled-forward)
- Test files (unit + integration)
- Validation modules
- Pure functions/utilities
- Data structures/schemas

### Documentation
- `.claude/AUTONOMOUS-SESSION-{N}-COMPLETION-REPORT.md`
- `.claude/EDGE-CASES-{TOPIC}.md` (updated)
- `.claude/AUTOMATION-OPPORTUNITIES.md` (updated)
- `.claude/{NEW-FEATURE}-REFERENCE.md` (as needed)

### Quality Metrics
- Tests added: {count}
- Tests passing: {count}/{total}
- Code coverage: {percentage}%
- Features completed: {requested} + {pulled-forward}
- Time saved (future): {hours}h

---

## 🎯 EXPECTED OUTCOMES

**With this playbook, each autonomous session should:**

1. **Multiply Force:** 2-3× effective work (requested + future)
2. **Reduce Risk:** Comprehensive testing catches regressions
3. **Improve Quality:** Edge cases covered, defensive code added
4. **Accelerate Velocity:** Future work already done when UI ready
5. **Build Confidence:** High test coverage enables bold changes

**Long-term Effect:**
- Faster feature delivery (foundation built ahead)
- Fewer bugs (comprehensive testing)
- Less technical debt (planning ahead)
- Better architecture (pure functions, clear modules)

---

## 🔄 CONTINUOUS IMPROVEMENT

**This playbook itself should evolve:**

- [ ] Track which types of pulled-forward work succeed
- [ ] Measure time-save accuracy (predicted vs actual)
- [ ] Refine risk assessment criteria
- [ ] Improve diminishing returns detection
- [ ] Share learnings in completion reports

**Update playbook:** After every 3-5 autonomous sessions

---

## 📌 EXAMPLES

### Example 1: Small Craft Templates Session

**Requested Work:** Add Pinnace, Gig, Tlatl (3 templates)

**Sweep Future Stages:**
- Stage 12: Detail formatters (pure functions) → PULL ✅
- Stage 14: JSON export schemas → PULL ✅
- Stage 12: Complete weapon validation → PULL ✅
- Stage 16: Fleet battles → DEFER (dependencies) ❌

**Test Expansion:**
- 20 tests for small craft validation
- 15 tests for formatters
- 10 tests for schemas
- Total: 45 new tests

**Edge Cases:**
- Small craft with no weapons
- Small craft with oversized drives
- Missing required fields

**Result:** 3 requested templates + 3 future features + 45 tests + edge case coverage

---

### Example 2: Rules Verification Session

**Requested Work:** Verify initiative and combat rules

**Sweep Future Stages:**
- Stage 13: Refactoring plan → PULL (doc only) ✅
- Stage 14: Battle state export schema → PULL ✅
- Stage 15: Health check endpoints → DEFER (server changes) ❌

**Test Expansion:**
- 25 tests for initiative edge cases
- 20 tests for combat resolution
- 15 integration tests for full combat flow
- Total: 60 new tests

**Edge Cases:**
- Initiative ties with >2 ships
- Negative skill modifiers
- Zero-thrust ships
- Ships destroyed mid-turn

**Automation:**
- Script to validate all ship templates
- Automated rule cross-reference checker

**Result:** Rules verified + schemas ready + 60 tests + automation tools

---

## 🚀 ACTIVATION

**This playbook is NOW ACTIVE.**

**All future autonomous sessions will:**
1. Follow this structure
2. Sweep future stages
3. Pull forward safe work
4. Expand test coverage
5. Hunt edge cases
6. Seek automation
7. Document thoroughly

**No further reminder needed - this is standard practice.**

---

**Last Updated:** 2025-11-13
**Next Review:** After 3-5 autonomous sessions
**Owner:** Project lead (Bruce)
**Executor:** Claude (all autonomous sessions)

---

## 📚 REFERENCE

**Related Documents:**
- `.claude/AUTONOMOUS-SESSION-3-EXPANDED-PLAN.md` (example implementation)
- `.claude/STAGE-*-PLAN.md` (source of future work)
- `.claude/*-COMPLETION-REPORT.md` (historical outcomes)

**Key Principles:**
- **Safe over fast** - Never pull risky work
- **Test over features** - Testing is never wasted
- **Document over guess** - Edge cases must be written
- **Plan over improvise** - Automation opportunities documented
- **Quality over quantity** - Diminishing returns is real

---

**This is the way forward. Execute accordingly.**

---

## 🔧 ROUTINE MAINTENANCE (MANDATORY)

**Added:** 2025-11-13
**Authority:** Project owner directive
**Scope:** Every autonomous session

### Standing Orders for All Autonomous Sessions

**During EVERY autonomous session, allocate time for:**

#### 1. Documentation Maintenance (15-30 min)

```
[ ] Update README.md with new features/changes
[ ] Update API documentation
[ ] Refresh getting-started guides
[ ] Update architecture diagrams
[ ] Fix outdated examples
[ ] Add missing docstrings/comments
```

**Rationale:** Documentation drift is inevitable. Keep it current while context is fresh.

**Time Investment:** Don't spend hours. Quick passes only. Mark `TODO: Expand` if deeper work needed.

---

#### 2. Best Practice Pass (20-40 min)

```
[ ] Scan for best practice violations
[ ] Fix naming inconsistencies
[ ] Extract magic numbers to constants
[ ] Remove code duplication (DRY principle)
[ ] Add missing error handling
[ ] Improve function signatures
[ ] Add type hints/JSDoc
```

**Only fix if LOW RISK:**
- ✅ Renaming variables (if tests pass)
- ✅ Extracting constants
- ✅ Adding comments/docs
- ✅ Simple refactoring with test coverage
- ❌ Architectural changes (requires user approval)
- ❌ Breaking API changes (defer to user)

**Validation:** Run full test suite after each change. Revert if ANY test fails.

---

#### 3. Lint and Code Quality (10-20 min)

```
[ ] Run linter (npm run lint / flake8 / etc.)
[ ] Fix all auto-fixable warnings
[ ] Manually fix trivial warnings
[ ] Document remaining warnings (if intentional)
[ ] Run code formatter (prettier / black)
[ ] Check for unused imports
[ ] Remove console.log / debug statements
```

**Goal:** Zero lint warnings for new code, reduce warnings for existing code.

**Exception:** If lint warnings are intentional/unavoidable, add `// eslint-disable` with comment explaining why.

---

#### 4. Crust Reduction (15-30 min)

**"Crust" = Technical debt, cruft, accumulated mess**

```
[ ] Delete commented-out code
[ ] Remove unused functions
[ ] Clean up dead imports
[ ] Consolidate duplicate logic
[ ] Simplify overly complex functions
[ ] Remove temporary debug code
[ ] Delete obsolete TODO comments (if done)
[ ] Archive old/unused files
```

**Rationale:** Crust accumulates fast. Small regular cleanups prevent major refactoring debt.

**Safe Deletions:**
- ✅ Commented code (can recover from git)
- ✅ Unused functions (if tests confirm unused)
- ✅ Debug logs/prints
- ✅ Old experiment files
- ❌ Anything user might want (ask first)

---

#### 5. Refactoring Opportunities (Document, Don't Execute)

```
[ ] Identify refactoring needs
[ ] Document in .claude/REFACTORING-OPPORTUNITIES.md
[ ] Estimate complexity and risk
[ ] Prioritize by value/risk ratio
[ ] Flag for user review
```

**DO NOT perform risky refactoring autonomously.**

**Examples of SAFE refactoring (OK to do):**
- Extract pure function from complex function
- Rename variables for clarity (with tests)
- Consolidate duplicate code (with tests)
- Add helper utilities

**Examples of RISKY refactoring (DOCUMENT ONLY):**
- Change data structures
- Modify APIs
- Restructure modules
- Change architecture patterns

---

#### 6. CTO Mentoring Analysis (During AB Sessions)

```
[ ] Review recent work through CTO lens
[ ] Identify technical decisions made
[ ] Evaluate architectural choices
[ ] Document learning opportunities
[ ] Create mentorship insights
[ ] Update .claude/CTO-MENTORING-*.md
```

**Purpose:** Continuous technical leadership development through code review analysis.

**Deliverable:** Brief CTO mentoring note (5-10 min writing, not deep analysis).

---

### Time Allocation for Routine Maintenance

**Total Time:** 1.5-2.5 hours per autonomous session

**Breakdown:**
- Documentation: 15-30 min
- Best practices: 20-40 min
- Lint/quality: 10-20 min
- Crust reduction: 15-30 min
- Refactoring doc: 15-30 min
- CTO analysis: 15-30 min

**Philosophy:** "While I'm here, might as well clean up."

**User Benefit:** User doesn't care if AB session is 10h or 12h. Use extra time for quality improvements.

---

## ⚠️ RISK MANAGEMENT DURING SESSIONS

### Immediate Risk Deferral Protocol

**If at ANY point you detect unacceptable risk:**

```
1. STOP work on risky item immediately
2. Document why it's risky
3. Add to deferred items list
4. Remove from current AB session plan
5. Continue with other safe work
6. Report deferral in completion report
```

**DO NOT:**
- ❌ Try to "push through" risky work
- ❌ Spend hours trying to de-risk
- ❌ Make risky assumptions to proceed
- ❌ Skip testing to make it work

**DO:**
- ✅ Document the risk clearly
- ✅ Estimate what's needed to de-risk
- ✅ Flag for user decision
- ✅ Move to next safe item

**Example Deferral Note:**
```markdown
## DEFERRED: Small Craft Template Creation

**Reason:** Validation failures indicate online sources conflict with Mongoose 2E rules. Thrust TL requirements, turret types, and armor types don't match validation modules.

**Risk:** Creating templates from unreliable sources will propagate invalid data.

**De-Risk Requirements:**
- Official Mongoose Small Craft Catalogue PDF
- Or: User approval of specific online source
- Or: Manual verification against High Guard 2022 rulebook

**Estimated Time if De-Risked:** 2-3 hours for 3 small craft

**Priority:** Medium (nice to have, not blocking)

**Decision:** User to acquire official source, then resume work.
```

---

### Continuous Risk Assessment

**Check risk level every 2-3 hours:**

```
Am I still working on safe, low-risk items?
Have requirements become unclear?
Am I making assumptions I shouldn't?
Have I hit unexpected complexity?
Do I need user input?
```

**If YES to any:** Defer and document.

---

## 📊 ROUTINE MAINTENANCE METRICS

**Track in completion reports:**

```markdown
### Routine Maintenance Performed

**Documentation Updates:**
- README.md: Added 3 new sections
- API docs: Updated 5 function signatures
- Quick-start guide: Fixed 2 outdated commands

**Best Practice Fixes:**
- Extracted 8 magic numbers to constants
- Renamed 12 variables for clarity
- Added error handling to 4 functions

**Lint/Quality:**
- Fixed 23 auto-fixable warnings
- Manually fixed 7 trivial warnings
- Remaining warnings: 3 (documented as intentional)

**Crust Reduction:**
- Deleted 147 lines of commented code
- Removed 5 unused functions
- Cleaned 12 obsolete TODO comments

**Refactoring Opportunities:**
- Documented 3 medium-priority refactorings
- Documented 1 high-priority architecture improvement

**CTO Mentoring:**
- Created analysis of validation module pattern
- Documented source quality lesson learned

**Time Investment:** 2.1 hours
**Impact:** Improved maintainability, reduced technical debt
```

---

## 🎯 QUALITY METRICS GOALS

**Target for each autonomous session:**

| Metric | Goal |
|--------|------|
| **New Tests** | 30-50 |
| **Test Pass Rate** | 100% |
| **Lint Warnings** | -10 to -30 (reduction) |
| **Code Coverage** | +2% to +5% |
| **Documentation Pages** | +1 to +3 |
| **Crust Removed** | 100-300 LOC |
| **Best Practice Fixes** | 5-15 |
| **Refactoring Docs** | 2-5 opportunities |

**Aggregate Effect:** After 10 AB sessions, codebase is significantly cleaner, better documented, and more maintainable.

---

## 📋 UPDATED SESSION CHECKLIST

**Expanded completion checklist with routine maintenance:**

### Code Quality
- [ ] All requested work completed
- [ ] Pulled-forward work completed
- [ ] 30-50 new tests added
- [ ] All tests passing (100%)
- [ ] **Lint warnings reduced** ← NEW
- [ ] **Best practice fixes applied** ← NEW
- [ ] **Crust removed** ← NEW

### Documentation
- [ ] Completion report written
- [ ] Edge case report updated
- [ ] **README updated** ← NEW
- [ ] **API docs current** ← NEW
- [ ] **CTO mentoring analysis** ← NEW

### Planning
- [ ] Refactoring opportunities documented
- [ ] Automation opportunities documented
- [ ] **Risk deferrals documented** ← NEW
- [ ] Next session recommendations

### Git
- [ ] Atomic commits with clear messages
- [ ] Checkpoints tagged (if long session)
- [ ] All work pushed to branch

---

## 💡 PHILOSOPHY: OPPORTUNISTIC QUALITY

**Key Insight:** During autonomous sessions, Claude has "thinking time" that the user doesn't have during interactive coding.

**Use this time for:**
- Pattern recognition (finding repetition)
- Quality improvements (fixing what you see)
- Documentation (while context is fresh)
- Planning (identifying future work)

**Mindset Shift:**
- ❌ "Complete task and stop"
- ✅ "Complete task, improve what I touched, document what I learned"

**Value Multiplier:** Every AB session leaves code better than it found it.

---

**Added:** 2025-11-13
**Status:** ACTIVE - Apply to all autonomous sessions
**Review:** After 5 sessions, measure impact on codebase quality
**Export:** Include in project best practices guide for other projects
