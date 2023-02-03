const btn = document.getElementById("get-info-btn");
const pauseBtn = document.getElementById("pause-btn");
const exportJsonBtn = document.getElementById("export-json-btn");
let intervalTime = 1000;
let intervalId;


btn.addEventListener("click", async () => {
    intervalId = setInterval(async () => {
        console.log("Next transaction");
        const response = await fetch("/getTransactionInfo");
        const data = await response.json();
        if (!data.error) {
            let tbody = document.getElementById("transaction-info-body");
            let transaction = data.transactionInfo;
            if (!transaction) {
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
            let outputValuesCount = Object.keys(valueToOutputs)?.length ?? 0;

            tr.innerHTML = `
              <td>${transaction.hash}</td>
              <td>${transaction?.inputs?.length}</td>
              <td>${(addressesCount ?? 0)}</td>
              <td  class="${(dif ?? 0) !== 0 ? 'red' : ''}">${100 * (dif) / transaction?.inputs?.length}%</td>
              <td>${transaction?.out?.length}</td>
              <td>${outputValuesCount}</td>
              <td>${date.getHours() + ":" + date.getMinutes() + ", " + date.toDateString()}</td>
          `;
            tbody.appendChild(tr);
        }
    }, intervalTime);
});

pauseBtn.addEventListener("click", () => {
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


function satoshisToBTC(satoshis) {
    return satoshis / 100000000;
}