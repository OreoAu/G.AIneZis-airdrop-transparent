
const express = require('express');
const bodyParser = require('body-parser');
const apiIntegration = require('./api_integration');
const telegramBot = require('./telegram_bot');
const contentAutomation = require('./content_automation');
const utilityToken = require('./utility_token');
const marketingStrategy = require('./marketing_strategy');
const digitalPawnBrokerage = require('./digital_pawn_brokerage');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API integration route handler
app.post('/api/integration', (req, res) => {
  apiIntegration(req.body, (response) => {
    res.json(response);
  });
});

// Start telegram bot
telegramBot.start();

// Start content automation
contentAutomation.start();

// Start utility token creation
utilityToken.start();

// Start marketing strategy
marketingStrategy.start();
// Start digital pawn brokerage functionality
digitalPawnBrokerage.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



