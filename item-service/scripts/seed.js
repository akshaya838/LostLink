// Seeds demo data THROUGH THE REST APIs (so it also exercises inter-service calls).
// Usage (run inside item-service/):
//   npm run seed -- http://localhost:5001 http://localhost:5002
//   npm run seed -- https://lostlink-item-service.onrender.com https://lostlink-claim-service.onrender.com
const axios = require('axios');

const ITEM = (process.argv[2] || 'http://localhost:5001').replace(/\/$/, '');
const CLAIM = (process.argv[3] || 'http://localhost:5002').replace(/\/$/, '');

const items = [
  { type: 'found', title: 'Blue Milton water bottle', description: 'Steel bottle with a Batman sticker on the cap.', category: 'Bottle', location: 'Central Library, 2nd floor', date: '2026-10-08', reporterName: 'Ravi Kumar', reporterEmail: 'ravi@college.edu' },
  { type: 'lost', title: 'Student ID card', description: 'ID card in a red lanyard, name Meena S, CSE 3rd year.', category: 'ID Card', location: 'Main canteen', date: '2026-10-09', reporterName: 'Meena S', reporterEmail: 'meena@college.edu', reporterPhone: '9876500001' },
  { type: 'found', title: 'boAt Airdopes case', description: 'Black earbuds case, no earbuds inside.', category: 'Electronics', location: 'Block C, Room 204', date: '2026-10-10', reporterName: 'Priya N', reporterEmail: 'priya@college.edu' },
  { type: 'lost', title: 'HP laptop charger', description: '65W HP charger with a yellow tape mark near the plug.', category: 'Electronics', location: 'Computer Lab 3', date: '2026-10-10', reporterName: 'Karthik V', reporterEmail: 'karthik@college.edu' },
  { type: 'found', title: 'Set of 3 keys with Totoro keychain', description: 'Two small keys and one bike key.', category: 'Keys', location: 'Parking lot near Gate 2', date: '2026-10-11', reporterName: 'Security Desk', reporterEmail: 'security@college.edu' },
  { type: 'lost', title: 'Data Structures textbook', description: 'Mark Allen Weiss, name written inside the cover.', category: 'Books', location: 'Seminar Hall', date: '2026-10-11', reporterName: 'Divya L', reporterEmail: 'divya@college.edu' },
  { type: 'found', title: 'Brown leather wallet', description: 'Contains some cash and a bus pass.', category: 'Wallet', location: 'Auditorium, Row F', date: '2026-10-12', reporterName: 'Arjun M', reporterEmail: 'arjun@college.edu' },
];

(async () => {
  try {
    const created = [];
    for (const it of items) {
      const { data } = await axios.post(`${ITEM}/api/items`, it, { timeout: 60000 });
      created.push(data.data);
      console.log('Item  +', data.data.title);
    }
    const bottle = created[0];
    const wallet = created[6];
    const c1 = await axios.post(`${CLAIM}/api/claims`, { itemId: bottle._id, claimantName: 'Arun P', claimantEmail: 'arun@college.edu', rollNumber: '22CS101', proofDescription: 'Batman sticker on cap, dent at the bottom.' });
    await axios.post(`${CLAIM}/api/claims`, { itemId: bottle._id, claimantName: 'Kavya R', claimantEmail: 'kavya@college.edu', proofDescription: 'I lost a blue bottle in the library.' });
    await axios.post(`${CLAIM}/api/claims`, { itemId: wallet._id, claimantName: 'Sanjay T', claimantEmail: 'sanjay@college.edu', proofDescription: 'Bus pass is in my name: Sanjay T, route 14.' });
    console.log('Claim + 3 claims created');
    await axios.patch(`${CLAIM}/api/claims/${c1.data.data._id}/approve`, { adminNote: 'Verified sticker' });
    console.log('Claim ✓ approved one claim (item marked claimed via Item Service)');
    console.log('\nDone.');
  } catch (err) {
    console.error('Seed failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
