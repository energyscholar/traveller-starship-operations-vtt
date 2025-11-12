# Claude Code Bug Report: Unrecoverable Crash After Multiple Large Text Posts

**Report Date:** 2025-01-12
**Reporter:** Bruce
**Priority:** HIGH - Complete session loss, unrecoverable
**Status:** Not yet filed

---

## Summary

Claude Code session became completely unresponsive and crashed after user posted approximately 10 consecutive large text blocks. Session could not be recovered even after moving to strong WiFi signal and waiting several minutes. Required force-closing the tab.

---

## Environment

- **Device:** Acer Chromebook Plus 514
- **OS:** ChromeOS with bog standard Linux container
- **Browser:** Chrome (default ChromeOS browser)
- **Claude Code Version:** Current production version (as of 2025-01-12)
- **Network:** Poor WiFi initially, moved to strong WiFi during recovery attempt
- **Session Type:** Long-running session in adjacent tab

---

## Steps to Reproduce

1. Start a Claude Code session in a browser tab
2. Let the session run for an extended period (long session)
3. Post approximately 10 consecutive large text blocks rapidly
   - Text blocks were "chunky" (substantial size)
   - Text was scraped from archive.org (replicable content)
   - Posted "one after another" in quick succession
4. Claude Code initially responds to first few posts normally
5. Session becomes unresponsive/crashes

---

## Expected Behavior

- Claude Code should handle multiple large posts gracefully
- If rate limiting is needed, should show a clear message
- Session should remain recoverable even with poor network conditions
- Should handle backpressure from large input queue

---

## Actual Behavior

1. **Initial Success:** Claude Code responded normally to first 2-3 posts with thoughtful analysis (e.g., analyzing Sarnath Software 1995-1999 history)
2. **Progressive Failure:** Session stopped responding to subsequent posts
3. **Total Crash:** Session became completely unresponsive
4. **No Recovery:** Even after:
   - Waiting several minutes
   - Moving to strong WiFi signal (eliminating network issues)
   - Attempting to interact with the session
   - Session remained frozen/crashed
5. **Force Close Required:** Only option was to close the tab entirely

---

## Sample Content That Triggered Crash

User was posting historical content about Sarnath Software scraped from archive.org. Claude Code initially responded with:

```
This is absolutely remarkable.

Sarnath Software in 1995-1999 had:
✅ System-agnostic VTT (works with any RPG)
✅ Voice communication during gameplay (in the 1990s!)
✅ Publisher partnership (Steve Jackson Games!)
✅ Game network connecting GMs and players globally
✅ FREE software model
✅ Art, music, special effects

This is exactly what Roll20 did successfully 15 years later...
```

Then after a few more similar large posts, the session crashed.

**Exact content that caused crash**: The text content from `/home/bruce/software/deleteme_junk_screenshots_highguard/sarnath/sarnathDOTCOM_screenscrape_matches_screenshot.txt` was posted as approximately 10 separate paste operations, each containing a "chunky" section of the archived website text. User notes: "I posted each page as a separate paste. This time I compiled them into a single text file and served that. Works better."

**Reproduction note**: The crash appears to be triggered by posting the same large content broken into ~10 rapid sequential posts, NOT by posting the same content as a single consolidated file.

---

## Network Context

- **Initial condition:** Poor WiFi zone (possible packet loss)
- **Recovery attempt:** Moved to strong WiFi reception area
- **Result:** Strong WiFi did NOT recover the session
- **Control test:** This bug report being written successfully on same "poor WiFi" connection
- **Conclusion:** Network quality was NOT the root cause

---

## Impact

**Severity: HIGH**

- **Data Loss:** Entire session context lost
- **No Recovery:** No way to resume the conversation
- **Unpredictable:** Unclear what threshold triggers the crash
- **User Experience:** Complete disruption of workflow

---

## Analysis

### Likely Root Causes

1. **Buffer Overflow:** Too many large messages queued without processing
2. **Memory Leak:** Large text blocks accumulating in memory
3. **Rate Limiting:** Backend overwhelmed but failed to send proper error
4. **Context Window:** Exceeded token limits and failed gracefully
5. **WebSocket Failure:** Connection dropped but UI didn't reflect it

### Why Network Wasn't the Cause

- Poor WiFi is "perfectly good most of the time" per user
- Moving to strong WiFi didn't fix the issue
- Successfully writing this bug report on same poor WiFi
- Suggests backend/frontend issue, not network transport

---

## Reproduction Status

**Not Yet Attempted**

User has not tried to reproduce the issue (understandably - it's destructive).

---

## Suggested Fixes

1. **Rate Limiting with User Feedback:**
   - If user posts too fast, show clear message
   - "Processing previous messages, please wait..."
   - Don't accept new input until queue clears

2. **Graceful Degradation:**
   - If context window approaching limit, warn user
   - If backend struggling, show spinner/loading state
   - Never enter unrecoverable state

3. **Better Error Recovery:**
   - If WebSocket drops, show clear reconnection UI
   - Offer to save conversation state
   - Allow session resume after refresh

4. **Input Queue Management:**
   - Limit pending message queue size
   - Process messages one at a time with backpressure
   - Don't let UI accept input faster than backend can process

5. **Memory Management:**
   - Stream large inputs instead of buffering entirely
   - Clear processed messages from memory
   - Monitor and limit total context size

---

## Related Issues

This may be related to:
- Token limit handling
- WebSocket connection management
- Frontend state management with large contexts
- Backend queuing and rate limiting

---

## Test Case for QA

```javascript
// Pseudocode test case
test('Handle rapid large message posting', async () => {
  const session = await startClaudeCodeSession();
  const largeText = generateLargeText(5000); // 5KB blocks

  // Post 10 large blocks rapidly
  for (let i = 0; i < 10; i++) {
    await session.postMessage(largeText);
  }

  // Session should remain responsive
  expect(session.isResponsive()).toBe(true);

  // All messages should eventually process
  await session.waitForAllResponses();
  expect(session.getResponseCount()).toBe(10);
});
```

---

## Additional Notes

- User was in a long-running session before this occurred
- Session was in an "adjacent tab" (background tab?)
- Content was "replicable" (scraped from archive.org)
- First few responses were normal and high-quality
- Crash was sudden and complete

---

## Filing Information

**GitHub Issue URL:** (to be filled when filed)
**Internal Ticket:** (to be filled when filed)
**Status:** Ready to submit

---

## Contact

If additional information is needed, reporter can provide:
- The specific archive.org content that was being posted
- Approximate timestamp of the crash
- Browser console logs (if available)
- Network logs (if available)
