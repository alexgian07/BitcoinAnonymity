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
  let transactionInfo = [];
  let addressToInputs = {};
  try {
    let info = await getTransaction(chosenLine);
    if (info) {
      if (info?.inputs && info?.inputs?.length > 0) {
        transactionInfo.push(info);
        for (let input of info.inputs) {
          let addr = input.prev_out.addr;
          if (!addressToInputs[addr]) {
            addressToInputs[addr] = [];
          }
          addressToInputs[addr].push(input);
        }
      } 
    }
    let addressesCount = Object.keys(addressToInputs)?.length ?? 0;
    res.json({ transactionInfo, addressesCount });
  } catch (error) {
    res.json();
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});