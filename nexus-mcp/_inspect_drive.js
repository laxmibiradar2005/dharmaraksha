const { Composio } = require('composio-core');
require('dotenv').config();

const c = new Composio({apiKey: process.env.COMPOSIO_API_KEY});

c.actions.list({ appNames: ['googledrive'] }).then(a => {
  console.log('=== GOOGLE DRIVE ACTIONS ===');
  a.items.forEach(x => console.log('  ' + x.name + ': ' + x.description));
}).catch(e => console.error(e));
