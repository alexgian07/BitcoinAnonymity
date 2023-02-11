const btn = document.getElementById("get-info-btn");
const pauseBtn = document.getElementById("pause-btn");
const exportJsonBtn = document.getElementById("export-json-btn");
const clearButton = document.getElementById("clearButton");
const form = document.querySelector('form');
const tabs = document.querySelectorAll(".tab-link");
let intervalTime = 10000;
let intervalId;

let transactionsTotalCount = 0;
let transactionInputsStore = [];
let addressesStore = [];
let outputsStore = [];
let outputValuesStore = [];
let denominationsStore = [];
let anonymitySetStore = [];
let consecutiveCoinJoinsAfterStore = [];
let mistakesStore = [];
let unspentAfterStore = [];
let consecutiveCoinJoinsBeforeStore = [];

tabs.forEach(tab => {
    tab.addEventListener("click", function (event) {
        event.preventDefault();
        const activeTab = document.querySelector(".tab-content.active");
        activeTab.classList.remove("active");
        const target = document.querySelector(this.getAttribute("href"));
        target.classList.add("active");

        const activeLink = document.querySelector(".tab-link.active");
        activeLink.classList.remove("active");
        this.classList.add("active");
    });
});

btn.addEventListener("click", async () => {
    try {
        intervalId = setInterval(async () => {
            fetch("/getTransactionInfo")
                .then(response => response.json())
                .then(data => analyseTransaction(data, true))
                .catch(error => console.error(error));
        }, intervalTime);
    }
    catch {
        startTimer();
    }
});

// const input = document.getElementById("file-input");
// input.addEventListener("change", function () {
//   const file = input.files[0];
//   const reader = new FileReader();
//   reader.onload = function () {
//     const text = reader.result;
//     // Split the text by line breaks to get an array of lines
//     const lines = text.split("\n");
//     // Process each line
//     debugger
//     for (const line of lines) {
//       // Parse the line
//       // ...
//     }
//   };
//   reader.readAsText(file);
// });

pauseBtn.addEventListener("click", () => {
    console.log("paused analysis");
    clearInterval(intervalId);
});

exportJsonBtn.addEventListener("click", () => {
    const tbody = document.getElementById("transaction-info-body");
    const data = [];
    for (const tr of tbody.children) {
        const row = [];
        for (const td of tr.children) {
            row.push(td.textContent);
        }
        data.push(row);
    }
    const json = JSON.stringify(data);
    const a = document.createElement("a");
    const file = new Blob([json], { type: "application/json" });
    a.href = URL.createObjectURL(file);
    a.download = "transaction-info.json";
    a.click();
});

clearButton.addEventListener("click", () => {
    form.elements['transaction-hash'].value = '';
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const transactionHash = form.elements['transaction-hash'].value;
    const response = await fetch("/transaction", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            transactionHash: transactionHash,
            event: "TransactionConfirmed"
        })
    });
    let data = await response?.json();
    analyseTransaction(data, true);
});


function satoshisToBTC(satoshis) {
    return satoshis / 100000000;
}

function convertToNDecimalPlaces(number, n) {
    return Number(number.toFixed(n));
}

function sumArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}

