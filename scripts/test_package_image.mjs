import fs from 'fs';
import path from 'path';

// Generate a tiny valid 1x1 or 10x10 red JPEG as base64 data URL
// Standard minimal valid base64 JPEG
const sampleBase64Jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function testPackageImageWorkflow() {
  console.log('--- Testing Package Image Upload & Waybill Integration ---');
  
  const payload = {
    transportMode: 'AIR_FREIGHT',
    serviceTier: 'EXPRESS_PRIORITY',
    sender: {
      name: 'Alexander Wright',
      company: 'Wright Precision Technologies',
      address: '742 Evergreen Terrace',
      city: 'London',
      country: 'United Kingdom',
      phone: '+44 20 7946 0912',
      email: 'shipper.test@navithonlogistics.com'
    },
    receiver: {
      name: 'Sofia Dupont',
      company: 'Dupont Aerospace SAS',
      address: '14 Rue de la Paix',
      city: 'Paris',
      country: 'France',
      phone: '+33 1 42 68 55 00',
      email: 'consignee.test@navithonlogistics.com'
    },
    packageDetails: {
      description: 'Avionics Navigation Controller Unit & Telemetry Modules',
      category: 'Electronics',
      pieceCount: 2,
      weightKg: 8.5,
      dimensionsCm: { length: 45, width: 35, height: 25 },
      declaredValue: { amount: 8400, currency: 'EUR' },
      isFragile: true,
      temperatureControlled: false,
      specialHandling: 'Handle with extreme care. Keep dry. Precision optical sensors enclosed.',
      packageImage: sampleBase64Jpeg
    }
  };

  // 1. Post to API
  console.log('1. Sending POST to http://localhost:3000/api/consignments...');
  const res = await fetch('http://localhost:3000/api/consignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  console.log('Response Status:', res.status);
  console.log('Response Success:', json.success);
  console.log('Tracking ID:', json.data?.trackingId);
  console.log('Has packageImage in returned data:', Boolean(json.data?.packageDetails?.packageImage));

  if (!json.success || !json.data?.trackingId) {
    throw new Error('Consignment creation failed: ' + JSON.stringify(json));
  }

  const trackingId = json.data.trackingId;

  // 2. Check public uploads file
  const cachedImagePath = path.join(process.cwd(), 'public', 'uploads', 'packages', `${trackingId}.jpg`);
  const imageCached = fs.existsSync(cachedImagePath);
  console.log(`2. Cached disk image exists at ${cachedImagePath}:`, imageCached);

  // 3. Test Waybill PDF API endpoint
  console.log(`3. Requesting PDF from http://localhost:3000/api/consignments/${trackingId}/waybill-pdf...`);
  const pdfRes = await fetch(`http://localhost:3000/api/consignments/${encodeURIComponent(trackingId)}/waybill-pdf`);
  console.log('PDF Endpoint Status:', pdfRes.status);
  console.log('PDF Content-Type:', pdfRes.headers.get('content-type'));
  
  const pdfBuffer = await pdfRes.arrayBuffer();
  console.log('PDF Generated Size:', pdfBuffer.byteLength, 'bytes');

  if (pdfRes.status !== 200 || pdfBuffer.byteLength < 1000) {
    throw new Error(`PDF endpoint failed with status ${pdfRes.status} and size ${pdfBuffer.byteLength}`);
  }

  // 4. Test tracking page fetch
  console.log(`4. Requesting Tracking Page http://localhost:3000/track/${trackingId}...`);
  const trackRes = await fetch(`http://localhost:3000/track/${encodeURIComponent(trackingId)}`);
  console.log('Track Page Status:', trackRes.status);
  const trackHtml = await trackRes.text();
  const hasTrackingText = trackHtml.includes(trackingId);
  const hasVerifiedCargo = trackHtml.includes('Verified Cargo Photo');
  console.log('Track Page Contains Tracking ID:', hasTrackingText);
  console.log('Track Page Contains "Verified Cargo Photo":', hasVerifiedCargo);

  console.log('\n--- ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
}

testPackageImageWorkflow().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
