class TableBarcodeHelper {
  constructor(tableSelector = ".table_10") {
    this.table = document.querySelector(tableSelector);
  }

  findRows(barcode) {
    if (!this.table) return [];
    const rows = this.table.querySelectorAll("tr");
    return Array.from(rows).filter((row) => row.textContent.includes(barcode));
  }

  highlightRows(barcode) {
    const rows = this.findRows(barcode);
    let found = false;
    let firstMark = null;
    rows.forEach((row) => {
      found = true;
      row.style.backgroundColor = "yellow";
      if (!firstMark) firstMark = row;
    });
    return { found, firstMark };
  }

  checkCheckboxes(barcode) {
    const rows = this.findRows(barcode);
    let checked = false;
    let hasCheckbox = false;
    rows.forEach((row) => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox) {
        hasCheckbox = true;
        if (!checkbox.checked) {
          checkbox.checked = true;
        }
        checked = true;
      }
    });
    return { checked, hasCheckbox };
  }
}

// ====== [1] 메시지 리스너 등록 (시점별) ======
const rowFinder = new TableBarcodeHelper(".table_10");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search-barcode") {
    handleSearchBarcode(request.barcode, sendResponse);
    return true;
  }
  if (request.action === "check-checkbox-by-barcode") {
    handleCheckCheckbox(request.barcode, sendResponse);
    return true;
  }
});

// ====== [2] 바코드 하이라이트 처리 (조건별) ======
function handleSearchBarcode(barcode, sendResponse) {
  if (!ensureHighlightStyle()) {
    // 스타일 적용 실패 시에도 계속 진행
  }
  // 중복 하이라이트 방지: 이미 노란색인 row가 있으면 duplicate 처리
  const rows = rowFinder.findRows(barcode);
  const alreadyHighlighted = rows.some(
    (row) => row.style.backgroundColor === "yellow"
  );
  if (alreadyHighlighted) {
    sendResponse({
      success: "duplicate",
      message: `${barcode}는 이미 검색했어요.`,
    });
    return;
  }
  const found = rowFinder.highlightRows(barcode);
  if (found.firstMark) {
    try {
      found.firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      console.warn("스크롤 중 CSP 제한:", e);
    }
  }
  if (found.found) {
    sendResponse({
      success: true,
      message: `${barcode}가 있어요🥳 발송 완료!`,
    });
  } else {
    sendResponse({
      success: false,
      message: `${barcode}가 없어요🥲 발송 필요!`,
    });
  }
}

function ensureHighlightStyle() {
  if (!document.getElementById("barcode-highlight-style")) {
    try {
      const style = document.createElement("style");
      style.id = "barcode-highlight-style";
      style.textContent = `
        .highlight {
          background-color: yellow;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
      return true;
    } catch (e) {
      console.warn("스타일 적용 중 CSP 제한:", e);
      return false;
    }
  }
  return true;
}

// ====== [3] 체크박스 처리 (조건별) ======
function handleCheckCheckbox(barcode, sendResponse) {
  const result = rowFinder.checkCheckboxes(barcode);
  let message;
  if (result.hasCheckbox) {
    message = result.checked
      ? "체크박스를 체크했습니다!"
      : "이미 체크되어 있습니다.";
  } else {
    message = "일치하는 등록번호 row에 체크박스가 없습니다.";
  }
  sendResponse({
    success: result.checked,
    message,
  });
}
