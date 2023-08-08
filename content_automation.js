const openai_secret_key = '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';
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const openSeaApiKey = 'cec9dfea70e247d5b30436302f42add5';
const apiKey2 = 'JiySWWaatY';
const apiSecret2 = '55cb83345d085bc0bef250a5a9b80279';
const telegramBotToken = '6384792645:AAHJRStulxHhrW1UneG-PQdWO1E4ZIks4Oo';
const telegramChannel = '@GZ_Tradewithme';
main();
async function fetchArticles() {
  try {
    const response = await axios.get('http://api.service.com/articles', {
      headers: {
        'Authorization': `Bearer ${openai_secret_key}`
      }
    });
return response.data.articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

async function main() {
  const articles = await fetchArticles();
  console.log('Fetched articles:', articles);
await postArticlesToTelegramChannel(articles);



