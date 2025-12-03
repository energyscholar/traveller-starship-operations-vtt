# Session Chunking Protocol (AR-17.6)

**Purpose:** Prevent context overflow by gracefully chunking sessions at ~150K tokens

---

## Warning Signs (Chunk Soon)

- Responses noticeably slower
- Claude forgetting recent context
- Repeated questions about same topic
- Complex reasoning degrading
- ~150K tokens used (if tracking)

---

## Chunking Checklist

When warning signs appear, write to **STAGED-TODOS.md**:

### 1. Current Task State
```markdown
## Session Chunk: [DATE] [TIME]

### In Progress
- [ ] Task description (% complete, next step)
- [ ] Another task (blocked by X)

### Completed This Session
- [x] Task A
- [x] Task B
```

### 2. Key Files Discovered
```markdown
### Key Files
- `path/to/file.js:123` - Why it matters
- `path/to/other.js` - Connection to task
```

### 3. Decisions Made
```markdown
### Decisions
- Chose X over Y because Z
- Pattern established: describe
```

### 4. Gotchas & Context
```markdown
### Context for Next Session
- Bug: X happens when Y (workaround: Z)
- The foo() function actually does bar (misleading name)
- Don't forget: important detail
```

### 5. Next Steps (Explicit)
```markdown
### Resume Instructions
1. Read STAGED-TODOS.md first
2. Read [specific file] lines X-Y
3. Continue with [explicit next action]
4. Test by running [command]
```

---

## Resume Protocol

New session starts:
1. **Read STAGED-TODOS.md** before doing anything
2. Confirm understanding with user
3. Pick up from "Resume Instructions"
4. Clear completed items from STAGED-TODOS.md

---

## Minimum Required Fields

At minimum, capture:
- [ ] Current task + progress %
- [ ] Next explicit action
- [ ] Any blockers
- [ ] Key file paths

---

## Anti-Patterns

**DON'T:**
- Wait until context is exhausted
- Write vague summaries ("was working on feature X")
- Assume next session remembers anything
- Leave implicit next steps

**DO:**
- Chunk proactively at warning signs
- Be explicit about next action
- Include file:line references
- List actual commands to run

---

## Template (Copy/Paste)

```markdown
## Session Chunk: YYYY-MM-DD HH:MM

### In Progress
- [ ] [Task] (X% - next: [action])

### Completed
- [x] [Task]

### Key Files
- `path:line` - [why]

### Decisions
- [Decision + rationale]

### Context
- [Gotcha or important detail]

### Resume
1. Read STAGED-TODOS.md
2. Read `[file]` lines X-Y
3. [Explicit next action]
4. Test: `[command]`
```

---

## Success Metrics

- New session picks up seamlessly
- No repeated work
- No context re-discovery
- <5 min to resume
