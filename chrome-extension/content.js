import {
  checkAndMarkCheckbox,
  checkAndMarkCheckboxByBarcode,
} from "./checkCheckbox.js";
import {
  highlightRow,
  ensureHighlightStyle,
  isBarcodeAlreadyHighlighted,
  highlightBarcodeInDocument,
} from "./highlightElement.js";

// ====== [1] 메시지 리스너 등록 (시점별) ======
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
  if (isBarcodeAlreadyHighlighted(barcode)) {
    sendResponse({
      success: "duplicate",
      message: `${barcode}는 이미 검색했어요.`,
    });
    return;
  }
  const found = highlightBarcodeInDocument(barcode);
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

// ====== [3] 체크박스 처리 (조건별) ======
function handleCheckCheckbox(barcode, sendResponse) {
  const checked = checkAndMarkCheckboxByBarcode(barcode);
  sendResponse({
    success: checked,
    message: checked
      ? "체크박스를 체크했습니다!"
      : "일치하는 등록번호가 없습니다.",
  });
}

// 등록번호 찾기 예시 함수 (구현 필요)
function findRegistrationNumberElements() {
  // 실제 구현 필요: 등록번호가 포함된 row들을 반환
  // 예시: return document.querySelectorAll('.registration-row');
  return [];
}

const registrationRows = findRegistrationNumberElements();

registrationRows.forEach((row) => {
  const checked = checkAndMarkCheckbox(row);
  if (!checked) {
    highlightRow(row);
  }
});
