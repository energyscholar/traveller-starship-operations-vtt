# Handoff Documents

This directory contains handoff documents for resuming work in new Claude conversations.

## How to Use

1. At end of productive session, create handoff: `HANDOFF-STAGE-X-COMPLETE.md`
2. In new chat, upload handoff and say: "Continue from handoff document"
3. Claude reads context and continues seamlessly

## 🚨 CRITICAL: PDF Safety Guidelines

**NEVER read full PDFs directly** - they consume excessive tokens and can crash sessions.

### Safe PDF Handling Protocol:
1. **Check size first**: Use `pdfinfo` to check page count and file size
2. **Extract text only**: Use `pdftotext` for specific page ranges (5-10 pages max)
3. **Get TOC first**: Extract table of contents to identify relevant sections
4. **Targeted extraction**: Only extract specific sections needed for current task
5. **Never use Read tool on large PDFs**: Read tool processes images/formatting = massive tokens

### Reference Materials in this Project:
- `reference/Book 1 - Characters & Combat.pdf` (129 pages, ~60K tokens)
- `reference/Book 2 - Spacecraft & Worlds.pdf` (105 pages, ~75K tokens)
- **NEVER load these fully** - use TOC + targeted extraction only

## Naming Convention

- `HANDOFF-STAGE-X-COMPLETE.md` - Stage X finished, ready for Stage X+1
- `HANDOFF-STAGE-X-INCOMPLETE.md` - Stage X in progress, resume here
- Include date in filename for history: `HANDOFF-STAGE-2-COMPLETE-2025-10-31.md`

## Current Handoffs

- Stage 2 Complete: See `HANDOFF-STAGE-2-COMPLETE.md`
