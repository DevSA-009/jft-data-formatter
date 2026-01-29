/* ================= CONSTANTS ================= */

const SIZE_ORDER = [
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
  "2", "4", "6", "8", "10", "12", "14", "16"
];

const STORAGE_KEYS = {
  FORMAT: 'order_formatter_last_format',
  ORDER_DATA: 'order_formatter_last_data'
};

/* ================= STATE ================= */

let uploadedImage = null;
let validRows = [];
let summaryData = {};
let missedCount = 0;

/* ================= UTILITY FUNCTIONS ================= */

const normalizeSizes = (size = "") => {
  size = size.toUpperCase().trim();
  const map = { XXL: "2XL", XXXL: "3XL", XXXXL: "4XL", XXXXXL: "5XL" };
  if (map[size]) return map[size];
  if (/^\d+$/.test(size)) {
    const num = parseInt(size);
    return String(num % 2 === 0 ? num : num + 1);
  }
  return size;
};

const formatSizeForDisplay = (size) => {
  return /^\d+$/.test(size) ? `${size} KIDS` : size;
};

const parseLine = (line) => {
  const p = line.split(/\s*---\s*/);
  const clean = (v = "") => /^\s*$/.test(v) ? "" : v.trim();
  return {
    NAME: clean(p[1]).toUpperCase(),
    SIZE: normalizeSizes(p[0] || ""),
    NUMBER: clean(p[2]).toUpperCase(),
    SLEEVE: (p[3] || "").toUpperCase(),
    PANT: (p[4] || "").toUpperCase(),
  };
};

const sortSizes = (sizes) => {
  return sizes.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
};

/* ================= TOAST NOTIFICATION ================= */

const showToast = (message, type = 'info') => {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
};

/* ================= IMAGE HANDLING ================= */

const displayImage = (src) => {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = `<img src="${src}" alt="Uploaded Image" />`;
  document.getElementById('imagePreviewSection').style.display = 'block';
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = e.target.result;
      displayImage(uploadedImage);
      showToast('Image uploaded successfully', 'success');
    };
    reader.readAsDataURL(file);
  }
};

const handlePaste = (event) => {
  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImage = e.target.result;
        displayImage(uploadedImage);
        showToast('Image pasted successfully', 'success');
      };
      reader.readAsDataURL(blob);
      event.preventDefault();
      break;
    }
  }
};

const removeImage = () => {
  uploadedImage = null;
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('imageInput').value = '';
  document.getElementById('imagePreviewSection').style.display = 'none';
  showToast('Image removed', 'info');
};

/* ================= DATA PROCESSING ================= */

