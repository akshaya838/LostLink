// Seeds demo data THROUGH THE REST APIs (so it also exercises inter-service calls).
// Usage (run inside item-service/):
//   npm run seed -- <itemUrl> <claimUrl> <userUrl> [adminEmail adminPassword]
// Example:
//   npm run seed -- https://lostlink-item-service.onrender.com https://lostlink-claim-service.onrender.com https://lostlink-user-service.onrender.com admin@college.edu yourAdminPassword
// Demo students all use the password: demo1234
const axios = require('axios');

const [ITEM, CLAIM, USER] = [2, 3, 4].map((i, n) =>
  (process.argv[i] || `http://localhost:${5001 + n}`).replace(/\/$/, '')
);
const ADMIN_EMAIL = process.argv[5];
const ADMIN_PASSWORD = process.argv[6];
const PASSWORD = 'demo1234';
const T = { timeout: 60000 };
const as = (token) => ({ ...T, headers: { Authorization: `Bearer ${token}` } });

const students = {
  ravi: { name: 'Ravi Kumar', email: 'ravi@college.edu', rollNumber: '22CS050' },
  meena: { name: 'Meena S', email: 'meena@college.edu', rollNumber: '22CS077', phone: '9876500001' },
  priya: { name: 'Priya N', email: 'priya@college.edu', rollNumber: '23EC012' },
  karthik: { name: 'Karthik V', email: 'karthik@college.edu', rollNumber: '22IT031' },
  divya: { name: 'Divya L', email: 'divya@college.edu', rollNumber: '22CS090' },
  arjun: { name: 'Arjun M', email: 'arjun@college.edu', rollNumber: '21ME007' },
  arun: { name: 'Arun P', email: 'arun@college.edu', rollNumber: '22CS101', phone: '9123456780' },
  kavya: { name: 'Kavya R', email: 'kavya@college.edu', rollNumber: '22CS114' },
  sanjay: { name: 'Sanjay T', email: 'sanjay@college.edu', rollNumber: '23ME020' },
  harini: { name: 'Harini K', email: 'harini@college.edu', rollNumber: '23EC044' },
  vignesh: { name: 'Vignesh R', email: 'vignesh@college.edu', rollNumber: '22ME118' },
};

// Register, or log in if the demo account already exists
async function tokenFor(s) {
  try {
    const { data } = await axios.post(`${USER}/api/auth/register`, { ...s, password: PASSWORD }, T);
    return data.data.token;
  } catch (err) {
    if (err.response?.status !== 409) throw err;
    const { data } = await axios.post(`${USER}/api/auth/login`, { email: s.email, password: PASSWORD }, T);
    return data.data.token;
  }
}

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

(async () => {
  try {
    const tok = {};
    for (const [k, s] of Object.entries(students)) tok[k] = await tokenFor(s);
    console.log('Users + 11 demo students ready (password: demo1234)');

    const post = async (who, item) => (await axios.post(`${ITEM}/api/items`, item, as(tok[who]))).data.data;
    const bottle = await post('ravi', { type: 'found', title: 'Blue Milton water bottle', description: 'Steel bottle with a sticker on the cap.', category: 'Bottle', location: 'Central Library, 2nd floor', date: daysAgo(4) });
    await post('meena', { type: 'lost', title: 'Student ID card', description: 'ID card in a red lanyard, CSE 3rd year.', category: 'ID Card', location: 'Main canteen', date: daysAgo(6), reporterPhone: '9876500001' });
    const airdopes = await post('priya', { type: 'found', title: 'boAt Airdopes case', description: 'Black earbuds case, no earbuds inside.', category: 'Electronics', location: 'Block C, Room 204', date: daysAgo(5) });
    await post('karthik', { type: 'lost', title: 'HP laptop charger', description: '65W HP charger with a yellow tape mark near the plug.', category: 'Electronics', location: 'Computer Lab 3', date: daysAgo(5) });
    const keys = await post('ravi', { type: 'found', title: 'Set of 3 keys with a keychain', description: 'Two small keys and one bike key on a cartoon keychain.', category: 'Keys', location: 'Parking lot near Gate 2', date: daysAgo(4) });
    await post('divya', { type: 'lost', title: 'Data Structures textbook', description: 'Mark Allen Weiss, name written inside the cover.', category: 'Books', location: 'Seminar Hall', date: daysAgo(4) });
    const wallet = await post('arjun', { type: 'found', title: 'Brown leather wallet', description: 'Contains some cash and a bus pass.', category: 'Wallet', location: 'Auditorium, Row F', date: daysAgo(3) });
    console.log('Item  + 7 items reported');

    const claim = async (who, item, proofDescription) => (await axios.post(`${CLAIM}/api/claims`, { itemId: item._id, proofDescription }, as(tok[who]))).data.data;
    const cArun = await claim('arun', bottle, 'It has a sticker on the cap and a dent at the bottom.');
    await claim('kavya', bottle, 'I lost a blue bottle in the library last week.');
    const cSanjay = await claim('sanjay', wallet, 'The bus pass inside is in my name, Sanjay T.');
    await claim('harini', keys, 'The keychain is a cartoon cat holding an umbrella. The bike key is for a blue Hero cycle.');
    await claim('vignesh', airdopes, 'Case has a small crack near the hinge and my initials VR scratched underneath.');
    console.log('Claim + 5 claims sent');

    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const { data } = await axios.post(`${USER}/api/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, T);
      const admin = data.data.token;
      const msg = (who, c, text) => axios.post(`${CLAIM}/api/claims/${c._id}/messages`, { text }, as(who));
      await msg(admin, cArun, 'Thanks Arun. What exactly is printed on the sticker?');
      await msg(admin, cSanjay, 'Which bus route is printed on the pass?');
      await msg(tok.sanjay, cSanjay, 'Route 14, Gandhipuram to campus. It expires in March.');
      console.log('Desk  + asked 2 questions, 1 answered');
    } else {
      console.log('(Pass the admin email and password as extra arguments to also seed desk questions.)');
    }
    console.log('\nDone.');
  } catch (err) {
    console.error('Seed failed:', err.response?.data || err.message);
    process.exit(1);
  }
})();
