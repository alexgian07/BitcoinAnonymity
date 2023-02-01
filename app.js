const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');
const bitcore = require('bitcore-lib');

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
  var chosenLines = lines.slice(0, 5);
  let errorCount = 0;
  let transactionInfo = [];
  let addressToInputs = {};
  try {
     for (let line of chosenLines) {
        let info = await getTransaction(chosenLines[0]);
        if (info) {
            console.log("info aquired");
            if (info?.inputs && info?.inputs?.length > 0) {
                transactionInfo.push(info);
                for (let input of info.inputs){
                  console.log("checking previous transaction for input");
                  let addr = input.prev_out.addr;
                  if (!addressToInputs[addr]) {
                    addressToInputs[addr] = []; 
                  }
                  addressToInputs[addr].push(input);
                  console.log("Input sent from address " +addr);
                }
            } else {
                console.log(" no block height");
            }
        }
     }
    let addressesCount = Object.keys(addressToInputs).length;
    res.json({transactionInfo, addressesCount});
  } catch (error) {
    errorCount++;
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});