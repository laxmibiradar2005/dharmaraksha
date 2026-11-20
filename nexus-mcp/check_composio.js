const { Composio } = require('composio-core');
const c = new Composio({ apiKey: 'fake' });
c.actions.get('GOOGLEDRIVE_UPLOAD_FILE')
  .then(a => console.log(JSON.stringify(a.expectedInput, null, 2)))
  .catch(console.error);
