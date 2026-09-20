import { Consignment } from '../lib/types';

export const INITIAL_CONSIGNMENTS: Consignment[] = [
  {
    trackingId: 'TRK-2026-89420',
    status: 'IN_TRANSIT',
    createdAt: '2026-09-14T08:30:00Z',
    estimatedDelivery: '2026-09-18T17:00:00Z',
    transportMode: 'AIR_FREIGHT',
    serviceTier: 'EXPRESS_PRIORITY',
    sender: {
      name: 'Kenji Takahashi',
      company: 'Nippon Precision Optics Co.',
      address: '2-11-8 Shinagawa Tech Park',
      city: 'Tokyo',
      country: 'Japan',
      phone: '+81 3 5555 0192',
      email: 'dispatch@nippon-optics.jp'
    },
    receiver: {
      name: 'Dr. Sarah Jenkins',
      company: 'Metro Health Technologies',
      address: '450 Lexington Ave, Suite 1400',
      city: 'New York',
      country: 'United States',
      phone: '+1 212 555 0184',
      email: 'logistics@metrohealth.org'
    },
    packageDetails: {
      description: 'Laser Diagnostic Imaging Modules & Calibration Sensors',
      category: 'Medical Electronics',
      pieceCount: 3,
      weightKg: 42.5,
      dimensionsCm: {
        length: 75,
        width: 55,
        height: 48
      },
      declaredValue: {
        amount: 86500,
        currency: 'USD'
      },
      isFragile: true,
      temperatureControlled: true,
      specialHandling: 'Handle with extreme care. Keep between 15°C and 25°C. Do not stack.'
    },
    carrier: {
      name: 'Navithon Global Air Cargo',
      serviceCode: 'NVT-AIR-PRIO',
      flightOrVesselNo: 'NVT-804'
    },
    originLocation: 'Tokyo (HND), Japan',
    destinationLocation: 'New York (JFK), United States',
    currentLocation: 'Anchorage Air Cargo Transshipment Hub (ANC), AK',
    signatureRequired: true,
    notes: 'Priority medical cargo with expedited customs pre-clearance status.',
    checkpoints: [
      {
        id: 'cp-01',
        timestamp: '2026-09-14T08:30:00Z',
        status: 'ORDER_CREATED',
        title: 'Shipment Order Created & Electronic AWB Issued',
        location: 'Tokyo, Japan',
        description: 'Electronic shipping order registered by shipper. Consignment ID and waybill barcode generated.',
        facility: 'Navithon Tokyo Airfreight Hub'
      },
      {
        id: 'cp-02',
        timestamp: '2026-09-14T14:15:00Z',
        status: 'RECEIVED_AT_FACILITY',
        title: 'Consignment Received at Origin Cargo Terminal',
        location: 'Haneda International Airport (HND), Tokyo, Japan',
        description: 'Physical packages received, weighed, inspected, and containerized into ULD #AKE-94022.',
        facility: 'HND Cargo Terminal 3'
      },
      {
        id: 'cp-03',
        timestamp: '2026-09-15T02:40:00Z',
        status: 'DEPARTED_FACILITY',
        title: 'Flight Departed Origin Hub',
        location: 'Tokyo (HND), Japan',
        description: 'Loaded onto flight NVT-804. Wheels up direct transit to North America hub.',
        facility: 'Runway 16R HND'
      },
      {
        id: 'cp-04',
        timestamp: '2026-09-16T11:20:00Z',
        status: 'IN_TRANSIT',
        title: 'Arrived at Polar Transshipment Hub & Fuel Transit',
        location: 'Ted Stevens International Airport (ANC), Anchorage, Alaska',
        description: 'Aircraft refueled. Temperature logs verified stable at 18.2°C. Next leg cleared for New York JFK.',
        facility: 'ANC Navithon Logistics Gate 14'
      }
    ]
  },
  {
    trackingId: 'EXP-7729-LON-NYC',
    status: 'OUT_FOR_DELIVERY',
    createdAt: '2026-09-15T10:00:00Z',
    estimatedDelivery: '2026-09-17T18:30:00Z',
    transportMode: 'AIR_FREIGHT',
    serviceTier: 'EXPRESS_PRIORITY',
    sender: {
      name: 'Oliver Sterling',
      company: 'Mayfair Horology Guild Ltd.',
      address: '14 New Bond Street',
      city: 'London',
      country: 'United Kingdom',
      phone: '+44 20 7946 0912',
      email: 'courier@mayfairhorology.co.uk'
    },
    receiver: {
      name: 'Eleanor Vance',
      company: 'Vance Private Vaults',
      address: '767 5th Ave, Floor 32',
      city: 'New York',
      country: 'United States',
      phone: '+1 212 555 0891',
      email: 'security@vancevaults.com'
    },
    packageDetails: {
      description: 'Secured Chronometer Master Pieces & Sapphire Crystals',
      category: 'High Value Luxury',
      pieceCount: 1,
      weightKg: 6.8,
      dimensionsCm: {
        length: 35,
        width: 30,
        height: 25
      },
      declaredValue: {
        amount: 140000,
        currency: 'USD'
      },
      isFragile: true,
      temperatureControlled: false,
      specialHandling: 'Armored transport protocol. Tamper-evident seals intact.'
    },
    carrier: {
      name: 'Navithon Express Courier',
      serviceCode: 'EXP-SAME-DAY',
      flightOrVesselNo: 'BA-178'
    },
    originLocation: 'London (LHR), United Kingdom',
    destinationLocation: 'New York (JFK), United States',
    currentLocation: 'Manhattan Distribution Depot, NY',
    signatureRequired: true,
    notes: 'Direct door-to-door escort delivery with verified photo identification requirement.',
    checkpoints: [
      {
        id: 'cp-10',
        timestamp: '2026-09-15T10:00:00Z',
        status: 'ORDER_CREATED',
        title: 'High-Value Consignment Dispatched',
        location: 'London, United Kingdom',
        description: 'Shipper secured packaging and generated encrypted digital waybill.',
        facility: 'Mayfair Dispatch Desk'
      },
      {
        id: 'cp-11',
        timestamp: '2026-09-15T16:00:00Z',
        status: 'RECEIVED_AT_FACILITY',
        title: 'Cleared Security at London Heathrow (LHR)',
        location: 'Heathrow Airport, London, UK',
        description: 'X-ray and dual-officer chain of custody verified.',
        facility: 'LHR Navithon Courier Gateway'
      },
      {
        id: 'cp-12',
        timestamp: '2026-09-16T08:30:00Z',
        status: 'CUSTOMS_CLEARANCE',
        title: 'US Customs & Border Protection Clearance Completed',
        location: 'JFK International Airport, New York, USA',
        description: 'Formal import documentation accepted. Customs duties cleared.',
        facility: 'JFK Air Freight Clearance Zone'
      },
      {
        id: 'cp-13',
        timestamp: '2026-09-17T08:15:00Z',
        status: 'OUT_FOR_DELIVERY',
        title: 'Out for Delivery with Armored Courier Unit',
        location: 'Midtown Manhattan, New York, USA',
        description: 'Consignment loaded onto Secure Unit #42. Estimated delivery before 18:30 EST today.',
        facility: 'Navithon Manhattan Central Hub'
      }
    ]
  },
  {
    trackingId: 'SEA-4011-SHA-ROT',
    status: 'CUSTOMS_CLEARANCE',
    createdAt: '2026-08-28T09:00:00Z',
    estimatedDelivery: '2026-09-22T14:00:00Z',
    transportMode: 'OCEAN_CARGO',
    serviceTier: 'STANDARD_CARGO',
    sender: {
      name: 'Zhang Wei',
      company: 'Eastern Precision Robotics Corp',
      address: 'Block 4, Pudong Industrial Free Trade Zone',
      city: 'Shanghai',
      country: 'China',
      phone: '+86 21 8892 4110',
      email: 'shipping@easternrobotics.cn'
    },
    receiver: {
      name: 'Henrik van Dijk',
      company: 'EuroMechatronics B.V.',
      address: 'Maasvlakte Industrial Blvd 102',
      city: 'Rotterdam',
      country: 'Netherlands',
      phone: '+31 10 409 7780',
      email: 'inbound@euromechatronics.nl'
    },
    packageDetails: {
      description: 'Standard 40ft High-Cube Container: Automated Servo Motors & Drives',
      category: 'Heavy Industrial Machinery',
      pieceCount: 140,
      weightKg: 18450,
      dimensionsCm: {
        length: 1219,
        width: 244,
        height: 289
      },
      declaredValue: {
        amount: 320000,
        currency: 'EUR'
      },
      isFragile: false,
      temperatureControlled: false,
      specialHandling: 'Standard ISO container strapping. Heavy lift equipment required at berth.'
    },
    carrier: {
      name: 'Navithon Maritime Express',
      serviceCode: 'SEA-OCN-LCL',
      flightOrVesselNo: 'MV Pacific Titan',
      containerNo: 'NVTU-984420-1'
    },
    originLocation: 'Shanghai Port (SHA), China',
    destinationLocation: 'Port of Rotterdam (RTM), Netherlands',
    currentLocation: 'Port of Rotterdam Customs Inspection Terminal, Netherlands',
    signatureRequired: true,
    notes: 'Maritime Bill of Lading BL-SHA-ROT-8831. VAT deferment account linked.',
    checkpoints: [
      {
        id: 'cp-20',
        timestamp: '2026-08-28T09:00:00Z',
        status: 'ORDER_CREATED',
        title: 'Booking Confirmed & Container Sealed',
        location: 'Shanghai, China',
        description: 'Container sealed with ISO 17712 high-security seal #CN-883011.',
        facility: 'Yangshan Deepwater Port Gate 3'
      },
      {
        id: 'cp-21',
        timestamp: '2026-08-31T18:00:00Z',
        status: 'DEPARTED_FACILITY',
        title: 'Vessel Departed Origin Port',
        location: 'Shanghai Port, China',
        description: 'Vessel MV Pacific Titan commenced ocean voyage via Suez Route.',
        facility: 'Yangshan Berth 7'
      },
      {
        id: 'cp-22',
        timestamp: '2026-09-16T22:00:00Z',
        status: 'RECEIVED_AT_FACILITY',
        title: 'Vessel Berthed at Destination Port',
        location: 'Port of Rotterdam, Netherlands',
        description: 'Container discharged safely to quayside automated guided vehicle.',
        facility: 'APM Terminals Maasvlakte II'
      },
      {
        id: 'cp-23',
        timestamp: '2026-09-17T07:30:00Z',
        status: 'CUSTOMS_CLEARANCE',
        title: 'EU Import Customs Declaration in Process',
        location: 'Rotterdam, Netherlands',
        description: 'Single Administrative Document (SAD) submitted to Dutch Customs. Awaiting green lane release.',
        facility: 'Customs Terminal Maasvlakte'
      }
    ]
  },
  {
    trackingId: 'NVT-9104-BER-PAR',
    status: 'DELIVERED',
    createdAt: '2026-09-12T07:00:00Z',
    estimatedDelivery: '2026-09-13T16:00:00Z',
    actualDelivery: '2026-09-13T15:24:00Z',
    transportMode: 'ROAD_EXPRESS',
    serviceTier: 'EXPRESS_PRIORITY',
    sender: {
      name: 'Klaus Mueller',
      company: 'BioPharma Systems GmbH',
      address: 'Kurfuerstendamm 218',
      city: 'Berlin',
      country: 'Germany',
      phone: '+49 30 901820',
      email: 'coldchain@biopharma-berlin.de'
    },
    receiver: {
      name: 'Dr. Henri Laurent',
      company: 'Institut Pasteur',
      address: '28 Rue du Docteur Roux',
      city: 'Paris',
      country: 'France',
      phone: '+33 1 45 68 80 00',
      email: 'pharma.reception@pasteur.fr'
    },
    packageDetails: {
      description: 'Cryogenic Biological Samples & Temperature Monitor',
      category: 'Pharmaceutical',
      pieceCount: 2,
      weightKg: 14.2,
      dimensionsCm: {
        length: 50,
        width: 40,
        height: 40
      },
      declaredValue: {
        amount: 52000,
        currency: 'EUR'
      },
      isFragile: true,
      temperatureControlled: true,
      specialHandling: 'Dry ice packaging. Continuous GPS and thermal telemetry active.'
    },
    carrier: {
      name: 'Navithon EuroRoad Priority Fleet',
      serviceCode: 'ROAD-EXP-COLD',
      flightOrVesselNo: 'TRUCK-EU-441'
    },
    originLocation: 'Berlin, Germany',
    destinationLocation: 'Paris, France',
    currentLocation: 'Delivered at Institut Pasteur, Paris',
    signedBy: 'Dr. Henri Laurent (Badge #8839)',
    signatureRequired: true,
    notes: 'Delivered in full, temperature compliance verified (-78.5°C throughout transit).',
    checkpoints: [
      {
        id: 'cp-30',
        timestamp: '2026-09-12T07:00:00Z',
        status: 'ORDER_CREATED',
        title: 'Cold-Chain Dispatch Initiated',
        location: 'Berlin, Germany',
        description: 'Cryotank sealed and validated by lab personnel.',
        facility: 'BioPharma Berlin Cleanroom'
      },
      {
        id: 'cp-31',
        timestamp: '2026-09-12T19:40:00Z',
        status: 'IN_TRANSIT',
        title: 'Cross-Border Transit Cleared',
        location: 'Strasbourg Cross-Border Hub, France',
        description: 'Telemetry log verified. Secondary driver rotation executed for non-stop express.',
        facility: 'Strasbourg Logistics Hub'
      },
      {
        id: 'cp-32',
        timestamp: '2026-09-13T10:00:00Z',
        status: 'OUT_FOR_DELIVERY',
        title: 'Dispatched for Final Delivery in Greater Paris',
        location: 'Paris, France',
        description: 'Final mile courier with specialized refrigeration van en route.',
        facility: 'Navithon Paris South Depot'
      },
      {
        id: 'cp-33',
        timestamp: '2026-09-13T15:24:00Z',
        status: 'DELIVERED',
        title: 'Consignment Successfully Delivered & Signed',
        location: 'Paris, France',
        description: 'Handed over directly to authorized recipient Dr. Henri Laurent. Formal proof of delivery recorded.',
        facility: 'Institut Pasteur Main Reception'
      }
    ]
  },
  {
    trackingId: 'CNS-5532-DXB-FRA',
    status: 'RECEIVED_AT_FACILITY',
    createdAt: '2026-09-17T06:00:00Z',
    estimatedDelivery: '2026-09-20T12:00:00Z',
    transportMode: 'AIR_FREIGHT',
    serviceTier: 'SECURE_DIPLOMATIC',
    sender: {
      name: 'Ahmed Al-Mansoor',
      company: 'Gulf Aviation Spares LLC',
      address: 'Dubai South Aviation City, Warehouse D4',
      city: 'Dubai',
      country: 'United Arab Emirates',
      phone: '+971 4 814 0000',
      email: 'aero@gulfspares.ae'
    },
    receiver: {
      name: 'Gerhard Becker',
      company: 'Lufthansa Technik Frankfurt',
      address: 'Flughafen Frankfurt, Halle 5',
      city: 'Frankfurt am Main',
      country: 'Germany',
      phone: '+49 69 6960',
      email: 'spares.inbound@lh-technik.de'
    },
    packageDetails: {
      description: 'Critical Aircraft Turbine Blades (AOG - Aircraft On Ground)',
      category: 'Aerospace Spares',
      pieceCount: 4,
      weightKg: 68.0,
      dimensionsCm: {
        length: 90,
        width: 60,
        height: 50
      },
      declaredValue: {
        amount: 195000,
        currency: 'USD'
      },
      isFragile: true,
      temperatureControlled: false,
      specialHandling: 'AOG Emergency Critical - top loading priority.'
    },
    carrier: {
      name: 'Navithon Air International',
      serviceCode: 'NVT-AOG-PRIORITY',
      flightOrVesselNo: 'EK-047'
    },
    originLocation: 'Dubai World Central (DWC), UAE',
    destinationLocation: 'Frankfurt Airport (FRA), Germany',
    currentLocation: 'Dubai Cargo Mega Terminal, UAE',
    signatureRequired: true,
    notes: 'AOG expedited flight departure scheduled for 22:45 tonight.',
    checkpoints: [
      {
        id: 'cp-40',
        timestamp: '2026-09-17T06:00:00Z',
        status: 'ORDER_CREATED',
        title: 'Emergency AOG Consignment Registered',
        location: 'Dubai, UAE',
        description: 'Airway bill registered with highest ramp loading priority code.',
        facility: 'Dubai South Aviation Operations'
      },
      {
        id: 'cp-41',
        timestamp: '2026-09-17T13:30:00Z',
        status: 'RECEIVED_AT_FACILITY',
        title: 'Received and Cleared at Dubai Cargo Terminal',
        location: 'Dubai World Central (DWC), UAE',
        description: 'Cargo screened, measured, and palletized for widebody cargo hold.',
        facility: 'DWC Mega Terminal Bay 9'
      }
    ]
  }
];
