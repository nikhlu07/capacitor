// Simple schema server for OOBI serving (Veridian pattern)
const express = require('express');
const cors = require('cors');
const { join } = require('path');

const app = express();
const PORT = 3005;

app.use(cors());

// Serve schemas exactly like Veridian - static files with correct content-type
app.use('/oobi', express.static(join(__dirname, 'src', 'schemas'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'application/schema+json');
  },
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Travlr Schema Server Running', 
    oobiEndpoint: `http://localhost:${PORT}/oobi`
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Schema server running on http://localhost:${PORT}`);
  console.log(`📋 OOBI endpoint: http://localhost:${PORT}/oobi`);
  console.log(`✅ Ready to serve schemas exactly like Veridian`);
});