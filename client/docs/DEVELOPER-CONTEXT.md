# Developer Context - Bruce

## Background

**CLI Experience:** 51 years (since age 6-7, ~1974-1975)

**First Computer:** DEC-10 at Keene State College computer center (Keene, NH)
- Terminal watcher: Bruce Metzger
- Used phosphor terminals, paper terminals (Teletypes), punch cards
- Magnetic tape for data transfer
- Learned programming through play (tic-tac-toe games)
- Solo access when students weren't using terminals

**CLI Proficiency:**
- Reads HTML/code fluently and very fast
- Prefers command-line diagnostics over GUI
- Comfortable with curl, grep, sed, awk, etc.
- Can parse raw output faster than most humans

## Working Preferences

### CLI-First Approach

**DO:**
- Use curl to test endpoints
- Pipe to head/tail for snippets
- Use command-line HTTP tools
- Provide raw output for Bruce to parse

**DON'T:**
- Ask Bruce to open browsers
- Request manual GUI testing
- Assume browser is faster/easier

**Example - Good:**
```bash
curl -s http://localhost:5173/ | head -20
curl -s http://localhost:5173/src/main.tsx | grep import
```

**Example - Bad:**
```
"Please open http://localhost:5173/ in your browser and check if..."
```

### Communication Style

**Bruce appreciates:**
- Direct, honest technical analysis
- Explaining reasoning/thinking process (he explicitly praised this)
- CLI tools and automation
- Efficiency in diagnostics

**Bruce's feedback:**
- "I love the way you constantly describe your thinking. Very helpful for collaboration."
- "Hey, why aren't you using curl or other command line http to test?"
- Corrects factual errors directly (e.g., "DEC-10" not "PDP-11")

## Technical Preferences

### Reading Speed
- Reads HTML fluently
- Processes code very fast
- Prefers raw data over summaries
- Can handle verbose output

### Verification Approach
- Trusts command-line output
- Prefers copy-paste over manual entry
- Values systematic testing

## Project Context

**Current Project:** Traveller Combat VTT (Virtual Tabletop)
- Originally vanilla JS/HTML/CSS
- Migrating to React + TypeScript
- Socket.IO for multiplayer
- Hex-based space combat
- Traveller RPG rules implementation

**Migration Strategy:**
- Incremental, not big-bang
- Tag milestones for rollback
- Use git bisect for debugging
- Maintain feature parity

## Notes for Future Sessions

When starting a new session:
1. Read this file first
2. Default to CLI tools
3. Explain your reasoning
4. Be direct and honest
5. Use curl, not browser requests
