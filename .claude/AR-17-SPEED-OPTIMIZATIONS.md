# AR-17: Speed Optimizations

**Goal**: Maximize Claude Code throughput while maintaining accuracy
**Estimated Impact**: 40-60% reduction in tokens per task
**Risk Level**: Low (configuration/behavioral changes only)

---

## Stage Overview

| Stage | Name | Benefit | Risk | Complexity |
|-------|------|---------|------|------------|
| 17.1 | Haiku Model Defaults | 30-50% cost reduction on searches | Low | Easy |
| 17.2 | Read Limit Defaults | 25% fewer tokens on file reads | Low | Easy |
| 17.3 | Grep-Before-Read Pattern | 40% fewer tokens finding code | Low | Easy |
| 17.4 | Parallel Tool Execution | 50% faster multi-file operations | Low | Easy |
| 17.5 | Concise Response Format | 20% fewer output tokens | Low | Easy |
| 17.6 | Session Chunking Strategy | Prevent context overflow | Medium | Medium |
| 17.7 | Task Agent for Exploration | 60% fewer tokens on searches | Low | Easy |
| 17.8 | Strategic File Caching | 30% fewer redundant reads | Low | Medium |
| 17.9 | Smart Truncation Rules | 35% fewer tokens on large files | Low | Easy |
| 17.10 | Metrics & Validation | Measure improvements | None | Medium |

---

## Stage Details

### 17.1 Haiku Model Defaults

**What**: Use `model: "haiku"` parameter for simple Task agents

**Benefit**:
- 10-20x cheaper per token vs Sonnet
- Same accuracy for glob/grep/simple analysis
- 30-50% overall cost reduction

**Risk**: Low
- Haiku may miss nuance on complex questions
- Mitigation: Only use for well-defined searches

**When to Use Haiku**:
- File pattern searches (glob)
- Keyword searches (grep)
- Simple code counting/analysis
- Reading and summarizing docs
- Straightforward refactors

**When NOT to Use Haiku**:
- Complex architectural decisions
- Security-sensitive analysis
- Code generation
- Multi-step reasoning

**Metrics**:
- Baseline: X tokens per search task
- Target: 0.3X tokens per search task

---

### 17.2 Read Limit Defaults

**What**: Use `limit` parameter on Read tool for large files

**Benefit**:
- Avoid reading 5000-line files fully
- 25% fewer tokens on file reads
- Faster response times

**Risk**: Low
- May miss relevant code outside limit
- Mitigation: Use grep first to find line numbers

**Rules**:
```
Files >500 lines: Use limit=200, expand as needed
Files >1000 lines: Use limit=100 initially
Config files: Read fully (usually small)
Test files: Use limit unless running tests
```

**Metrics**:
- Baseline: Avg 400 lines read per file
- Target: Avg 150 lines read per file

---

### 17.3 Grep-Before-Read Pattern

**What**: Always grep for target before reading entire files

**Benefit**:
- Jump directly to relevant sections
- 40% fewer tokens finding code
- More precise edits

**Risk**: Low
- May miss context if grep too narrow
- Mitigation: Read surrounding lines with -B/-C flags

**Pattern**:
```
1. Grep for function/class/pattern
2. Note file:line results
3. Read with offset/limit to that section
4. Expand if needed
```

**Anti-Pattern**:
```
❌ Read entire 2000-line file
❌ Scan visually for target
❌ Make edit
```

**Metrics**:
- Baseline: 3 full file reads per search
- Target: 1 targeted read per search

---

### 17.4 Parallel Tool Execution

**What**: Execute independent tool calls in single message

**Benefit**:
- 50% faster for multi-file operations
- Same accuracy, less wall-clock time
- Reduced round-trips

**Risk**: Low
- None if dependencies correctly identified

**When to Parallelize**:
```
✅ Multiple independent file reads
✅ Multiple greps on different patterns
✅ Multiple Task agents (different searches)
✅ Git status + git diff + git log
```

**When NOT to Parallelize**:
```
❌ Write then read same file
❌ mkdir then write file in it
❌ git add then git commit
❌ Tool B needs Tool A's output
```

**Metrics**:
- Baseline: 4 sequential tool calls = 4 round trips
- Target: 4 parallel tool calls = 1 round trip

---

### 17.5 Concise Response Format

**What**: Shorter responses, less commentary

**Benefit**:
- 20% fewer output tokens
- Faster to read for user
- More professional

**Risk**: Low
- May feel terse to some users
- Mitigation: Expand when user asks

**Rules**:
```
- Skip "I'll help you with..." preambles
- Skip "Let me..." narration
- Skip emoji unless requested
- Use bullet points over paragraphs
- Lead with answer, not process
```

**Bad**:
```
I'll help you find that function! Let me search through
the codebase to locate it. This might take a moment as
I grep through the various directories... 🔍
```

**Good**:
```
Found `validateInput` at lib/validators.js:45
```

**Metrics**:
- Baseline: 150 words per response
- Target: 50 words per response (same info)

---

### 17.6 Session Chunking Strategy

**What**: Break long sessions at ~150K tokens

**Benefit**:
- Prevent context overflow
- Maintain response quality
- Avoid degraded performance

**Risk**: Medium
- Requires manual intervention
- Context loss at boundaries

**Implementation**:
```
At 150K tokens:
1. Write comprehensive summary to STAGED-TODOS.md
2. List all pending tasks
3. Note key file paths discovered
4. User starts new session
5. New session reads STAGED-TODOS.md first
```

