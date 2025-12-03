# Claude Code Project Instructions

## AR-17 Speed Optimizations

### 17.1 Haiku Model Defaults

Use `model: "haiku"` for Task agents doing simple work:

**Use Haiku:**
- File pattern searches (glob)
- Keyword searches (grep)
- Simple code counting/analysis
- Reading and summarizing docs
- Straightforward variable renames

**Use Sonnet/Opus:**
- Complex architectural decisions
- Security-sensitive analysis
- Code generation
- Multi-step reasoning
- Bug diagnosis

---

### 17.2 Read Limit Defaults

| File Size | Strategy |
|-----------|----------|
| <200 lines | Read fully |
| 200-500 lines | Read fully or limit=200 |
| 500-1000 lines | limit=200, expand as needed |
| >1000 lines | limit=100, grep first |

**Always read fully:** package.json, small configs, files being edited

---

### 17.3 Grep-Before-Read Pattern

```
1. Grep for function/class/pattern
2. Note file:line results
3. Read with offset/limit to that section
4. Expand if needed
```

**Grep flags:**
- `-B 5 -A 10` for context
- `output_mode: "content"` for lines
- `type: "js"` to filter

---

### 17.4 Parallel Tool Execution

**Parallelize (no dependencies):**
- Multiple file reads
- Multiple greps
- Multiple Task agents
- git status + git diff + git log

**Sequential (has dependencies):**
- Write → read same file
- mkdir → write file in it
- git add → git commit

**Default to parallel.**

---

### 17.5 Concise Response Format

| Do | Don't |
|----|-------|
| Lead with answer | "I'll help you with..." |
| Bullet points | Long paragraphs |
| file:line refs | Verbose paths |
| ~50 words | ~150 words |

---

### 17.6 Session Chunking

**At ~150K tokens:** Write to STAGED-TODOS.md, recommend fresh session.

**See:** `.claude/SESSION-CHUNKING-PROTOCOL.md`

**Warning signs:**
- Responses slower
- Forgetting context
- Repeated questions

---

### 17.7 Task Agent for Exploration

**Use Task(Explore) for:**
- "Where is X handled?"
- "How does Y work?"
- Open-ended codebase questions

**Don't use for:**
- Known file paths
- Simple "class Foo" lookup (use Grep)

**Thoroughness:** quick | medium | very thorough

---

### 17.8 File Caching Strategy

**Before reading:**
1. Check if already read this session
2. Check if in recent context
3. Only read if new info needed
4. Use offset/limit for new sections

**Re-read if:** modified, need different section, long time passed

---

### 17.9 Smart Truncation Rules

**Safe to skip:**
- package-lock.json
- node_modules
- Long comment blocks (>10 lines)
- Import sections
- Test fixtures
- Generated files

**Never truncate:**
- Function being edited
- Config being changed
- Error stack traces
- Security code

---

### 17.10 Quick Reference

```
FAST:                      SLOW (avoid):
1. Haiku for searches      1. Full file reads
2. Limit on large files    2. Sequential tool calls
3. Grep → Read targeted    3. Verbose responses
4. Parallel independent    4. Reading same file 3x
5. Short responses         5. Sessions >200K
6. Task for exploration    6. Manual multi-file search
```

---

## Project Context

- **Operations VTT:** Multi-role starship crew management
- **Legacy combat:** /combat
- **Main app:** /operations
- **Size:** ~78K LOC (server 27K, client 13K, tests 20K)

## Key Paths

| Path | Purpose |
|------|---------|
| `lib/operations/` | Server-side operations |
| `public/operations/` | Client-side operations |
| `lib/socket-handlers/` | Socket event handlers |
| `tests/` | Test suites |
| `.claude/` | Planning docs |

## Commands

```bash
npm test              # Run all tests (308 passing)
npm start             # Start server (port 3000)
npm run db:reset      # Reset operations database
npm run ops:reset     # Reset + seed operations
```
