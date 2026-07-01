const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: 'Hallo, wie geht es dir heute?',
        langpair: 'autodetect|en',
        de: 'mymemory@translator-app.local'
      }
    });
    console.log('=== Response Data ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