**Warning Signs**:
- Responses getting slower
- Claude forgetting earlier context
- Repeated questions about same topic

**Metrics**:
- Baseline: Sessions crash at 200K tokens
- Target: Graceful handoff at 150K tokens

---

### 17.7 Task Agent for Exploration

**What**: Use Task tool with Explore agent for codebase searches

**Benefit**:
- 60% fewer tokens on exploratory searches
- Better search coverage
- Parallel exploration internally

**Risk**: Low
- Agent may not find everything
- Mitigation: Specify thoroughness level

**When to Use**:
```
✅ "Where is X handled?"
✅ "How does Y work?"
✅ "What files relate to Z?"
✅ Open-ended codebase questions
```

**When NOT to Use**:
```
❌ Know exact file path already
❌ Simple "class Foo" lookup
❌ Single grep for specific string
```

**Thoroughness Levels**:
- `quick`: 5-10 seconds, surface scan
- `medium`: 15-30 seconds, moderate depth
- `very thorough`: 60+ seconds, comprehensive

**Metrics**:
- Baseline: 8 tool calls for exploration
- Target: 1 Task call for same result

---

### 17.8 Strategic File Caching

**What**: Track files read in session, avoid re-reading unchanged files

**Benefit**:
- 30% fewer redundant reads
- Faster repeated access
- Less context pollution

**Risk**: Low
- File may change externally
- Mitigation: Note last-read time, re-read if editing

**Pattern**:
```
Session memory:
- server.js: read at turn 5, lines 1-200
- validators.js: read fully at turn 8

Before reading:
- Check if already in context
- Only read if new info needed
- Use offset/limit to read new sections
```

**Metrics**:
- Baseline: Same file read 3x per session
- Target: Same file read 1x per session

---

### 17.9 Smart Truncation Rules

**What**: Truncate known-safe file sections

**Benefit**:
- 35% fewer tokens on large files
- Focus on relevant code
- Skip boilerplate

**Risk**: Low
- May truncate needed code
- Mitigation: Keep function boundaries intact

**Safe to Truncate**:
```
- Package-lock.json (always skip)
- node_modules (always skip)
- Long comment blocks (>10 lines)
- Import sections (usually can infer)
- Test data fixtures (unless testing)
```

**Never Truncate**:
```
- Function being edited
- Class being modified
- Config being changed
- Error stack traces
```

**Metrics**:
- Baseline: Read 100% of accessed files
- Target: Read 65% of accessed files (skip safe sections)

---

### 17.10 Metrics & Validation

**What**: Track and measure optimization impact

**Benefit**:
- Prove improvements work
- Identify further opportunities
- Catch regressions

**Risk**: None

**Metrics to Track**:
```
1. Tokens per completed task
2. Tool calls per task
3. Response time (wall clock)
4. Accuracy (tasks completed successfully)
5. User satisfaction (qualitative)
```

**Validation Approach**:
```
Before: Run 10 standard tasks, measure tokens
After: Same 10 tasks with optimizations
Compare: Token reduction while maintaining accuracy
```

**Success Criteria**:
- 40% token reduction overall
- 0% accuracy loss
- User reports faster experience

---

## Implementation Order

**Phase 1 (Immediate - CLAUDE.md changes)**:
- 17.1 Haiku defaults
- 17.2 Read limits
- 17.3 Grep-before-read
- 17.4 Parallel execution

**Phase 2 (Session discipline)**:
- 17.5 Concise responses
- 17.6 Session chunking

**Phase 3 (Advanced patterns)**:
- 17.7 Task agent exploration
- 17.8 File caching
- 17.9 Smart truncation

**Phase 4 (Measurement)**:
- 17.10 Metrics & validation

---

## Current CLAUDE.md Status

Already implemented in CLAUDE.md:
- ✅ 17.1 Haiku model guidance (partial)
- ✅ 17.2 Read limit guidance (partial)
- ✅ 17.3 Grep-before-read (partial)
- ✅ 17.4 Parallel execution (documented)
- ✅ 17.6 Session chunking at 150K (documented)

Need to add/strengthen:
- 17.5 Concise response rules
- 17.7 Task agent for exploration
- 17.8 File caching strategy
- 17.9 Smart truncation rules

---

## Risk Mitigation Summary

| Stage | Risk | Mitigation |
|-------|------|------------|
| 17.1 | Haiku misses nuance | Only for simple tasks |
| 17.2 | Miss code outside limit | Grep first for line numbers |
| 17.3 | Grep too narrow | Use -B/-C for context |
| 17.4 | Data dependencies | Identify dependencies first |
| 17.5 | Too terse | Expand when asked |
| 17.6 | Context loss | Write thorough summaries |
| 17.7 | Incomplete search | Specify thoroughness |
| 17.8 | Stale reads | Track timestamps |
| 17.9 | Truncate needed code | Keep function boundaries |
| 17.10 | N/A | N/A |

---

## Quick Reference Card

```
FAST PATTERNS:
1. Haiku for searches
2. Limit on large files
3. Grep → Read targeted
4. Parallel when independent
5. Short responses
6. Chunk at 150K
7. Task agent for exploration
8. Don't re-read same file
9. Skip boilerplate

SLOW PATTERNS (avoid):
1. Full file reads
2. Sequential tool calls
3. Verbose responses
4. One grep per call
5. Reading same file 3x
6. Sessions >200K tokens
7. Manual multi-file search
```
