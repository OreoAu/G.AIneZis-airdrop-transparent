const TelegramBot = require('node-telegram-bot-api');

const config = require('./config.json');
const Bitso = require('./bitso');
const Binance = require('./binance');
const ContentAutomation = require('./content_automation');
const DigitalPawnBrokerage = require('./digital_pawn_brokerage');

const bot = new TelegramBot(config.telegramBotToken, {polling: true});

bot.on('message', (msg) => {
const fetchContent = async () => {
  let content = await ContentAutomation.fetchContent(config.data);
  let socialPlatforms = await integrateSocialMedia(config.data);
  let marketplaceIntegration = await integrateMarketplaceP2PPlatform(config.data);
  let pawnTransaction = await DigitalPawnBrokerage.barterDigitalAssets(msg);
  return content;
  let airdropTokens = await DigitalPawnBrokerage.airdropTokens(msg);
};
  let airdropTokens = await DigitalPawnBrokerage.airdropTokens(msg);
  if(pawnTransaction.isSuccessful) {
  console.log(msg);
    bot.sendMessage(msg.chat.id, 'Your digital pawn brokerage transaction has been processed.');
  fetchContent().then(content => {
    bot.sendMessage(config.data.telegram_channel, pawnTransaction.message + '\n' + airdropTokens.message);
  } else {
  }).catch(err => {
} else {
    bot.sendMessage(msg.chat.id, 'Failed processing your digital pawn brokerage transaction.');
  });
    console.error('Error in pawn transaction:', err);
} catch (err) {
  }
});





