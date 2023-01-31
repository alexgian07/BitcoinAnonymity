const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');

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
  var chosenLines = lines.slice(0, 10);
  let errorCount = 0;
  let transactionInfo = [];
  try {
    console.log("start");
    for (let line of chosenLines) {
        console.log("getting");
        console.log(line);
        let info = await getTransaction(line);
        console.log("finished");
        if (info) {
            console.log("info aquired");
            if (info?.inputs && info?.inputs?.length > 0) {
                transactionInfo.push(info);
                console.log(info.inputs);
                for (let input in info.inputs){
                  console.log("script type");
                  console.log(input.script);
                }
            } else {
                console.log(" no block height");
            }
        }
    }
    res.json({ transactionInfo });
  } catch (error) {
    errorCount++;
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});