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
    socketLog, sanitizeError
  } = ctx;

  // Submit feedback
  socket.on('ops:submitFeedback', (data) => {
    try {
      const feedback = operations.submitFeedback({
        campaignId: opsSession.campaignId,
        playerName: opsSession.isGuest ? opsSession.guestName : (opsSession.accountId || 'Anonymous'),
        ...data
      });
      socket.emit('ops:feedbackSubmitted', { feedback });
      socketLog.info(`[OPS] Feedback submitted: ${data.feedbackType} - ${data.title}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Feedback', error));
      socketLog.error('[OPS] Error submitting feedback:', error);
    }
  });

  // GM: Get all feedback
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
