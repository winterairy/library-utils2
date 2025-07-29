if (!window.__TABLE_BARCODE_HELPER_LOADED__) {
  window.__TABLE_BARCODE_HELPER_LOADED__ = true;

  // ===== TableBarcodeHelper 함수 기반 구조 =====
  function findRows(tableSelector, barcode) {
    const table = document.querySelector(tableSelector);
    if (!table) return [];
    const rows = table.querySelectorAll("tr");
    return Array.from(rows).filter((row) => row.textContent.includes(barcode));
  }

  function highlightRows(tableSelector, barcode) {
    const rows = findRows(tableSelector, barcode);
    let found = false;
    let firstMark = null;
    rows.forEach((row) => {
      found = true;
      row.classList.add("on");
      if (!firstMark) firstMark = row;
    });
    return { found, firstMark };
  }

  function checkCheckboxes(tableSelector, barcode) {
    const rows = findRows(tableSelector, barcode);
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

  function preprocessBarcode(barcode) {
    const letters = barcode.replace(/[^A-Za-z]/g, "");
    let numbers = barcode.replace(/[A-Za-z]/g, "");
    // 10에서 숫자 갯수만큼을 빼고 0을 추가
    const zeroCount = 10 - numbers.length;
    const zeros = zeroCount > 0 ? "0".repeat(zeroCount) : "";
    return letters + zeros + numbers;
  }

  // ====== [1] 메시지 리스너 등록 (시점별) ======
  const tableSelector = ".table_10";

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
    barcode = preprocessBarcode(barcode);
    // 중복 하이라이트 방지: 이미 .on 클래스가 있으면 duplicate 처리
    const rows = findRows(tableSelector, barcode);
    const alreadyHighlighted = rows.some((row) => row.classList.contains("on"));
    if (alreadyHighlighted) {
      sendResponse({
        success: "duplicate",
        message: `${barcode}는 이미 검색했어요.`,
      });
      return;
    }
    const found = highlightRows(tableSelector, barcode);
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
        message: `${barcode}가 있어요🎳 발송 완료!`,
      });
    } else {
      sendResponse({
        success: false,
        message: `${barcode}가 없어요🥲 발송 필요!`,
      });
    }
  }

  // ====== [3] 체크박스 처리 (조건별) ======
  function handleCheckCheckbox(barcode, sendResponse) {
    barcode = preprocessBarcode(barcode);
    const result = checkCheckboxes(tableSelector, barcode);
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
}
