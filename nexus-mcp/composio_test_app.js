const { Composio } = require('composio-core');
require('dotenv').config();

async function main() {
  const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  const actions = await c.actions.list();
  const items = actions.items || actions;
  console.log(items.filter(a => a.appName === 'googledrive' || a.name.includes("GOOGLEDRIVE")).map(a => `${a.appName} -> ${a.name}`).join('\n'));
}
main().catch(console.error);
