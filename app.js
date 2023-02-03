const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');
const bitcore = require('bitcore-lib');
let count = 0;
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

async function getTransaction(transactionHash) {
  try {
    const response = await axios.get(`https://blockchain.info/rawtx/${transactionHash}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function readLines(filePath) {
  return new Promise((resolve, reject) => {
    let lines = [];
    fs.createReadStream(filePath)
      .on('data', (data) => {
        let dataLines = data.toString().split("\n");
        lines = lines.concat(dataLines);
      })
      .on('end', () => {
        resolve(lines);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

app.get('/getTransactionInfo', async (req, res) => {
  let lines = await readLines("wasabi_txs_02-2022.txt");
  var chosenLine = lines[count];
  count++;
  try {
    let transactionInfo = await getTransaction(chosenLine);
    if (transactionInfo){
      res.json({transactionInfo});
    }
    else{
      res.json();
    }
  } catch (error) {
      res.json();
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});