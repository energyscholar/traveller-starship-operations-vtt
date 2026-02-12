/**
 * Feedback Handlers - Player feedback system
 * Part of the modular socket handler architecture
 */

/**
 * Register feedback handlers
 * @param {Object} ctx - Handler context from context.js
 */
function register(ctx) {
  const {
    socket, opsSession, operations,
    socketLog, sanitizeError, createHandler
  } = ctx;

  // Submit feedback
  socket.on('ops:submitFeedback', (data) => {
    const handler = createHandler(
      (d) => {
        const feedback = operations.submitFeedback({
          campaignId: opsSession.campaignId,
          playerName: opsSession.isGuest ? opsSession.guestName : (opsSession.accountId || 'Anonymous'),
          ...d
        });
        return { feedback };
      },
      {
        eventName: 'ops:submitFeedback',
        successEvent: 'ops:feedbackSubmitted',
        successCallback: (result) => {
          socketLog.info(`[OPS] Feedback submitted: ${data.feedbackType} - ${data.title}`);
        }
      }
    );
    handler(socket, data);
  });

  // GM: Get all feedback
  // TODO: Cannot use createHandler — GM guard emits ops:error (different event from success ops:feedbackList). (audit 2026-02-11)
  socket.on('ops:getFeedback', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can view feedback' });
        return;
      }
      const feedback = operations.getAllFeedback({ limit: 100 });
      const stats = operations.getFeedbackStats();
      socket.emit('ops:feedbackList', { feedback, stats });
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Feedback', error));
      socketLog.error('[OPS] Error getting feedback:', error);
    }
  });

  // GM: Get new feedback count (lightweight)
  // TODO: Cannot use createHandler — custom error handling emits ops:feedbackCount on catch instead of ops:error. (audit 2026-02-11)
  socket.on('ops:getFeedbackCount', () => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:feedbackCount', { count: 0 });
        return;
      }
      const stats = operations.getFeedbackStats();
      const newCount = stats.byStatus.new || 0;
      socket.emit('ops:feedbackCount', { count: newCount });
    } catch (error) {
      socket.emit('ops:feedbackCount', { count: 0 });
    }
  });

  // GM: Update feedback status
  // TODO: Cannot use createHandler — GM guard emits ops:error (different event from success ops:feedbackStatusUpdated). (audit 2026-02-11)
  socket.on('ops:updateFeedbackStatus', (data) => {
    try {
      if (!opsSession.isGM) {
        socket.emit('ops:error', { message: 'Only GM can update feedback status' });
        return;
      }
      const { feedbackId, status } = data;
      operations.updateFeedbackStatus(feedbackId, status);
      socket.emit('ops:feedbackStatusUpdated', { feedbackId, status });
      socketLog.info(`[OPS] Feedback ${feedbackId} marked as ${status}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Feedback', error));
      socketLog.error('[OPS] Error updating feedback status:', error);
    }
  });
}

module.exports = { register };
