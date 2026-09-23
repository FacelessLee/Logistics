/**
 * Comprehensive Idempotency & Persistence Checkpoint Test Suite
 * Tests:
 * 1. Zero demo data verification
 * 2. Consignment durable disk persistence
 * 3. Consignment creation idempotency
 * 4. Checkpoint addition & checkpoint idempotency
 * 5. Visitor chat creation & message persistence
 * 6. Visitor conversation idempotency
 * 7. Email outbox disk persistence
 */

const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const root = path.join(__dirname, '..');

// Import compiled or transpile-friendly functions from the project
async function runTests() {
  console.log('===============================================================');
  console.log(' NAVITHON LOGISTICS: IDEMPOTENCY & PERSISTENCE CHECKPOINT TEST ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  // --- Test 1: Zero Demo Data in Seed Arrays ---
  console.log('--- TEST GROUP 1: ZERO DEMO DATA AUDIT ---');
  const { INITIAL_CONSIGNMENTS } = require(path.join(root, 'src/data/initialConsignments.ts'));
  const { INITIAL_CONVERSATIONS } = require(path.join(root, 'src/data/initialChats.ts'));

  assert(
    Array.isArray(INITIAL_CONSIGNMENTS) && INITIAL_CONSIGNMENTS.length === 0,
    'INITIAL_CONSIGNMENTS must be strictly empty (zero demo data)',
    `Found ${INITIAL_CONSIGNMENTS.length} items`
  );

  assert(
    Array.isArray(INITIAL_CONVERSATIONS) && INITIAL_CONVERSATIONS.length === 0,
    'INITIAL_CONVERSATIONS must be strictly empty (zero demo data)',
    `Found ${INITIAL_CONVERSATIONS.length} items`
  );

  // --- Test 2: Consignment Storage & Persistence ---
  console.log('\n--- TEST GROUP 2: CONSIGNMENT STORAGE & PERSISTENCE ---');
  const storage = require(path.join(root, 'src/lib/storage.ts'));

  // Clean out any test state
  storage.resetToSeedData();
  const initialConsignments = storage.getAllConsignments();
  assert(initialConsignments.length === 0, 'Initial store is empty after reset');

  const testConsignment = {
    trackingId: 'TRK-VERIFY-99881',
    status: 'ORDER_CREATED',
    createdAt: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString(),
    transportMode: 'AIR_FREIGHT',
    serviceTier: 'EXPRESS_PRIORITY',
    sender: {
      name: 'Dr. Marcus Vance',
      company: 'Vance Bio-Tech Labs',
      address: '77 Silicon Way',
      city: 'Cambridge',
      country: 'United Kingdom',
      phone: '+44 1223 555 019',
      email: 'm.vance@vancebiotech.co.uk'
    },
    receiver: {
      name: 'Sarah Connor',
      company: 'Cyberdyne Systems Research',
      address: '2140 Tech Ridge Blvd',
      city: 'Austin',
      country: 'United States',
      phone: '+1 512 555 0177',
      email: 's.connor@cyberdyne.org'
    },
    packageDetails: {
      description: 'Cryogenic Peptide Reagent Vials',
      category: 'Pharmaceuticals',
      pieceCount: 2,
      weightKg: 8.5,
      declaredValue: { amount: 12000, currency: 'USD' },
      isFragile: true,
      temperatureControlled: true,
      specialHandling: 'Keep between 2°C and 8°C. Do not freeze.'
    },
    carrier: {
      name: 'Navithon Global Air Cargo',
      serviceCode: 'NVT-AIR-PRIO'
    },
    originLocation: 'Cambridge, United Kingdom',
    destinationLocation: 'Austin, United States',
    currentLocation: 'London Heathrow Gateway',
    signatureRequired: true,
    notes: 'Urgent medical trial delivery.',
    checkpoints: [
      {
        id: 'cp-init-1',
        timestamp: new Date().toISOString(),
        status: 'ORDER_CREATED',
        title: 'Consignment Registered',
        location: 'London Heathrow Gateway',
        description: 'Shipping instructions filed and Air Waybill generated.'
      }
    ]
  };

  const saved1 = storage.addConsignment(testConsignment);
  assert(saved1 && saved1.trackingId === 'TRK-VERIFY-99881', 'Consignment added successfully');

  // Verify file exists on disk
  const consignmentsFilePath = path.join(root, '.data', 'consignments.json');
  assert(fs.existsSync(consignmentsFilePath), '.data/consignments.json persisted to disk');

  const fileData = JSON.parse(fs.readFileSync(consignmentsFilePath, 'utf-8'));
  const foundInFile = fileData.find((c) => c.trackingId === 'TRK-VERIFY-99881');
  assert(foundInFile !== undefined, 'Consignment verified inside .data/consignments.json file');

  const retrieved = storage.getConsignmentById('TRK-VERIFY-99881');
  assert(retrieved !== undefined && retrieved.sender.name === 'Dr. Marcus Vance', 'Consignment retrievable by ID');

  // --- Test 3: Consignment Creation Idempotency ---
  console.log('\n--- TEST GROUP 3: CONSIGNMENT CREATION IDEMPOTENCY ---');
  // Attempting to re-add the exact same consignment
  const duplicateAttempt = storage.addConsignment(testConsignment);
  assert(
    duplicateAttempt.trackingId === 'TRK-VERIFY-99881',
    'Idempotent add returns original tracking ID without random suffixes'
  );

  const allConsignments = storage.getAllConsignments();
  assert(
    allConsignments.length === 1,
    'Store count remains 1 (no duplicates created on retry)',
    `Actual count: ${allConsignments.length}`
  );

  // --- Test 4: Checkpoint Addition & Idempotency ---
  console.log('\n--- TEST GROUP 4: CHECKPOINT IDEMPOTENCY ---');
  const checkpointPayload = {
    status: 'IN_TRANSIT',
    title: 'Customs Clearance Released',
    location: 'London Heathrow Air Cargo Inspection Gate',
    description: 'Cargo inspected and cleared by customs authorities.',
    facility: 'Heathrow Port Health & Cargo Terminal'
  };

  const withCp1 = storage.addCheckpointToConsignment('TRK-VERIFY-99881', checkpointPayload);
  assert(withCp1 && withCp1.checkpoints.length === 2, 'New checkpoint appended (total 2)');
  assert(withCp1.status === 'IN_TRANSIT', 'Consignment status transitioned to IN_TRANSIT');

  // Attempt duplicate checkpoint (same status, title, location)
  const withCpDuplicate = storage.addCheckpointToConsignment('TRK-VERIFY-99881', checkpointPayload);
  assert(
    withCpDuplicate && withCpDuplicate.checkpoints.length === 2,
    'Checkpoint idempotency passed: Duplicate checkpoint ignored, count stays 2'
  );

  // --- Test 5: Live Chat Persistence & Idempotency ---
  console.log('\n--- TEST GROUP 5: LIVE CHAT CRM PERSISTENCE & IDEMPOTENCY ---');
  const chatStorage = require(path.join(root, 'src/lib/chatStorage.ts'));

  const visitorSession = await chatStorage.getOrCreateVisitorConversation('vis-idempotency-test-01', {
    name: 'Carlos Mendez',
    email: 'carlos@mendezlogistics.es',
    company: 'Mendez Transportes SL',
    location: 'Madrid, Spain',
    currentPage: '/book'
  });

  assert(visitorSession.isNew === true, 'First visitor session creation marked isNew: true');
  assert(visitorSession.conversation.visitorName === 'Carlos Mendez', 'Visitor name stored');

  // Verify chat store on disk
  const chatStoreFilePath = path.join(root, '.data', 'chat-store.json');
  assert(fs.existsSync(chatStoreFilePath), '.data/chat-store.json persisted to disk');

  // Idempotency: re-access with same visitor ID
  const reVisitorSession = await chatStorage.getOrCreateVisitorConversation('vis-idempotency-test-01');
  assert(reVisitorSession.isNew === false, 'Subsequent session call returns existing conversation (isNew: false)');
  assert(
    reVisitorSession.conversation.id === visitorSession.conversation.id,
    'Conversation ID matches original (no duplicate conversation generated)'
  );

  // Add chat message
  const msgResult = await chatStorage.addChatMessage(visitorSession.conversation.id, {
    sender: 'visitor',
    senderName: 'Carlos Mendez',
    text: 'Hello dispatcher, confirming temperature logging for shipment TRK-VERIFY-99881.'
  });

  assert(msgResult && msgResult.message.text.includes('temperature logging'), 'Chat message appended');

  // Verify messages read back from disk
  const messages = await chatStorage.getMessagesForConversation(visitorSession.conversation.id);
  assert(messages.length >= 2, 'Messages retrieved from durable storage (welcome msg + visitor msg)');

  const conversations = await chatStorage.getAllConversations();
  const cFound = conversations.find((c) => c.visitorId === 'vis-idempotency-test-01');
  assert(cFound !== undefined, 'Conversation is visible in CRM conversations feed');

  // --- Test 6: Outbox Persistence ---
  console.log('\n--- TEST GROUP 6: EMAIL OUTBOX AUDIT & PERSISTENCE ---');
  const emailService = require(path.join(root, 'src/lib/emailService.ts'));

  emailService.logDispatchedEmail({
    id: 'test-outbox-msg-1',
    trackingId: 'TRK-VERIFY-99881',
    type: 'CONSIGNMENT_CONFIRMATION',
    to: ['m.vance@vancebiotech.co.uk', 's.connor@cyberdyne.org'],
    subject: '[Navithon Logistics] Consignment Registered - #TRK-VERIFY-99881',
    timestamp: new Date().toISOString(),
    success: true,
    resendId: 'resend_mock_id_123',
    hasAttachment: true
  });

  const outboxFilePath = path.join(root, '.data', 'outbox.json');
  assert(fs.existsSync(outboxFilePath), '.data/outbox.json persisted to disk');

  const outboxItems = emailService.getRecentDispatchedEmails('TRK-VERIFY-99881');
  assert(outboxItems.length > 0, 'Outbox items retrieved from disk for tracking ID');
  assert(outboxItems[0].hasAttachment === true, 'Outbox item confirms Waybill attachment');

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
