const { Composio } = require('composio-core');
require('dotenv').config();

const c = new Composio({apiKey: process.env.COMPOSIO_API_KEY});
c.actions.list({ appNames: ['googledrive'] }).then(a => {
  console.log('=== GOOGLEDrive ACTIONS EXACT ===');
  a.items.forEach(x => console.log('  ' + x.name));
}).catch(e => console.error(e));
