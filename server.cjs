const express = require('express');
const app = express();
app.use(express.json());

// Simulated payment store (for demo)
const paidPlans = new Set();

// Endpoint to simulate marking a plan as paid (for testing)
app.post('/api/mark-paid', (req, res) => {
  const { plan } = req.body;
  paidPlans.add(plan);
  res.json({ success: true });
});

// Endpoint to verify payment
app.post('/api/verify-payment', (req, res) => {
  const { plan } = req.body;
  if (paidPlans.has(plan)) {
    res.json({ verified: true });
  } else {
    res.json({ verified: false });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
