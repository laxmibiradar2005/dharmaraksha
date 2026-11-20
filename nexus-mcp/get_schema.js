const { Composio } = require('composio-core');
const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
async function run() {
  const actions = await c.actions.list({ apps: 'googledrive' });
  const a = actions.items.find(x => x.name === 'GOOGLEDRIVE_UPLOAD_FILE');
  console.log(JSON.stringify(a.parameters, null, 2));
}
run().catch(console.error);
