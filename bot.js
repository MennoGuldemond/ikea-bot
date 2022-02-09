const axios = require('axios');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();
const productNumber = process.env.PRODUCT_NUMBER;
const pollingInterval = process.env.POLLING_INTERVAL;
const clientId = process.env.CLIENT_ID;

const ikeaUrl = 'https://api.ingka.ikea.com/cia/availabilities/ru/nl?itemNos=';
let timer = null;

const transporter = nodemailer.createTransport({
  service: process.env.BOT_EMAIL_SERVICE,
  auth: {
    user: process.env.BOT_EMAIL,
    pass: process.env.BOT_EMAIL_PASSWORD,
  },
});

async function checkStock() {
  axios
    .get(`${ikeaUrl}${productNumber}`, {
      headers: {
        'x-client-id': clientId,
      },
    })
    .then((res) => {
      // console.log(`statusCode: ${res.status}`);
      let totalStockAmount = 0;

      if (res.status === 200 && res.data.data) {
        const data = res.data.data;

        for (let i = 0; i < data.length; i++) {
          if (data[i].availableStocks) {
            for (let j = 0; j < data[i].availableStocks.length; j++) {
              totalStockAmount += data[i].availableStocks[j].quantity;
            }
          }
        }
      } else {
        // Notify response error
        sendErrorEmail(`Unsuccessful request.\nStatusCode: ${res.status}`);
      }

      if (totalStockAmount > 0) {
        // Notify stock is available
        console.log('total stock:', totalStockAmount);
        sendStockEmail(totalStockAmount);

        clearInterval(timer);
        timer = null;
      }
    })
    .catch((error) => {
      console.error(error);
      sendErrorEmail(error);
    });
}

function sendStockEmail(stockAmount) {
  const mailOptions = {
    from: 'Ikea stock bot',
    to: process.env.MAIL_TO,
    subject: `Stock available for productNo ${productNumber}`,
    text: `Product ${productNumber} has a stock availability of ${stockAmount} items!\n\nCheck https://www.ikea.com/nl/nl/search/products/?q=${productNumber}`,
  };
  transporter.sendMail(mailOptions, () => {
    console.log(`Mail was send to ${process.env.MAIL_TO}`);
  });
}

function sendErrorEmail(errorText) {
  const mailOptions = {
    from: 'Ikea stock bot',
    to: process.env.MAIL_TO,
    subject: `An error occured`,
    text: errorText,
  };
  transporter.sendMail(mailOptions, () => {
    console.log(`Mail was send to ${process.env.MAIL_TO}`);
  });
}

timer = setInterval(() => {
  checkStock();
}, pollingInterval);