const processText = (text) => {
  validRows = [];
  summaryData = {};
  missedCount = 0;

  text.split("\n").forEach(line => {
    if (!line.trim()) return;

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

/* ================= HTML GENERATORS ================= */

const generateSummaryTable = () => {
  let totalBody = 0, totalFull = 0, totalHalf = 0, totalPant = 0;

  let html = `
    <div class="section-header">
      <h2>Summary</h2>
    </div>
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
      <tr class="summary-footer">
        <td>TOTAL</td>
        <td>${totalBody}</td>
        <td>${totalFull}</td>
        <td>${totalHalf}</td>
        <td>${totalPant}</td>
      </tr>
  `;

  if (missedCount) {
    html += `
      <tr class="missed-row">
        <td>INVALID SIZE</td>
        <td>${missedCount}</td>
        <td>—</td>
        <td>—</td>
        <td>—</td>
      </tr>`;
  }

  html += `</tbody></table>`;
  return html;
};

const generateDetailTable = () => {
  let serial = 1;

  let html = `
    <div class="section-header">
      <h2>Detail List</h2>
    </div>
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

  const sizesInData = [...new Set(validRows.filter(r => !r.MISSED).map(r => r.SIZE))];

  sortSizes(sizesInData).forEach(size => {
    validRows
      .filter(r => r.SIZE === size && !r.MISSED)
      .forEach(r => {
        html += `
        <tr>
          <td>${serial++}</td>
          <td class="${!r.NAME ? "empty-cell" : ""}">${r.NAME || "—"}</td>
          <td class="${!r.NUMBER ? "empty-cell" : ""}">${r.NUMBER || "—"}</td>
          <td style="font-weight: 600;">${formatSizeForDisplay(r.SIZE)}</td>
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
      <td>${r.PANT || "—"}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
};

/* ================= FORMAT LAYOUTS ================= */

const generateSplitLayout = (partyName, jerseyType, fabricsType) => {
  let html = '<div class="split-layout">';

  // Left Column
  html += '<div class="left-column">';

  // Image
  if (uploadedImage) {
    html += `<div class="image-container"><img src="${uploadedImage}" alt="Design" /></div>`;
  }

  // Info Block
  html += `
    <div class="info-block">
      <div class="info-item">
        <span class="info-label">Name:</span>
        <span class="info-value">${partyName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Jersey Type:</span>
        <span class="info-value">${jerseyType}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Fabrics:</span>
        <span class="info-value">${fabricsType}</span>
      </div>
    </div>
  `;

  // Summary
  html += generateSummaryTable();

  html += '</div>';

  // Right Column - Details Only
  html += '<div class="right-column">';
  html += generateDetailTable();
  html += '</div>';

  html += '</div>';
  return html;
};

const generateCommonLayout = (partyName, jerseyType, fabricsType) => {
  let html = '<div class="common-layout">';

  // Top Info Section
  html += '<div class="top-info">';

  // Image Side
  if (uploadedImage) {
    html += `<div class="image-side"><img src="${uploadedImage}" alt="Design" /></div>`;
  }

  // Info Side
  html += `
    <div class="info-side">
      <div class="info-item">
        <span class="info-label">Name</span>
        <span class="info-value">${partyName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Jersey Type</span>
        <span class="info-value">${jerseyType}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Fabrics</span>
        <span class="info-value">${fabricsType}</span>
      </div>
    </div>
  `;

  html += '</div>';

  // Summary
  html += generateSummaryTable();

  // Details
  html += generateDetailTable();

  html += '</div>';
  return html;
};

/* ================= MAIN FUNCTIONS ================= */

const formatOrders = () => {
  const text = document.getElementById("inputText").value;
  const partyName = document.getElementById("partyName").value || "Name";
  const jerseyType = document.getElementById("jerseyType").value || "POLO";
  const fabricsType = document.getElementById("fabricsType").value || "PP";
  const format = document.querySelector('input[name="format"]:checked').value;

  processText(text);

  if (!validRows.length) {
    showToast('No data to format', 'error');
    return;
  }

  // Save data
  localStorage.setItem(STORAGE_KEYS.FORMAT, format);
  localStorage.setItem(STORAGE_KEYS.ORDER_DATA, text);

  // Generate output
  const output = document.getElementById("output");
  output.className = "print-area";

  if (format === 'format5') {
    output.innerHTML = generateSplitLayout(partyName, jerseyType, fabricsType);
  } else {
    if (format === 'format1') {
      output.classList.add('compact');
    }
    output.innerHTML = generateCommonLayout(partyName, jerseyType, fabricsType);
  }

  // Switch to output page
  document.getElementById('inputPage').style.display = 'none';
  document.getElementById('outputPage').style.display = 'block';

  showToast('Data formatted successfully', 'success');
};

const goBackToInput = () => {
  document.getElementById('inputPage').style.display = 'block';
  document.getElementById('outputPage').style.display = 'none';
};

const copyAsJSON = () => {
  const filteredRows = validRows.filter(r => !r.MISSED);

  if (!filteredRows.length) {
    showToast('No valid data to copy', 'error');
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

  const minifiedJSON = JSON.stringify(grouped);

  navigator.clipboard.writeText(minifiedJSON).then(() => {
    showToast('JSON copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy JSON', 'error');
  });
};

const printTables = () => {
  window.print();
};

/* ================= KEYBOARD SHORTCUTS ================= */

const handleKeyboardShortcuts = (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'i':
        event.preventDefault();
        document.getElementById('imageInput').click();
        break;
      case 'f':
        event.preventDefault();
        const currentPage = document.getElementById('inputPage').style.display !== 'none';
        if (currentPage) {
          formatOrders();
        }
        break;
      case 'c':
        event.preventDefault();
        const outputVisible = document.getElementById('outputPage').style.display !== 'none';
        if (outputVisible) {
          copyAsJSON();
        }
        break;
      case 'p':
        event.preventDefault();
        const canPrint = document.getElementById('outputPage').style.display !== 'none';
        if (canPrint) {
          printTables();
        }
        break;
    }
  }
};

/* ================= INITIALIZATION ================= */

const init = () => {
  // Load saved data
  const lastFormat = localStorage.getItem(STORAGE_KEYS.FORMAT) || 'format2';
  const lastData = localStorage.getItem(STORAGE_KEYS.ORDER_DATA);

  const formatRadio = document.querySelector(`input[name="format"][value="${lastFormat}"]`);
  if (formatRadio) {
    formatRadio.checked = true;
  }

  if (lastData) {
    document.getElementById('inputText').value = lastData;
  }

  // Event listeners
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  document.getElementById('imageSelectBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });
  document.getElementById('removeImageBtn').addEventListener('click', removeImage);
  document.getElementById('formatBtn').addEventListener('click', formatOrders);
  document.getElementById('backBtn').addEventListener('click', goBackToInput);
  document.getElementById('copyBtnOutput').addEventListener('click', copyAsJSON);
  document.getElementById('printBtnOutput').addEventListener('click', printTables);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('keydown', handleKeyboardShortcuts);

  showToast('Ready to format orders', 'info');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}