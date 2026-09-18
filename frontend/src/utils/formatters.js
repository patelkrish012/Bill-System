/**
 * Currency, Date, and Number to Words formatters for Krish Agriculture
 */

export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) return dateString; // Already DD/MM/YYYY
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function toInputDate(dateString) {
  if (!dateString) return new Date().toISOString().split('T')[0];
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateString;
}

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  } else if (num > 0) {
    str += ones[num];
  }
  return str.trim();
}

export function numberToIndianWords(amount) {
  if (amount === 0 || amount === '0' || !amount) {
    return 'Rupees Zero Only';
  }

  const num = parseFloat(amount);
  if (isNaN(num)) return '';

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  if (integerPart === 0 && decimalPart === 0) {
    return 'Rupees Zero Only';
  }

  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;

  const hundred = integerPart;

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertBelowThousand(hundred) + ' ';
  }

  words = words.trim();

  let result = words ? `Rupees ${words}` : '';

  if (decimalPart > 0) {
    const decimalWords = convertBelowThousand(decimalPart);
    if (result) {
      result += ` and ${decimalWords} Paise`;
    } else {
      result = `${decimalWords} Paise`;
    }
  }

  return `${result} Only`;
}
