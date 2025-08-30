const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Serve schemas at /oobi path
app.use('/oobi', express.static(path.join(__dirname, 'src', 'schemas'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'application/schema+json');
  },
}));

// Test endpoints
app.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Travlr-ID Credential Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/schemas', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
        name: 'Travel Preferences Credential',
      }
    ],
  });
});

app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log(`📋 Schema OOBI: http://localhost:${port}/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU`);
  console.log(`🌐 Test frontend: Open test-frontend/index.html in browser`);
});