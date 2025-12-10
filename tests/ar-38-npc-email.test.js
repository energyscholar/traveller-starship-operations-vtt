/**
 * AR-38: NPC Email System - TDD Tests
 * Focus: All NPC types (Patrons, Authorities, Ship Services)
 */

const { strict: assert } = require('assert');

function runTests(tests) {
  let passed = 0, failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

// === PATRON NPC TESTS ===

const patronTests = {
  'Patron sends job offer email': () => {
    const email = createPatronEmail('job_offer', {
      patronName: 'Marcus Vance',
      jobTitle: 'Cargo Run to Efate',
      payment: 50000
    });
    assert.equal(email.type, 'patron');
    assert.equal(email.subtype, 'job_offer');
    assert.ok(email.subject.includes('Job Opportunity'));
    assert.ok(email.body.includes('Marcus Vance'));
  },

  'Patron sends mission update email': () => {
    const email = createPatronEmail('mission_update', {
      patronName: 'Lady Sharurshid',
      update: 'Package pickup location changed to Startown warehouse.'
    });
    assert.equal(email.subtype, 'mission_update');
    assert.ok(email.body.includes('changed'));
  },

  'Patron sends payment confirmation': () => {
    const email = createPatronEmail('payment', {
      patronName: 'Oberlindes Lines',
      amount: 75000,
      jobReference: 'JOB-2024-0042'
    });
    assert.equal(email.subtype, 'payment');
    assert.ok(email.body.includes('75,000'));
    assert.ok(email.body.includes('Cr'));
  }
};

// === AUTHORITY NPC TESTS ===

const authorityTests = {
  'Starport control sends berthing assignment': () => {
    const email = createAuthorityEmail('berthing', {
      starportName: 'Regina Highport',
      berthNumber: 'B-42',
      duration: '7 days'
    });
    assert.equal(email.type, 'authority');
    assert.equal(email.subtype, 'berthing');
    assert.ok(email.from.includes('Authority'));
  },

  'Customs sends inspection notice': () => {
    const email = createAuthorityEmail('customs_inspection', {
      inspectionTime: '0800 local',
      requiredDocs: ['Manifest', 'Crew List', 'Insurance']
    });
    assert.equal(email.subtype, 'customs_inspection');
    assert.ok(email.body.includes('inspection'));
  },

  'Law enforcement sends warrant/fine notice': () => {
    const email = createAuthorityEmail('fine', {
      offense: 'Improper cargo declaration',
      amount: 5000,
      dueDate: '3 days'
    });
    assert.equal(email.subtype, 'fine');
    assert.ok(email.body.includes('5,000'));
    assert.ok(email.priority === 'high');
  },

  'Port authority sends departure clearance': () => {
    const email = createAuthorityEmail('departure_clearance', {
      starportName: 'Efate Downport',
      windowStart: '1400',
      windowEnd: '1600'
    });
    assert.equal(email.subtype, 'departure_clearance');
    assert.ok(email.body.includes('cleared for departure'));
  }
};

// === SHIP SERVICES NPC TESTS ===

const servicesTests = {
  'Fuel depot sends quote': () => {
    const email = createServicesEmail('fuel_quote', {
      companyName: 'Tukera Fuel Services',
      fuelType: 'refined',
      pricePerTon: 500,
      quantity: 40
    });
    assert.equal(email.type, 'services');
    assert.equal(email.subtype, 'fuel_quote');
    assert.ok(email.body.includes('refined'));
    assert.ok(email.body.includes('500'));
  },

  'Repair yard sends estimate': () => {
    const email = createServicesEmail('repair_estimate', {
      yardName: 'Highport Maintenance',
      repairs: ['Hull breach repair', 'Sensor calibration'],
      totalCost: 125000,
      timeEstimate: '5 days'
    });
    assert.equal(email.subtype, 'repair_estimate');
    assert.ok(email.body.includes('125,000'));
  },

  'Broker sends cargo listing': () => {
    const email = createServicesEmail('cargo_listing', {
      brokerName: 'Spinward Freight',
      cargo: 'Agricultural equipment',
      tons: 20,
      destination: 'Jenghe',
      payment: 40000
    });
    assert.equal(email.subtype, 'cargo_listing');
    assert.ok(email.body.includes('Agricultural'));
  },

  'Berth services sends invoice': () => {
    const email = createServicesEmail('berth_invoice', {
      facilityName: 'Regina Highport',
      days: 7,
      dailyRate: 100,
      total: 700
    });
    assert.equal(email.subtype, 'berth_invoice');
    assert.ok(email.body.includes('700'));
  }
};

// === EMAIL THREADING TESTS ===

const threadingTests = {
  'Reply email has correct thread ID': () => {
    const original = createPatronEmail('job_offer', { patronName: 'Test' });
    const reply = createReply(original, 'player', 'We accept the job.');
    assert.equal(reply.threadId, original.threadId);
    assert.equal(reply.inReplyTo, original.id);
  },

  'Thread maintains conversation order': () => {
    const original = createPatronEmail('job_offer', { patronName: 'Test' });
    const reply1 = createReply(original, 'player', 'What\'s the timeline?');
    const reply2 = createReply(reply1, 'npc', 'One week.');

    const thread = getThread(original.threadId);
    assert.equal(thread.length, 3);
    assert.equal(thread[0].id, original.id);
    assert.equal(thread[2].id, reply2.id);
  },

  'NPC response uses personality template': () => {
    const patron = createNPC('patron', {
      name: 'Count Vilis',
      personality: 'formal'
    });
    const response = generateNPCResponse(patron, 'greeting');
    assert.ok(response.body.includes('regards') || response.body.includes('Sir'));
  }
};

// === STUB IMPLEMENTATIONS ===

const emailStore = [];
const threadStore = {};
let emailCounter = 0;

function createPatronEmail(subtype, data) {
  let template;

  switch (subtype) {
    case 'job_offer':
      template = {
        subject: `Job Opportunity: ${data.jobTitle || 'New Mission'}`,
        body: `${data.patronName} has a job for you.\n\nPayment: ${data.payment ? formatCr(data.payment) : 'TBD'}\n\nReply to accept.`
      };
      break;
    case 'mission_update':
      template = {
        subject: 'Mission Update',
        body: `From ${data.patronName}:\n\n${data.update || ''}`
      };
      break;
    case 'payment':
      template = {
        subject: `Payment Received - ${data.jobReference}`,
        body: `${data.patronName} has transferred ${formatCr(data.amount)} to your account.\n\nReference: ${data.jobReference}`
      };
      break;
    default:
      template = { subject: 'Message', body: '' };
  }

  return createBaseEmail('patron', subtype, template, data.patronName);
}

function createAuthorityEmail(subtype, data) {
  let template;
  let priority = null;

  switch (subtype) {
    case 'berthing':
      template = {
        subject: `Berthing Assignment - ${data.berthNumber}`,
        body: `Welcome to ${data.starportName}.\n\nYou have been assigned berth ${data.berthNumber} for ${data.duration}.`
      };
      break;
    case 'customs_inspection':
      template = {
        subject: 'Customs Inspection Notice',
        body: `Your vessel is scheduled for inspection at ${data.inspectionTime}.\n\nRequired documents: ${data.requiredDocs.join(', ')}`
      };
      break;
    case 'fine':
      template = {
        subject: 'Official Notice - Fine Assessment',
        body: `Offense: ${data.offense}\n\nFine amount: ${formatCr(data.amount)}\nDue: ${data.dueDate}`
      };
      priority = 'high';
      break;
    case 'departure_clearance':
      template = {
        subject: 'Departure Clearance Granted',
        body: `Your vessel is cleared for departure from ${data.starportName}.\n\nWindow: ${data.windowStart} - ${data.windowEnd}`
      };
      break;
    default:
      template = { subject: 'Notice', body: '' };
  }

  const email = createBaseEmail('authority', subtype, template, `${data.starportName || 'Port'} Authority`);
  if (priority) email.priority = priority;
  return email;
}

function createServicesEmail(subtype, data) {
  let template;

  switch (subtype) {
    case 'fuel_quote':
      template = {
        subject: 'Fuel Quote',
        body: `${data.companyName} quote:\n\n${data.fuelType} fuel: ${formatCr(data.pricePerTon)}/ton\nQuantity: ${data.quantity} tons\nTotal: ${formatCr(data.pricePerTon * data.quantity)}`
      };
      break;
    case 'repair_estimate':
      template = {
        subject: 'Repair Estimate',
        body: `${data.yardName} estimate:\n\nRepairs:\n${data.repairs.map(r => `- ${r}`).join('\n')}\n\nTotal: ${formatCr(data.totalCost)}\nTime: ${data.timeEstimate}`
      };
      break;
    case 'cargo_listing':
      template = {
        subject: `Cargo Available: ${data.cargo}`,
        body: `${data.brokerName} listing:\n\nCargo: ${data.cargo}\nTons: ${data.tons}\nDestination: ${data.destination}\nPayment: ${formatCr(data.payment)}`
      };
      break;
    case 'berth_invoice':
      template = {
        subject: 'Berth Invoice',
        body: `${data.facilityName} invoice:\n\n${data.days} days @ ${formatCr(data.dailyRate)}/day\nTotal: ${formatCr(data.total)}`
      };
      break;
    default:
      template = { subject: 'Service Notice', body: '' };
  }

  return createBaseEmail('services', subtype, template, data.companyName || data.yardName || data.brokerName || data.facilityName);
}

function createBaseEmail(type, subtype, template, fromName) {
  const id = `email-${++emailCounter}`;
  const threadId = `thread-${emailCounter}`;

  const email = {
    id,
    threadId,
    type,
    subtype,
    from: fromName,
    subject: template.subject,
    body: template.body,
    timestamp: Date.now(),
    read: false
  };

  emailStore.push(email);
  threadStore[threadId] = [email];
  return email;
}

function createReply(originalEmail, senderType, body) {
  const id = `email-${++emailCounter}`;
  const reply = {
    id,
    threadId: originalEmail.threadId,
    inReplyTo: originalEmail.id,
    type: senderType,
    from: senderType === 'player' ? 'Player' : originalEmail.from,
    subject: `Re: ${originalEmail.subject}`,
    body,
    timestamp: Date.now()
  };

  emailStore.push(reply);
  threadStore[originalEmail.threadId].push(reply);
  return reply;
}

function getThread(threadId) {
  return threadStore[threadId] || [];
}

function createNPC(type, data) {
  return { type, ...data };
}

function generateNPCResponse(npc, context) {
  const formalGreetings = ['With regards,', 'Sir or Madam,', 'Respectfully,'];
  const body = npc.personality === 'formal'
    ? `Dear Captain,\n\n...\n\n${formalGreetings[0]}\n${npc.name}`
    : `Hey,\n\n...\n\n- ${npc.name}`;
  return { body };
}

function formatCr(amount) {
  return `Cr${amount.toLocaleString()}`;
}

// === RUN TESTS ===

console.log('=== AR-38 NPC Email System Tests ===\n');

console.log('--- Patron NPCs ---');
const patronPassed = runTests(patronTests);

console.log('\n--- Authority NPCs ---');
const authorityPassed = runTests(authorityTests);

console.log('\n--- Ship Services NPCs ---');
const servicesPassed = runTests(servicesTests);

console.log('\n--- Email Threading ---');
const threadingPassed = runTests(threadingTests);

console.log('\n==================================================');
const total = Object.keys(patronTests).length + Object.keys(authorityTests).length +
              Object.keys(servicesTests).length + Object.keys(threadingTests).length;
console.log(`Total: ${total} tests`);
const allPassed = patronPassed && authorityPassed && servicesPassed && threadingPassed;
console.log(allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED');
console.log('==================================================');

process.exit(allPassed ? 0 : 1);
