import { Conversation, ChatMessage, CannedResponse } from '../lib/chatTypes';

export const INITIAL_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'cr-1',
    title: 'Warm Logistics Greeting',
    shortcut: '/hello',
    category: 'GREETING',
    content: 'Good day! This is David from Navithon Global Operations Desk. How can I assist you with your freight or supply chain today?'
  },
  {
    id: 'cr-2',
    title: 'Request Tracking ID',
    shortcut: '/track',
    category: 'TRACKING',
    content: 'Could you please provide your 10-digit Master Air Waybill (MAWB) or Navithon Tracking Code (e.g., NVT-882194)? I will pull up live satellite telemetry immediately.'
  },
  {
    id: 'cr-3',
    title: 'Customs Clearance Update',
    shortcut: '/customs',
    category: 'CUSTOMS',
    content: 'Your consignment has been submitted to local port customs authorities. In-house brokerage inspection is ongoing and clearance release is expected within 4 business hours.'
  },
  {
    id: 'cr-4',
    title: 'Air Charter Capacity Notice',
    shortcut: '/charter',
    category: 'RATES',
    content: 'We currently have widebody 777F cargo slot capacity available on Trans-Pacific and Asia-Europe arterial lanes. Would you like a formal rate quote with temperature-control options?'
  },
  {
    id: 'cr-5',
    title: 'Dispatch Resolution & Close',
    shortcut: '/resolve',
    category: 'CLOSING',
    content: 'Glad I could assist! Your consignment details have been logged in our operations dispatch system. Feel free to message here anytime if further updates are needed.'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-rotterdam-01',
    visitorId: 'vis-rotterdam-891',
    visitorName: 'Marc Van Der Berg',
    visitorEmail: 'm.vanderberg@vandenberg-machinery.nl',
    visitorCompany: 'Van Den Berg Heavy Machinery B.V.',
    visitorLocation: 'Rotterdam, Netherlands',
    currentPage: '/track?id=NVT-882194',
    status: 'ACTIVE',
    unreadCountAgent: 1,
    unreadCountVisitor: 0,
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    lastMessageText: 'Can you verify if our hydraulic crane units have cleared terminal customs at Rotterdam Port?',
    lastMessageTimestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    assignedAgent: 'David M. (Operations)',
    internalNotes: 'Client has 4x 40ft High Cube containers on Vessel CMA CGM Palais. Consignment NVT-882194.',
    linkedTrackingId: 'NVT-882194'
  },
  {
    id: 'conv-singapore-02',
    visitorId: 'vis-singapore-442',
    visitorName: 'Elena Rostova',
    visitorEmail: 'elena.rostova@aerotech-global.sg',
    visitorCompany: 'AeroTech Propulsion Systems',
    visitorLocation: 'Singapore (Changi Logistics Park)',
    currentPage: '/book',
    status: 'PENDING',
    unreadCountAgent: 0,
    unreadCountVisitor: 0,
    createdAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    lastMessageText: 'Understood. We are preparing the hazardous material lithium battery declaration sheets for the flight.',
    lastMessageTimestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    assignedAgent: 'David M. (Operations)',
    internalNotes: 'Dangerous Goods Class 9 freight scheduled for Frankfurt charter on Thursday.',
    linkedTrackingId: 'NVT-904312'
  },
  {
    id: 'conv-hamburg-03',
    visitorId: 'vis-hamburg-118',
    visitorName: 'Klaus Lindner',
    visitorEmail: 'k.lindner@hamburg-pharma.de',
    visitorCompany: 'Hanseatic Cold-Chain Pharma',
    visitorLocation: 'Hamburg, Germany',
    currentPage: '/',
    status: 'RESOLVED',
    unreadCountAgent: 0,
    unreadCountVisitor: 0,
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    lastMessageText: 'Thank you David, electronic Proof of Delivery (e-POD) received with cold-chain sensor log verified.',
    lastMessageTimestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    assignedAgent: 'David M. (Operations)',
    internalNotes: 'Pharma shipment verified at 2°C - 8°C range. Delivered and signed.',
    linkedTrackingId: 'NVT-551980'
  }
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-rotterdam-01': [
    {
      id: 'msg-r-1',
      conversationId: 'conv-rotterdam-01',
      sender: 'visitor',
      senderName: 'Marc Van Der Berg',
      text: 'Good afternoon. I am checking on the ETA for our machinery shipment NVT-882194 into Rotterdam.',
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-r-2',
      conversationId: 'conv-rotterdam-01',
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: 'Hello Marc! Welcome to Navithon Operations. Let me cross-reference the vessel AIS telemetry and port customs status for NVT-882194.',
      timestamp: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-r-3',
      conversationId: 'conv-rotterdam-01',
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: 'Vessel docked at Maasvlakte II terminal at 06:40 CET. Discharge began on schedule.',
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-r-4',
      conversationId: 'conv-rotterdam-01',
      sender: 'visitor',
      senderName: 'Marc Van Der Berg',
      text: 'Can you verify if our hydraulic crane units have cleared terminal customs at Rotterdam Port?',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      read: false
    }
  ],
  'conv-singapore-02': [
    {
      id: 'msg-s-1',
      conversationId: 'conv-singapore-02',
      sender: 'visitor',
      senderName: 'Elena Rostova',
      text: 'Hi David, we need urgent charter space from Singapore to Frankfurt for avionics replacement assemblies.',
      timestamp: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-s-2',
      conversationId: 'conv-singapore-02',
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: 'Understood Elena. We have priority allocation on Lufthansa Cargo flight LH8411 departing SIN at 23:15 tomorrow. Will you require temperature-controlled loading or standard main deck?',
      timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-s-3',
      conversationId: 'conv-singapore-02',
      sender: 'visitor',
      senderName: 'Elena Rostova',
      text: 'Understood. We are preparing the hazardous material lithium battery declaration sheets for the flight.',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      read: true
    }
  ],
  'conv-hamburg-03': [
    {
      id: 'msg-h-1',
      conversationId: 'conv-hamburg-03',
      sender: 'visitor',
      senderName: 'Klaus Lindner',
      text: 'Hello, inquiring about release of temperature log for Pharma batch NVT-551980.',
      timestamp: new Date(Date.now() - 350 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-h-2',
      conversationId: 'conv-hamburg-03',
      sender: 'agent',
      senderName: 'David M. (Operations)',
      text: 'Hi Klaus, data logger report uploaded to the consignment file. Datalogger ID #TC-881 showed nominal +4.2°C throughout transport.',
      timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: 'msg-h-3',
      conversationId: 'conv-hamburg-03',
      sender: 'visitor',
      senderName: 'Klaus Lindner',
      text: 'Thank you David, electronic Proof of Delivery (e-POD) received with cold-chain sensor log verified.',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      read: true
    }
  ]
};
