// const API_KEY = '1e57a49b2bfaebb3bc0b690f5e1d3849331f079ee20b06fc2fa968b1e905fd3f';
// const API_ENDPOINT = 'https://min-api.cryptocompare.com/data/blockchain/transactions/';
// const  fs = require('fs');
// const axios = require('axios');

// const getTransactions = async (date) => {
//     try {
//         const response =  await axios.get(`${API_ENDPOINT}?fsym=BTC&tsym=USD&toTs=${date}&api_key=${API_KEY}`);
//         console.log(response);
//         // return transactions.map(tx => tx.hash);
//     } catch (error) {
//         console.error(error);
//     }
// }

// const date = "YOUR_DATE_HERE" // 2022-01-01
// const transactionHashes =  getTransactions(date);
// fs.writeFileSync('transaction_hashes.txt', transactionHashes.join('\n'));