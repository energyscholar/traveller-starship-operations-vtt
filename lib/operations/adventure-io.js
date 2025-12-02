/**
 * Adventure Import/Export Module (Autorun 7)
 * Export/Import adventure prep content as JSON
 * Precursor to .tvadv file format
 */

const { db, generateId } = require('./database');
const reveals = require('./reveals');
const npcDossiers = require('./npc-dossiers');
const locations = require('./locations');
const events = require('./events');
const handouts = require('./handouts');
const mail = require('./mail');

// Get campaign info
function getCampaign(campaignId) {
  const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  return stmt.get(campaignId);
}

/**
 * Export all prep content for a campaign to JSON
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Adventure package data
 */
function exportAdventure(campaignId) {
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const revealsData = reveals.getRevealsByCampaign(campaignId);
  const npcsData = npcDossiers.getNPCDossiersByCampaign(campaignId);
  const locationsData = locations.getLocationsByCampaign(campaignId);
  const eventsData = events.getEventsByCampaign(campaignId);
  const handoutsData = handouts.getHandoutsByCampaign(campaignId);
  const draftsData = mail.getDrafts(campaignId);
  const queuedData = mail.getQueuedEmails(campaignId);

  return {
    manifest: {
      version: '1.0',
      format: 'tvadv-json',
      campaignName: campaign.name,
      exportedAt: new Date().toISOString(),
      contentCounts: {
        reveals: revealsData.length,
        npcs: npcsData.length,
        locations: locationsData.length,
        events: eventsData.length,
        handouts: handoutsData.length,
        emails: draftsData.length + queuedData.length
      }
    },
    reveals: revealsData,
    npcs: npcsData,
    locations: locationsData,
    events: eventsData,
    handouts: handoutsData,
    emails: [...draftsData, ...queuedData]
  };
}

/**
 * Remap array of IDs using idMap
 */
function remapIdArray(arr, idMap) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(id => idMap.get(id) || id);
}

/**
 * Import adventure content from JSON into a campaign
 * Handles ID remapping for references between entities
 * @param {string} campaignId - Target campaign ID
 * @param {Object} adventureData - Adventure package data
 * @returns {Object} Import result with counts and ID mapping
 */
function importAdventure(campaignId, adventureData) {
  const idMap = new Map(); // Old ID -> New ID

  // Validate campaign exists
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const imported = {
    locations: 0,
    handouts: 0,
    npcs: 0,
    reveals: 0,
    events: 0,
    emails: 0
  };

  // 1. Import locations first (NPCs reference them)
  if (adventureData.locations) {
    for (const loc of adventureData.locations) {
      const oldId = loc.id;
      // Remove id and campaign_id for fresh creation
      const { id, campaign_id, ...locData } = loc;
      const newLoc = locations.createLocation(campaignId, {
        name: locData.name,
        locationType: locData.location_type,
        parentId: idMap.get(locData.parent_id) || null, // Remap parent
        descriptionGm: locData.description_gm,
        descriptionPlayers: locData.description_players,
        atmosphere: locData.atmosphere,
        connectedTo: locData.connected_to || [],
        mapUrl: locData.map_url,
        hazards: locData.hazards || [],
        npcsPresent: [], // Will be populated after NPCs imported
        uwp: locData.uwp,
        tradeCodes: locData.trade_codes,
        tags: locData.tags || [],
        notes: locData.notes
      });
      idMap.set(oldId, newLoc.id);
      imported.locations++;
    }
  }

  // 2. Import handouts (reveals reference them)
  if (adventureData.handouts) {
    for (const handout of adventureData.handouts) {
      const oldId = handout.id;
      const { id, campaign_id, ...hData } = handout;
      const newHandout = handouts.createHandout(campaignId, {
        title: hData.title,
        handoutType: hData.handout_type,
        contentText: hData.content_text,
        fileUrl: hData.file_url,
        tags: hData.tags || [],
        notes: hData.notes
      });
      idMap.set(oldId, newHandout.id);
      imported.handouts++;
    }
  }

  // 3. Import NPCs (with location remapping)
  if (adventureData.npcs) {
    for (const npc of adventureData.npcs) {
      const oldId = npc.id;
      const { id, campaign_id, ...npcData } = npc;
      const newNPC = npcDossiers.createNPCDossier(campaignId, {
        name: npcData.name,
        title: npcData.title,
        role: npcData.role,
        portraitUrl: npcData.portrait_url,
        stats: npcData.stats,
        skills: npcData.skills,
        personality: npcData.personality,
        motivationPublic: npcData.motivation_public,
        motivationHidden: npcData.motivation_hidden,
        background: npcData.background,
        locationId: idMap.get(npcData.location_id) || null,
        locationText: npcData.location_text,
        currentStatus: npcData.current_status || 'alive',
        knownAs: npcData.known_as || [],
        tags: npcData.tags || [],
        notes: npcData.notes
      });
      idMap.set(oldId, newNPC.id);
      imported.npcs++;
    }
  }

  // 4. Import reveals (with handout remapping)
  if (adventureData.reveals) {
    for (const reveal of adventureData.reveals) {
      const oldId = reveal.id;
      const { id, campaign_id, ...rData } = reveal;
      const newReveal = reveals.createReveal(campaignId, {
        title: rData.title,
        category: rData.category,
        summary: rData.summary,
        fullText: rData.full_text,
        handoutId: idMap.get(rData.handout_id) || null,
        triggerType: rData.trigger_type,
        triggerValue: rData.trigger_value,
        orderIndex: rData.order_index || 0,
        tags: rData.tags || []
      });
      idMap.set(oldId, newReveal.id);
      imported.reveals++;
    }
  }

  // 5. Import events (with cascade remapping)
  if (adventureData.events) {
    for (const event of adventureData.events) {
      const oldId = event.id;
      const { id, campaign_id, ...eData } = event;
      const newEvent = events.createEvent(campaignId, {
        name: eData.name,
        eventType: eData.event_type,
        triggerDate: eData.trigger_date,
        triggerCondition: eData.trigger_condition,
        triggerEventId: idMap.get(eData.trigger_event_id) || null,
        description: eData.description,
        playerText: eData.player_text,
        revealsToTrigger: remapIdArray(eData.reveals_to_trigger, idMap),
        emailsToSend: remapIdArray(eData.emails_to_send, idMap),
        npcsToReveal: remapIdArray(eData.npcs_to_reveal, idMap),
        tags: eData.tags || [],
        notes: eData.notes
      });
      idMap.set(oldId, newEvent.id);
      imported.events++;
    }
  }

  // 6. Import emails
  if (adventureData.emails) {
    for (const email of adventureData.emails) {
      const oldId = email.id;
      const { id, campaign_id, ...mData } = email;
      const newMail = mail.saveDraft(campaignId, {
        senderName: mData.sender_name,
        senderType: mData.sender_type,
        recipientId: mData.recipient_id,
        recipientType: mData.recipient_type,
        subject: mData.subject,
        body: mData.body,
        priority: mData.priority,
        queuedForDate: mData.queued_for_date,
        triggerEventId: idMap.get(mData.trigger_event_id) || null
      });
      idMap.set(oldId, newMail.id);
      imported.emails++;
    }
  }

  return {
    success: true,
    imported,
    idMap: Object.fromEntries(idMap)
  };
}

module.exports = {
  exportAdventure,
  importAdventure
};
