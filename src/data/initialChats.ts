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
    content: 'Could you please provide your Master Air Waybill (MAWB) or Navithon Tracking Code (e.g., TRK-...)? I will pull up live satellite telemetry immediately.'
  },
  {
    id: 'cr-3',
    title: 'Customs Clearance Update',
    shortcut: '/customs',
    category: 'CUSTOMS',
    content: 'Your consignment has been submitted to port customs authorities. Brokerage inspection is ongoing and release is expected within normal operational windows.'
  },
  {
    id: 'cr-4',
    title: 'Air Charter Capacity Notice',
    shortcut: '/charter',
    category: 'RATES',
    content: 'We currently have cargo slot capacity available on arterial air lanes. Would you like a formal rate quote with temperature-control options?'
  },
  {
    id: 'cr-5',
    title: 'Dispatch Resolution & Close',
    shortcut: '/resolve',
    category: 'CLOSING',
    content: 'Glad I could assist! Your consignment details have been logged in our operations dispatch system. Feel free to message here anytime if further updates are needed.'
  }
];

// Zero demo data - strictly real live visitor conversations
export const INITIAL_CONVERSATIONS: Conversation[] = [];
export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};
