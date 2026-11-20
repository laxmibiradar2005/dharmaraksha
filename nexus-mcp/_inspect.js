const dotenv = require('dotenv');
dotenv.config();
const { Composio } = require('composio-core');

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

async function main() {
  console.log("=== GMAIL ACTIONS ===");
  try {
    const actions = await composio.actions.list({ apps: "gmail", limit: 20 });
    const items = actions.items || actions;
    for (const a of items) {
      console.log(`  ${a.name || a.enum}: ${a.displayName || a.display_name || ''}`);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error);
