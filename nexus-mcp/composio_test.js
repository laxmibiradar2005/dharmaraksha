const { Composio } = require('composio-core');
require('dotenv').config();

const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
c.actions.list().then(l => {
  const items = l.items || l;
  const driveActions = items.filter(a => a.name.includes('GOOGLEDRIVE')).map(a => a.name);
  console.log(driveActions.join(', '));
}).catch(console.error);
