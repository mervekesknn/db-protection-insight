const express = require('express');
const cors = require('cors');
const alertsRouter = require('./routes/alerts');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'alerts-backend' });
});

app.use('/alerts', alertsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
