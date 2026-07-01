const axios = require('axios');

async function run() {
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: 'Hallo, wie geht es dir heute?',
        langpair: 'autodetect|en',
        de: 'mymemory@translator-app.local'
      }
    });
    console.log('=== Raw MyMemory Response ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

run();
