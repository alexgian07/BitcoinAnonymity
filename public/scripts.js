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
      for (let transaction of data.transactionInfo) {
        let tr = document.createElement("tr");
        let date = new Date(transaction.time * 1000);
        let dif = transaction?.inputs?.length - data?.addressesCount;
        tr.innerHTML = `
              <td>${transaction.hash}</td>
              <td>${transaction?.inputs?.length}</td>
              <td>${data?.addressesCount}</td>
              <td  class="${(dif ?? 0) !== 0 ? 'red' : ''}">${100 * (dif) / transaction?.inputs?.length}%</td>
              <td>${date.getHours() + ":" + date.getMinutes() + ", " + date.toDateString()}</td>
          `;
        tbody.appendChild(tr);
      }
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