const XLSX = require('xlsx');

const workbook = XLSX.readFile('1543_ConferenciaOSxFinanceiro.xls');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

let totalOs = 0;
let totalPaid = 0;
let totalPix = 0;
let totalCredito = 0;
let totalDebito = 0;
let totalConta = 0;

data.forEach((row) => {
  if (row["__EMPTY_5"] === "Finalizada") {
    totalOs += parseFloat(row["__EMPTY_10"]) || 0;
    totalPaid += parseFloat(row["__EMPTY_11"]) || 0;
    
    const paymentStr = row["__EMPTY_14"];
    if (typeof paymentStr === 'string') {
      const parts = paymentStr.split(';');
      parts.forEach(part => {
        const [method, valStr] = part.split(':');
        if (method && valStr) {
          const val = parseFloat(valStr.trim()) || 0;
          if (method.trim() === 'PIX') totalPix += val;
          if (method.trim() === 'Credito') totalCredito += val;
          if (method.trim() === 'Debito') totalDebito += val;
          if (method.trim() === 'PAGAMENTO EM CONTA') totalConta += val;
        }
      });
    }
  }
});

console.log("Total OS:", totalOs);
console.log("Total Paid:", totalPaid);
console.log("Total PIX:", totalPix);
console.log("Total Credito:", totalCredito);
console.log("Total Debito:", totalDebito);
console.log("Total Conta:", totalConta);
console.log("Sum methods:", totalPix + totalCredito + totalDebito + totalConta);
