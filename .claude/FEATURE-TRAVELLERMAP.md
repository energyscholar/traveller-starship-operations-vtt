# Feature: TravellerMap Integration

**Status:** Research Complete, Ready for Implementation
**Priority:** High (enables auto-population of system data)
**Estimated Stages:** 3-4

---

## Overview

Integrate the TravellerMap API to enable:
1. Auto-population of star system data when GM changes campaign location
2. Interactive subsector map in astrogator panel
3. Jump destination browser with UWP tooltips
4. World search functionality

---

## TravellerMap API Summary

Base URL: `https://travellermap.com`

### Key Endpoints

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/api/search?q=QUERY` | Find worlds by name | `/api/search?q=Regina` |
| `/api/credits?sector=NAME&hex=XXYY` | Get world data | `/api/credits?sector=Spinward Marches&hex=1910` |
| `/api/jumpworlds?sector=NAME&hex=XXYY&jump=N` | Worlds within jump range | `&jump=2` |
| `/api/sec?sector=NAME&subsector=A-P` | Full subsector UWP data | `/api/sec?sector=Spinward Marches&subsector=C` |
| `/api/jumpmap?sector=NAME&hex=XXYY&jump=N` | Jump range map image | Returns PNG |
| `/api/tile?x=X&y=Y&scale=N` | Map tile for embedding | Various styles |

### Coordinate Systems

```
Named:       sector=Spinward Marches&hex=1910
Sector/Hex:  sx=-4&sy=-1&hx=19&hy=10
World-Space: x=-110&y=-70
```

### Response Format (Credits API)

```json
{
  "World": {
    "Name": "Regina",
    "UWP": "A788899-C",
    "Bases": "NS",
    "Zone": "",
    "PBG": "703",
    "Allegiance": "ImDd",
    "Stellar": "F7 V BD M3 V",
    "SS": "C",
    "Hex": "1910",
    "Remarks": "Ri Pa Ph An Cp(Sy) Sa Pz",
    ...
  }
}
```

---

## Implementation Stages

### Stage 1: Server-Side API Proxy

**Goal:** Create proxy endpoint to fetch TravellerMap data (avoids CORS issues)

**Files:** `server.js` or new `lib/travellermap.js`

```javascript
// GET /api/travellermap/world?sector=NAME&hex=XXYY
app.get('/api/travellermap/world', async (req, res) => {
  const { sector, hex } = req.query;
  const url = `https://travellermap.com/api/credits?sector=${encodeURIComponent(sector)}&hex=${hex}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

// GET /api/travellermap/jumpworlds?sector=NAME&hex=XXYY&jump=N
// GET /api/travellermap/search?q=QUERY
// GET /api/travellermap/subsector?sector=NAME&subsector=A-P
```

### Stage 2: Auto-Populate System Data

**Goal:** When GM sets campaign location, fetch and populate contacts

**Socket Handler:** `ops:setSystemLocation`

```javascript
socket.on('ops:setSystemLocation', async ({ sector, hex }) => {
  // 1. Fetch world data from TravellerMap
  const worldData = await fetchTravellerMapWorld(sector, hex);

  // 2. Convert to contact format
  const contacts = convertToContacts(worldData);

  // 3. Clear existing celestial contacts, add new ones
  operations.clearCelestialContacts(campaignId);
  contacts.forEach(c => operations.addContact(campaignId, c));

  // 4. Update campaign system name
  operations.updateCampaign(campaignId, { current_system: worldData.Name });

  // 5. Broadcast to clients
  io.to(`ops:campaign:${campaignId}`).emit('ops:systemChanged', { worldData, contacts });
});
```

### Stage 3: Astrogator Jump Map

**Goal:** Show interactive map of jump destinations in astrogator panel

**UI Component:**
- Embed jump map image: `https://travellermap.com/api/jumpmap?sector=X&hex=XXYY&jump=2&style=poster`
- Overlay clickable world markers
- Click world → show UWP tooltip + "Plot Jump" button

**Files:** `app.js` (renderAstrogatorPanel), `styles.css`

### Stage 4: World Search & Browser

**Goal:** GM can search for worlds, browse subsectors

**UI Component:**
- Search box in GM setup or campaign settings
- Results show world name, UWP, location
- Click to set as current system
- Optional: mini-map preview

---

## Data Mapping

### TravellerMap → Contact Conversion

```javascript
function convertWorldToContact(tmWorld) {
  return {
    name: tmWorld.Name,
    type: 'Planet',
    uwp: tmWorld.UWP,
    tradeCodes: parseTradeCodes(tmWorld.Remarks),
    stellar_class: tmWorld.Stellar,
    gm_notes: `Pop: ${tmWorld.PBG[0]}×10^${tmWorld.PBG[0]} | Bases: ${tmWorld.Bases || 'None'}`,
    celestial: true,
    wikiUrl: `https://wiki.travellerrpg.com/${encodeURIComponent(tmWorld.Name)}_(world)`
  };
}
```

### Jump Worlds → Destination List

```javascript
function formatJumpDestinations(jumpWorlds, currentHex) {
  return jumpWorlds.map(w => ({
    name: w.Name,
    hex: w.Hex,
    uwp: w.UWP,
    distance: calculateJumpDistance(currentHex, w.Hex),
    tradeCodes: w.Remarks,
    allegiance: w.Allegiance
  })).sort((a, b) => a.distance - b.distance);
}
```

---

## Map Embedding Options

### Style Options
- `poster` - Full color, detailed
- `atlas` - Print-friendly
- `candy` - High contrast
- `terminal` - Retro green/amber (fits Operations VTT theme!)

### URL Template for Jump Maps
```
https://travellermap.com/api/jumpmap?
  sector=Spinward%20Marches&
  hex=1910&
  jump=2&
  scale=48&
  style=terminal&
  options=9287
```

### Embedding in HTML
```html
<img src="/api/travellermap/jumpmap?sector=Spinward%20Marches&hex=1910&jump=2"
     alt="Jump destinations from Regina"
     class="jump-map">
```

---

## Caching Strategy

1. **Server-side cache:** Store fetched world data in SQLite or memory
2. **Cache duration:** 24 hours (data rarely changes)
3. **Cache key:** `travellermap:${sector}:${hex}`
4. **Invalidation:** Manual GM action or TTL expiry

---

## Error Handling

- Unknown world → Show message, allow manual entry
- API timeout → Retry once, then show cached data if available
- Invalid coordinates → Validate before API call

---

## Dependencies

- `node-fetch` or built-in `fetch` (Node 18+)
- No client-side dependencies (images are direct URLs)

---

## Testing

1. Unit test: Proxy endpoints return correct data
2. Unit test: Data conversion functions
3. Integration test: Full flow from GM action to client update
4. Manual test: Visual verification of map embedding

---

## Future Enhancements

- Offline mode: Pre-download Spinward Marches sector data
- Trade route visualization
- Allegiance color coding
- Historical data (different milieux)
