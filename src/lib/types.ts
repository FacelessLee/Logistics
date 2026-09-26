export type ShipmentStatus =
  | 'ORDER_CREATED'
  | 'RECEIVED_AT_FACILITY'
  | 'DEPARTED_FACILITY'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION_ON_HOLD';

export type TransportMode =
  | 'AIR_FREIGHT'
  | 'OCEAN_CARGO'
  | 'ROAD_EXPRESS'
  | 'RAIL_FREIGHT';

export type ServiceTier =
  | 'EXPRESS_PRIORITY'
  | 'STANDARD_CARGO'
  | 'ECONOMY_FREIGHT'
  | 'SECURE_DIPLOMATIC';

export interface Checkpoint {
  id: string;
  timestamp: string; // ISO 8601
  status: ShipmentStatus;
  title: string;
  location: string;
  description: string;
  facility?: string;
}

export interface PartyDetails {
  name: string;
  company?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}

export interface PackageDetails {
  description: string;
  category: string;
  pieceCount: number;
  weightKg: number;
  dimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue?: {
    amount: number;
    currency: string;
  };
  isFragile?: boolean;
  temperatureControlled?: boolean;
  specialHandling?: string;
  packageImage?: string; // Base64 data URL or hosted image URL of the cargo
}

export interface CarrierDetails {
  name: string;
  serviceCode: string;
  flightOrVesselNo?: string;
  containerNo?: string;
}

export interface Consignment {
  trackingId: string;
  status: ShipmentStatus;
  createdAt: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  transportMode: TransportMode;
  serviceTier: ServiceTier;
  sender: PartyDetails;
  receiver: PartyDetails;
  packageDetails: PackageDetails;
  carrier: CarrierDetails;
  originLocation: string;
  destinationLocation: string;
  currentLocation: string;
  checkpoints: Checkpoint[];
  signedBy?: string;
  signatureRequired?: boolean;
  notes?: string;
}
