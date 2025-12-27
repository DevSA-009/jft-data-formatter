/* ================= HELPERS ================= */

const SIZE_ORDER = [
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
  "2", "4", "6", "8", "10", "12", "14", "16"
];

const normalizeSizes = (size = "") => {
  size = size.toUpperCase().trim();

  const map = {
    XXL: "2XL",
    XXXL: "3XL",
    XXXXL: "4XL",
    XXXXXL: "5XL"
  };

  // Only normalize **exact matches** for letters
  if (map[size]) return map[size];

  // If it's a pure number (e.g., "5", "6") then round to next even
  if (/^\d+$/.test(size)) {
    const num = parseInt(size);
    return String(num % 2 === 0 ? num : num + 1);
  }

  // Otherwise keep the size as-is
  return size;
};


// DISPLAY ONLY
const formatSizeForDisplay = (size) => {
  return /^\d+$/.test(size) ? `${size} KIDS` : size;
};

const parseLine = (line) => {
  const p = line.split(/\s*---\s*/);
  return {
    NAME: (p[1] || "").toUpperCase(),
    SIZE: normalizeSizes(p[0] || ""),
    NUMBER: p[2] || "",
    SLEEVE: (p[3] || "").toUpperCase(),
    PANT: (p[4] || "").toUpperCase(),
  };
};

const sortSizes = (sizes) => {
  return sizes.sort((a, b) => {
    return SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);
  });
};

/* ================= CORE ================= */

let validRows = [];
let summaryData = {};
let missedCount = 0;

const processText = (text) => {
  validRows = [];
  summaryData = {};
  missedCount = 0;

  text.split("\n").forEach(line => {
    if (!line) return;

    const row = parseLine(line);
    const isValidSize = SIZE_ORDER.includes(row.SIZE);

    validRows.push({ ...row, MISSED: !isValidSize });

    if (!isValidSize) {
      missedCount++;
      return;
    }

    if (!summaryData[row.SIZE]) {
      summaryData[row.SIZE] = { TOTAL: 0, FULL: 0, HALF: 0, PANT: 0 };
    }

    summaryData[row.SIZE].TOTAL++;
    if (row.SLEEVE === "FULL") summaryData[row.SIZE].FULL++;
    if (row.SLEEVE === "HALF") summaryData[row.SIZE].HALF++;
    if (row.PANT === "YES") summaryData[row.SIZE].PANT++;

  });
};

/* ================= UI ================= */

const formatOrders = () => {
  const text = document.getElementById("inputText").value;
  const output = document.getElementById("output");
  output.innerHTML = "";

  processText(text);

  if (!validRows.length) {
    toggleButtons(false);
    return;
  }
  toggleButtons(true);

  let serial = 1;

  let html = `
  <table>
    <thead>
      <tr>
        <th>SERIAL</th>
        <th>NAME</th>
        <th>NUMBER</th>
        <th>SIZE</th>
        <th>SLEEVE</th>
        <th>PANT</th>
      </tr>
    </thead>
    <tbody>
  `;

  const sizesInData = [...new Set(
    validRows.filter(r => !r.MISSED).map(r => r.SIZE)
  )];

  sortSizes(sizesInData).forEach(size => {
    validRows
      .filter(r => r.SIZE === size && !r.MISSED)
      .forEach(r => {
        html += `
        <tr>
          <td>${serial++}</td>
          <td class="${!r.NAME ? "empty-cell" : ""}">${r.NAME || "—"}</td>
          <td class="${!r.NUMBER ? "empty-cell" : ""}">${r.NUMBER || "—"}</td>
          <td>${formatSizeForDisplay(r.SIZE)}</td>
          <td>${r.SLEEVE || "—"}</td>
          <td>${r.PANT || "—"}</td>
        </tr>`;
      });
  });

  validRows.filter(r => r.MISSED).forEach(r => {
    html += `
    <tr class="missed-row">
      <td>${serial++}</td>
      <td class="${!r.NAME ? "empty-cell" : ""}">${r.NAME || "—"}</td>
      <td class="${!r.NUMBER ? "empty-cell" : ""}">${r.NUMBER || "—"}</td>
      <td>${r.SIZE ? formatSizeForDisplay(r.SIZE) : "—"}</td>
      <td>${r.SLEEVE || "—"}</td>
    </tr>`;
  });

  html += `</tbody></table>`;

  /* ================= SUMMARY ================= */

  let totalBody = 0, totalFull = 0, totalHalf = 0, totalPant = 0;

  html += `
<h2>Summary</h2>
<table>
  <thead>
    <tr>
      <th>SIZE</th>
      <th>TOTAL</th>
      <th>FULL</th>
      <th>HALF</th>
      <th>PANT</th>
    </tr>
  </thead>
  <tbody>
`;

  sortSizes(Object.keys(summaryData)).forEach(size => {
    const s = summaryData[size];
    totalBody += s.TOTAL;
    totalFull += s.FULL;
    totalHalf += s.HALF;
    totalPant += s.PANT;

    html += `
  <tr>
    <td>${formatSizeForDisplay(size)}</td>
    <td>${s.TOTAL}</td>
    <td>${s.FULL}</td>
    <td>${s.HALF}</td>
    <td>${s.PANT}</td>
  </tr>`;
  });

  html += `
  <tr>
    <th>Total Sum Body</th>
    <th>${totalBody}</th>
    <th>${totalFull}</th>
    <th>${totalHalf}</th>
    <th>${totalPant}</th>
  </tr>
  ${missedCount ? `<tr class="missed-row">
    <th>Missed Size</th>
    <th>${missedCount}</th>
    <th>—</th>
    <th>—</th>
    <th>—</th>
  </tr>` : ""}
  </tbody>
</table>`;


  output.innerHTML = html;
};

/* ================= BUTTONS ================= */

const toggleButtons = (state) => {
  document.getElementById("copyBtn").disabled = !state;
  document.getElementById("printBtn").disabled = !state;
};

const copyAsJSON = () => {
  const filteredRows = validRows.filter(r => !r.MISSED);

  if (!filteredRows.length) {
    alert("No valid data to copy!");
    return;
  }

  const grouped = {};
  const sizes = sortSizes([...new Set(filteredRows.map(r => r.SIZE))]);

  sizes.forEach(size => {
    grouped[size] = filteredRows
      .filter(r => r.SIZE === size)
      .map(r => ({
        NAME: r.NAME,
        NO: r.NUMBER,
        SLEEVE: r.SLEEVE,
        PANT: r.PANT === "YES" ? true : false
      }));
  });

  navigator.clipboard.writeText(JSON.stringify(grouped));
  alert("Grouped JSON copied ✔");
};


const printTables = () => {
  window.print();
};


const buttons = document.querySelectorAll(".drag-btn");

buttons.forEach(btn => {
  let startX = 0;
  let currentX = 0;
  let dragging = false;

  btn.addEventListener("mousedown", e => {
    dragging = true;
    startX = e.clientX - currentX;
    btn.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;

    currentX = e.clientX - startX;

    // limit X-axis movement (optional)
    if (currentX < -50) currentX = -50;
    if (currentX > 150) currentX = 150;

    btn.style.transform = `translateX(${currentX}px)`;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    btn.style.cursor = "grab";
  });
});