async function analyseTransaction(data, moreDepth) {
    if (!data.error) {
        let tbody = document.getElementById("transaction-info-body");
        let transaction = data.transactionInfo;
        if (!transaction) {
            console.log("No data returned: starting timer");
            startTimer();
            return;
        }

        //inputs analysis
        let addressToInputs = {};
        if (transaction?.inputs && transaction?.inputs?.length > 0) {
            for (let input of transaction.inputs) {
                let addr = input.prev_out.addr;
                if (!addressToInputs[addr]) {
                    addressToInputs[addr] = [];
                }
                addressToInputs[addr].push(input);
            }
        }
        let addressesCount = Object.keys(addressToInputs)?.length ?? 0;

        let tr = document.createElement("tr");
        let date = new Date(transaction.time * 1000);
        let dif = transaction?.inputs?.length - addressesCount;

        //outputs analysis
        let valueToOutputs = {};
        for (let output of transaction?.out ?? []) {
            let outValue = output.value;
            if (!valueToOutputs[outValue]) {
                valueToOutputs[outValue] = [];
            }
            valueToOutputs[outValue].push(output);
        }

        let maxValue, maxCount = 0;
        for (let value in valueToOutputs) {
            if (valueToOutputs[value].length > maxCount) {
                maxValue = satoshisToBTC(value);
                maxCount = valueToOutputs[value].length;
            }
        }
        let outputValuesCount = Object.keys(valueToOutputs)?.length ?? 0;
        let transactionInputsLength = transaction?.inputs?.length ?? 0;
        let transactionOutputsLength = transaction?.out?.length ?? 0;
        let diffFault = 100 * (dif) / transaction?.inputs?.length;
        let isWasabiCoinJoin = (maxCount >= 10);
        console.log("max count " + maxCount + " so it is " + isWasabiCoinJoin);
        if (!moreDepth) {
            return { maxCount: maxCount, maxValue: maxValue };
        }
        let coinJoined, unspentCoins, coinJoinedBefore;
        if (isWasabiCoinJoin) {
            coinJoinedBefore = await checkForConsecutiveCoinjoinsBefore(transaction);
            let coinjoinResults = await checkForConsecutiveCoinjoinsAfter(transaction, maxValue, maxCount);
            coinJoined = coinjoinResults?.consecutiveCoinJoinsCount;
            unspentCoins = coinjoinResults?.unspent;
        }
        else{
            coinJoinedBefore = 0;
            coinJoined = 0;
            unspentCoins = 0;
        }
        
        let mistakes = await checkForAnonymityMistake(transaction, maxValue);

        let coinJoinedBeforePercentage = convertToNDecimalPlaces((100 * (coinJoinedBefore ?? 0)) / transactionInputsLength, 3);
        let coinJoinedAfterPercentage = convertToNDecimalPlaces((100 * (coinJoined ?? 0)) / maxCount, 3);
        let mistakesPercentage = convertToNDecimalPlaces(((100 * (mistakes ?? 0)) / maxCount), 3);

        tr.innerHTML = `
          <td>${transaction.hash}</td>
          <td>${transactionInputsLength}</td>
          <td>${addressesCount}</td>
          <td  class="${(dif ?? 0) !== 0 ? 'red' : ''}">${100 * (dif) / transactionInputsLength}%</td>
          <td>${coinJoinedBefore}</td>
          <td>${coinJoinedBefore ? coinJoinedBeforePercentage : '-'}%</td>
          <td>${transaction?.out?.length}</td>
          <td>${maxValue}</td>
          <td>${maxCount}</td>
          <td>${coinJoined}</td>
          <td>${coinJoined ? coinJoinedAfterPercentage : '-'}%</td>
          <td>${mistakes}</td>
          <td>${mistakes ? mistakesPercentage : '-'}%</td>
          <td>${unspentCoins}</td>
          <td>${date.getHours() + ":" + date.getMinutes() + ", " + date.toDateString()}</td>
      `;

        let statisticsArray = [];
        statisticsArray.push(++transactionsTotalCount);

        transactionInputsStore.push(transactionInputsLength);
        let transactionInputsMedian = sumArray(transactionInputsStore) / transactionInputsStore.length;
        statisticsArray.push(transactionInputsMedian);

        addressesStore.push(addressesCount);
        let addressesCountMedian = sumArray(addressesStore) / addressesStore.length;
        statisticsArray.push(addressesCountMedian);
        statisticsArray.push(100 * (transactionInputsMedian - (addressesCountMedian ?? 0)) / transactionInputsMedian);

        consecutiveCoinJoinsBeforeStore.push(coinJoinedBefore ?? 0);
        let consecutiveCoinJoinsBeforeMedian = sumArray(consecutiveCoinJoinsBeforeStore) / consecutiveCoinJoinsBeforeStore.length;
        statisticsArray.push(consecutiveCoinJoinsBeforeMedian);
        statisticsArray.push((100*consecutiveCoinJoinsBeforeMedian) / transactionInputsMedian);

        outputsStore.push(transactionOutputsLength);
        let outputsStoreMedian = sumArray(outputsStore) / outputsStore.length;
        statisticsArray.push(outputsStoreMedian);

        denominationsStore.push(maxValue);
        let denominationsMedian = sumArray(denominationsStore) / denominationsStore.length;
        statisticsArray.push(denominationsMedian);

        anonymitySetStore.push(maxCount);
        let anonymitySetMedian = sumArray(anonymitySetStore) / anonymitySetStore.length;
        statisticsArray.push(anonymitySetMedian);

        consecutiveCoinJoinsAfterStore.push(coinJoined ?? 0);
        let consecutiveCoinJoinsAfterMedian = sumArray(consecutiveCoinJoinsAfterStore) / consecutiveCoinJoinsAfterStore.length;
        statisticsArray.push(consecutiveCoinJoinsAfterMedian);
        statisticsArray.push((100*consecutiveCoinJoinsAfterMedian) / anonymitySetMedian);

        mistakesStore.push(mistakes ?? 0);
        let mistakesMedian = sumArray(mistakesStore) / mistakesStore.length;
        statisticsArray.push(mistakesMedian);
        statisticsArray.push(100* (mistakesMedian ?? 0) / anonymitySetMedian);

        unspentAfterStore.push(unspentCoins ?? 0);
        let unspentAfterMedian = sumArray(unspentAfterStore) / unspentAfterStore.length;
        statisticsArray.push(unspentAfterMedian);

        setStatistics(statisticsArray);
        tbody.appendChild(tr);
        return false;
    }
    else {
        console.log("starting timer after error");
        startTimer();
    }
}

