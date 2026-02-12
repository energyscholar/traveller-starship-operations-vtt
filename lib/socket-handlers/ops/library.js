/**
 * AR-40: Library Computer Socket Handlers
 * Handles library searches and reference lookups
 */

const libraryData = require('../../operations/library-data');

function register(ctx) {
  const { socket, socketLog, createHandler } = ctx;

  // Search library
  socket.on('ops:librarySearch', (data) => {
    const handler = createHandler(
      (d) => {
        const { query } = d || {};
        if (!query || typeof query !== 'string') {
          return { results: [], query: '' };
        }
        const results = libraryData.searchLibrary(query.trim());
        return { results, query: query.trim() };
      },
      {
        eventName: 'ops:librarySearch',
        successEvent: 'ops:libraryResults',
        successCallback: (result) => {
          if (result.query) {
            socketLog.info(`[OPS] Library search: "${result.query}" - ${result.results.length} results`);
          }
        }
      }
    );
    handler(socket, data);
  });

  // Decode UWP
  socket.on('ops:decodeUWP', (data) => {
    const handler = createHandler(
      (d) => {
        const { uwp } = d || {};
        if (!uwp || typeof uwp !== 'string') {
          return { decoded: null, uwp: '' };
        }
        const decoded = libraryData.decodeUWP(uwp.trim());
        return { decoded, uwp: uwp.trim() };
      },
      {
        eventName: 'ops:decodeUWP',
        successEvent: 'ops:uwpDecoded',
        successCallback: (result) => {
          if (result.uwp) {
            socketLog.info(`[OPS] UWP decoded: "${result.uwp}"`);
          }
        }
      }
    );
    handler(socket, data);
  });

  // Get trade codes
  socket.on('ops:getTradeCodes', () => {
    const handler = createHandler(
      () => {
        const codes = libraryData.getAllTradeCodes();
        return { codes };
      },
      {
        eventName: 'ops:getTradeCodes',
        successEvent: 'ops:tradeCodes'
      }
    );
    handler(socket);
  });

  // Get starport info
  socket.on('ops:getStarports', () => {
    const handler = createHandler(
      () => {
        const starports = libraryData.getAllStarports();
        return { starports };
      },
      {
        eventName: 'ops:getStarports',
        successEvent: 'ops:starports'
      }
    );
    handler(socket);
  });

  // Get glossary
  socket.on('ops:getGlossary', () => {
    const handler = createHandler(
      () => {
        const terms = libraryData.getAllGlossaryTerms();
        return { terms };
      },
      {
        eventName: 'ops:getGlossary',
        successEvent: 'ops:glossary'
      }
    );
    handler(socket);
  });
}

module.exports = { register };
