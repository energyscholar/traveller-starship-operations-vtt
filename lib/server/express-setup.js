/**
 * AR-250: Express Setup Module
 *
 * Express configuration, middleware, and static files.
 * Extracted from server.js for separation of concerns.
 *
 * @module lib/server/express-setup
 */

const express = require('express');
const path = require('path');
const config = require('../../config');

/**
 * Configure Express middleware
 * @param {express.Application} app
 */
function configureMiddleware(app) {
  // JSON body parsing
  app.use(express.json({ limit: '10mb' }));

  // URL-encoded body parsing
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging in development
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (!req.url.includes('socket.io') && !req.url.includes('.map')) {
        // Minimal logging - just API calls
        if (req.url.startsWith('/api/')) {
          console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.url}`);
        }
      }
      next();
    });
  }
}

/**
 * Configure static file serving
 * @param {express.Application} app
 */
function configureStatic(app) {
  const publicPath = path.join(__dirname, '../../public');

  // Static files with caching
  app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
  }));

  // Specific static directories
  app.use('/tiles', express.static(path.join(publicPath, 'tiles')));
  app.use('/lib', express.static(path.join(publicPath, 'lib')));
}

/**
 * Configure error handling
 * @param {express.Application} app
 */
function configureErrorHandling(app) {
  // 404 handler
  app.use((req, res, next) => {
    // Don't 404 on socket.io polling
    if (req.url.includes('socket.io')) {
      return next();
    }

    // SPA fallback - serve index.html for unknown routes
    if (req.accepts('html')) {
      return res.sendFile(path.join(__dirname, '../../public/index.html'));
    }

    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('[Express] Error:', err.message);

    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

    res.status(status).json({ error: message });
  });
}

/**
 * Apply all Express configuration
 * @param {express.Application} app
 */
function configureExpress(app) {
  configureMiddleware(app);
  configureStatic(app);
  // Note: error handling should be configured after routes
}

/**
 * Get Express app configuration
 * @returns {object} Configuration object
 */
function getConfig() {
  return {
    port: config.port || process.env.PORT || 3000,
    publicPath: path.join(__dirname, '../../public'),
    isProduction: process.env.NODE_ENV === 'production'
  };
}

module.exports = {
  configureMiddleware,
  configureStatic,
  configureErrorHandling,
  configureExpress,
  getConfig
};
