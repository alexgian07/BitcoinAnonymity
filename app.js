const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');
let count = 0;
const bodyParser = require('body-parser');


app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

//Endpoints

app.post('/transaction', async (req, res) => {
  const transactionHash = req.body.transactionHash;
  try {
    let transactionInfo = await getTransaction(transactionHash);
    if (transactionInfo){
      res.json({transactionInfo});
    }
    else{
      res.json();
    }
  } catch (error) {
      res.json();
  }

  // res.send({
  //   success: true,
  //   message: 'Transaction hash and event received successfully!'
  // });
});


app.get('/getTransactionInfo', async (req, res) => {
     let lines = await readLines("wasabi_txs_02-2022.txt");
    // let lines = await readLines("samourai_txs_02-2022.txt");
    
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


app.post('/address', async (req, res) => {
  const address = req.body.address;
  try {
    let addressInfo = await getAddress(address);
    if (addressInfo){
      res.json({addressInfo});
    }
    else{
      res.json();
    }
  } catch (error) {
      res.json();
  }
});


async function getAddress(address) {
  try {
    const response = await axios.get(`https://blockchain.info/rawaddr/${address}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}


// Helper methods

async function getTransaction(transactionHash) {
  try {
    const response = await axios.get(`https://blockchain.info/rawtx/${transactionHash}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function getBlock(block) {
  try {
    const response = await axios.get(`https://blockchain.info/rawblock/${block}`);
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