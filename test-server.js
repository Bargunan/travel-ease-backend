const express = require('express');
const app = express();

// Test route directly in server
app.get('/test', (req, res) => {
  res.json({ message: 'Direct route works!' });
});

app.listen(3000, () => {
  console.log('Test server running on port 3000');
});