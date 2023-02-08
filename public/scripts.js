const btn = document.getElementById("get-info-btn");
const pauseBtn = document.getElementById("pause-btn");
const exportJsonBtn = document.getElementById("export-json-btn");
const clearButton = document.getElementById("clearButton");
const form = document.querySelector('form');
const tabs = document.querySelectorAll(".tab-link");
let intervalTime = 1000;
let intervalId;

let transactionsTotalCount = 0;
let transactionInputsStore = [];
let addressesStore = [];
let anonymityFaultsStore = [];
let outputsStore = [];
let outputValuesStore = [];
let denominationsStore = [];
let anonymitySetStore = [];
let consecutiveCoinJoinsAfterStore = [];
let unspentAfterStore = [];

let consecutiveCoinJoinsBeforeStore = [];
let unspentBeforeStore = [];

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
            // console.log("Next transaction");
            // const response = await fetch("/getTransactionInfo");
            // const data = await response.json();
            // analyseTransaction(data, true);

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
        console.log("max count " + maxCount + " so it is "+ isWasabiCoinJoin);
        if (!moreDepth) {
            return {maxCount: maxCount, maxValue:maxValue };
        }
        let coinJoined, unspentCoins, coinJoinedBefore;
        if (isWasabiCoinJoin) {
            console.log("GOING FOR DETAILS");
            // console.log("precessing history");
            coinJoinedBefore = await checkForConsecutiveCoinjoinsBefore(transaction);
            let coinjoinResults = await checkForConsecutiveCoinjoinsAfter(transaction, maxValue, maxCount);
            // console.log("evaluating results");
            coinJoined = coinjoinResults?.consecutiveCoinJoinsCount;
            unspentCoins = coinjoinResults?.unspent;
        }

        tr.innerHTML = `
          <td>${transaction.hash}</td>
          <td>${transactionInputsLength}</td>
          <td>${addressesCount}</td>
          <td>${coinJoinedBefore}</td>
          <td  class="${(dif ?? 0) !== 0 ? 'red' : ''}">${100 * (dif) / transactionInputsLength}%</td>
          <td>${transaction?.out?.length}</td>
          <td>${outputValuesCount}</td>
          <td>${maxValue}</td>
          <td>${maxCount}</td>
          <td>${coinJoined}</td>
          <td>${unspentCoins}</td>
          <td>${date.getHours() + ":" + date.getMinutes() + ", " + date.toDateString()}</td>
      `;
        // if(transaction?.inputs?.length < 100){
        //     return;
        // }
        let statisticsArray = [];
        statisticsArray.push(++transactionsTotalCount);

        transactionInputsStore.push(transactionInputsLength);
        let transactionInputsMedian = sumArray(transactionInputsStore) / transactionInputsStore.length;
        statisticsArray.push(transactionInputsMedian);

        addressesStore.push(addressesCount);
        let addressesCountMedian = sumArray(addressesStore) / addressesStore.length;
        statisticsArray.push(addressesCountMedian);

        consecutiveCoinJoinsBeforeStore.push(coinJoinedBefore ?? 0);
        let consecutiveCoinJoinsBeforeMedian = sumArray(consecutiveCoinJoinsBeforeStore) / consecutiveCoinJoinsBeforeStore.length;
        statisticsArray.push(consecutiveCoinJoinsBeforeMedian);

        anonymityFaultsStore.push(diffFault);
        let anonymityFaultsMedian = sumArray(anonymityFaultsStore) / anonymityFaultsStore.length;
        statisticsArray.push(anonymityFaultsMedian);

        outputsStore.push(transactionOutputsLength);
        let outputsStoreMedian = sumArray(outputsStore) / outputsStore.length;
        statisticsArray.push(outputsStoreMedian);

        outputValuesStore.push(outputValuesCount);
        let outputValuesMedian = sumArray(outputValuesStore) / outputValuesStore.length;
        statisticsArray.push(outputValuesMedian);

        denominationsStore.push(maxValue);
        let denominationsMedian = sumArray(denominationsStore) / denominationsStore.length;
        statisticsArray.push(denominationsMedian);

        anonymitySetStore.push(maxCount);
        let anonymitySetMedian = sumArray(anonymitySetStore) / anonymitySetStore.length;
        statisticsArray.push(anonymitySetMedian);

        consecutiveCoinJoinsAfterStore.push(coinJoined ?? 0);
        let consecutiveCoinJoinsAfterMedian = sumArray(consecutiveCoinJoinsAfterStore) / consecutiveCoinJoinsAfterStore.length;
        statisticsArray.push(consecutiveCoinJoinsAfterMedian);

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
    let spentCount = 0;
    let consecutiveCoinJoinsCount = 0;
    let unspent = 0;

    for (var i = 0; i < transaction.out.length; i++) {
        // console.log("Next output" + i);
        if (satoshisToBTC(transaction.out[i].value) == maxValue) {
            // const response = await fetch("/address", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json"
            //     },
            //     body: JSON.stringify({
            //         address: transaction.out[i].addr,
            //     })
            // });
            // let data = await response?.json();
            // console.log(data);
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
                    if ((result?.maxCount ?? 0) >= 10){
                        consecutiveCoinJoinsCount++;
                    }
                }).catch(error => {});
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
            // console.log("Next input" + i);
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
                    if ((result?.maxCount ?? 0 >= 10) && result.maxValue == satoshisToBTC(prev_out.value)){
                        consecutiveCoinJoinsCount++;
                    }
                }).catch(error => {});
            // let data = await response?.json();
            // let consecutiveCoinJoin = await analyseTransaction(data, false);
        }
    }
    return  consecutiveCoinJoinsCount;
}