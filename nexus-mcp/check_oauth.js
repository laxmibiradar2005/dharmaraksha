const { Composio } = require('composio-core');
const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
async function run() {
  const accounts = await c.connectedAccounts.list({});
  const items = accounts.items || accounts;
  const match = items.find(a => a.appName === 'googledrive' && a.status === 'ACTIVE');
  if(!match) return console.log("No drive active");
  
  // fetch connection details
  const details = await c.connectedAccounts.get({ connectedAccountId: match.id });
  console.log(Object.keys(details));
  console.log(details.connection ? Object.keys(details.connection) : 'no connection object');
}
run().catch(console.error);
