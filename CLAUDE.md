# Claude Code Project Instructions

## Token Optimization

### Grep Before Read
When looking for specific code in large files:
1. Grep first to get line numbers
2. Read with offset/limit around target lines
3. Avoid full-file reads for needle-in-haystack searches

### File Reading
Use `limit` parameter on Read tool when:
- Checking file headers/imports (limit: 50-100)
- Reading config files (limit: 200)
- Verifying a specific section exists
- File is known to be large (app.js = 6K LOC)

Read full file only when:
- Making edits (need context for accurate old_string)
- Understanding overall structure
- File is small (<200 LOC)

### Response Style
- Skip verbose confirmations ("I'll now proceed to...")
- Use tables/bullets over prose
- Don't repeat back what user said
- Target ~150 tokens per response when possible

### Session Chunking
At ~150K tokens context, give explicit warning:
"Context at ~150K tokens, recommend fresh session. Handoff notes in STAGED-TODOS.md"
- Write current task state to STAGED-TODOS.md before recommending
- Include: what's done, what's in progress, next steps

### Parallel Execution
When tasks are independent, use parallel tool calls aggressively:
- Multiple file reads → single message with multiple Read calls
- Multiple greps → single message with multiple Grep calls
- Multiple Task agents → single message with multiple Task calls
- Bash commands with no dependencies → parallel Bash calls

Default to parallel unless there's a data dependency.

### Task Agents
Use `model: "haiku"` for Task agents when doing:
- File searches / glob patterns
- Simple grep operations
- Straightforward refactors (rename variable)
- Code formatting
- Reading and summarizing docs

Use Sonnet/Opus only for:
- Complex multi-file changes
- Architecture decisions
- Bug investigation
- Security analysis

## Project Context

- Operations VTT: Multi-role starship crew management
- Legacy combat system at /combat
- Main app at /operations
- ~78K LOC (server 27K, client 13K, tests 20K)

## Testing

Run `npm test` after changes. All 325 tests must pass.