function setStatistics(values) {
    var table = document.getElementById("statistics");
    var rows = table.getElementsByTagName("tr");
    var cells = rows[1].getElementsByTagName("td");
    for (var j = 0; j < cells.length; j++) {
        cells[j].innerHTML = convertToNDecimalPlaces(values[j], 3);
    }
}

function startTimer() {
    let countDownDate = new Date().getTime() + 60000;
    intervalTime = 2000;
    pauseBtn.click();
    timerDiv.style.display = "block";
    let x = setInterval(function () {
        let now = new Date().getTime();
        let distance = countDownDate - now;
        let timerLabel = document.getElementById("timer");
        let timerDiv = document.getElementById("timerDiv");
        if (distance < 0) {
            clearInterval(x);
            timerDiv.style.display = "none";
            btn.click();
        } else {
            timerLabel.innerHTML = Math.floor(distance / 1000) + "s";
        }
    }, 1000);
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function checkForConsecutiveCoinjoinsAfter(transaction, maxValue, anonymitySetCount) {
    let consecutiveCoinJoinsCount = 0;
    let unspent = 0;

    for (var i = 0; i < transaction.out.length; i++) {
        if (satoshisToBTC(transaction.out[i].value) == maxValue) {
            let spendingOutpoint = transaction.out[i].spending_outpoints[0];
            if (spendingOutpoint) {
                await fetch("/transaction", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        transactionHash: spendingOutpoint.tx_index,
                    })
                }).then(response => response.json())
                    .then(async data => {
                        let result = await analyseTransaction(data, false);
                        if ((result?.maxCount ?? 0) >= 10) {
                            consecutiveCoinJoinsCount++;
                        }
                    }).catch(error => { });
            }
            else {
                unspent++;
            }
        }
        else {
        }
    }
    return { consecutiveCoinJoinsCount: consecutiveCoinJoinsCount, unspent: unspent };
}

async function checkForConsecutiveCoinjoinsBefore(transaction) {
    let consecutiveCoinJoinsCount = 0;

    for (var i = 0; i < transaction.inputs.length; i++) {
        let prev_out = transaction.inputs[i].prev_out;
        if (prev_out) {
            await fetch("/transaction", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    transactionHash: prev_out.tx_index,
                })
            }).then(response => response.json())
                .then(async data => {
                    let result = await analyseTransaction(data, false);
                    if ((result?.maxCount ?? 0 >= 10) && result.maxValue == satoshisToBTC(prev_out.value)) {
                        consecutiveCoinJoinsCount++;
                    }
                }).catch(error => { });
        }
    }
    return consecutiveCoinJoinsCount;
}

async function checkForAnonymityMistake(transaction, maxValue) {
    let mistakesCount = 0;
    let addresses = [];
    for (let input of transaction.inputs) {
        let addr = input.prev_out.addr;
        if (addresses.indexOf(addr) === -1) {
            addresses.push(addr);
        }
    }
    for (let output of transaction.out) {
        let addrOut = output.addr;
        if (addresses.indexOf(addrOut) === -1) {
            addresses.push(addrOut);
        }
    }

    for (let i = 0; i < transaction.out.length; i++) {
        if (satoshisToBTC(transaction.out[i].value) == maxValue) {
            let mistake = false;
            let address = transaction.out[i].addr;
            let spendingOutpoint = transaction.out[i].spending_outpoints[0];
            if (spendingOutpoint) {
                console.log("next output " + i);
                await fetch("/transaction", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        transactionHash: spendingOutpoint.tx_index,
                    })
                }).then(response => response.json())
                    .then(trans => {
                        let nexTransaction = trans.transactionInfo;
                        let nextAddresses = [];
                        for (let j = 0; j < nexTransaction?.inputs?.length ?? 0; j++) {
                            let nextAddrI = nexTransaction.inputs[j].prev_out.addr;
                            if (nextAddresses.indexOf(nextAddrI) === -1) {
                                nextAddresses.push(nextAddrI);
                            }
                        }
                        // for (let k = 0; k <  nexTransaction?.out?.length ?? 0; k++) {
                        //     let nextAddrO = nexTransaction?.out[k].addr
                        //     if (nextAddresses.indexOf(nextAddrO) === -1) {
                        //         nextAddresses.push(nextAddrO);
                        //     }
                        // }
                        console.log("hereeeeeeeeeeeeeeeee");
                        let common = addresses.filter(adr => adr != address && nextAddresses.includes(adr));
                        console.log("There are common addresses:", common ?? 0);
                        if (common?.length > 0) {
                            mistake = true;
                            mistakesCount++;
                        }
                    }).catch(error => { console.log(error); });
            }
            else {
            }


        }
    }
    return mistakesCount;
}