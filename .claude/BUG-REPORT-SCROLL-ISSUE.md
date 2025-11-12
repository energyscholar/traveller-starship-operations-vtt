# BUG REPORT: Claude Code Scroll Issue

**Date Prepared:** 2025-11-12
**Reporter:** Bruce
**System:** Chromebook Plus 514

---

## HOW TO SUBMIT THIS BUG REPORT

1. **Go to GitHub Issues:**
   ```
   https://github.com/anthropics/claude-code/issues
   ```

2. **Click the green "New issue" button**

3. **Copy the bug report below** (everything from "Title:" to the end)

4. **Before submitting:**
   - Type `/help` in Claude Code to get your version number
   - Add the version where it says `[INSERT VERSION HERE]`

5. **Click "Submit new issue"**

---

## BUG REPORT TO COPY/PASTE

**Title:** Bash output scroll jumps to top in fullscreen mode

**Description:**

When using Claude Code in fullscreen mode, the bash output window automatically scrolls to the top intermittently, forcing manual scrolling back down to see current output. This makes it very difficult to monitor long-running processes.

**Steps to Reproduce:**
1. Put Claude Code window in fullscreen mode (Chrome browser)
2. Run a long-running bash command (e.g., `npm start`)
3. Observe the scroll position jumping to top repeatedly while output continues

**Expected Behavior:**
Scroll should stay at bottom to show latest output (or maintain user's scroll position if manually scrolled up)

**Actual Behavior:**
Scroll bar jumps way up to the top of the output, requiring constant manual scrolling down to see current logs

**Environment:**
- **OS:** ChromeOS (Chromebook Plus 514)
- **Linux Container:** Debian (penguin) - Linux 6.6.88-08646-g082267a5c5ac
- **Browser:** Chrome (ChromeOS default)
- **Shell:** bash 5.2.15(1)-release
- **Node.js:** v18.20.4
- **npm:** 9.2.0
- **Claude Code Version:** [INSERT VERSION HERE - type `/help` to find it]

**Impact:**
- **Severity:** Medium - makes long-running commands very difficult to monitor
- **Frequency:** Constant - occurs repeatedly throughout command execution
- **Workaround:** Exit fullscreen mode or use separate terminal

**Additional Context:**
Issue appears to be specific to fullscreen mode. Hypothesis: scroll behavior may not have been tested in fullscreen on ChromeOS/Linux.

The issue occurs with background bash processes that continue outputting logs (e.g., a Node.js server running with `npm start`). Each time new output is generated, the scroll position jumps to the top rather than staying at the bottom or maintaining the user's scroll position.

**Reproduction Rate:**
100% - happens every time in fullscreen mode with long-running bash commands

---

## ADDITIONAL INFORMATION

**Alternative Contact Methods:**

If GitHub doesn't work, you can also report issues through:
- Claude Code feedback in the app (if there's a feedback button)
- Anthropic support: https://support.anthropic.com/

**Related Information:**
- This bug was discovered while developing a Node.js application
- Multiple background bash sessions were running simultaneously
- The issue made development significantly more difficult

---

## CHECKLIST BEFORE SUBMITTING

- [ ] Verified the issue still occurs (test in fullscreen mode)
- [ ] Added Claude Code version number (from `/help` command)
- [ ] Copied the entire bug report text
- [ ] Submitted to: https://github.com/anthropics/claude-code/issues
- [ ] Saved the issue URL for reference: ___________________

---

**Status:** Ready to submit
**File Location:** `/home/bruce/software/traveller-combat-vtt/.claude/BUG-REPORT-SCROLL-ISSUE.md`
