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

function isBarcodeAlreadyHighlighted(barcode) {
  const highlighted = document.querySelectorAll(".highlight");
  for (const el of highlighted) {
    if (el.textContent === barcode) return true;
  }
  return false;
}

function highlightBarcodeInDocument(barcode) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  let node;
  let found = false;
  let firstMark = null;
  while ((node = walker.nextNode())) {
    if (
      node.parentNode &&
      node.parentNode.classList &&
      node.parentNode.classList.contains("highlight")
    ) {
      continue;
    }
    if (node.textContent.includes(barcode)) {
      found = true;
      try {
        const span = document.createElement("span");
        let lastIndex = 0;
        let idx;
        while ((idx = node.textContent.indexOf(barcode, lastIndex)) !== -1) {
          if (idx > lastIndex) {
            span.appendChild(
              document.createTextNode(node.textContent.slice(lastIndex, idx))
            );
          }
          const mark = document.createElement("span");
          mark.className = "highlight";
          mark.textContent = barcode;
          span.appendChild(mark);
          if (!firstMark) firstMark = mark;
          lastIndex = idx + barcode.length;
        }
        if (lastIndex < node.textContent.length) {
          span.appendChild(
            document.createTextNode(node.textContent.slice(lastIndex))
          );
        }
        node.parentNode.insertBefore(span, node);
        node.parentNode.removeChild(node);
      } catch (e) {
        console.warn("DOM 조작 중 CSP 제한:", e);
      }
    }
  }
  return { found, firstMark };
}

// ====== [3] 체크박스 처리 (조건별) ======
function handleCheckCheckbox(barcode, sendResponse) {
  let checked = false;
  const checkbox = document.querySelector(
    `input[type="checkbox"][id="${barcode}"]`
  );
  if (checkbox) {
    try {
      if (!checkbox.checked) {
        checkbox.click();
      }
      checked = true;
    } catch (e) {
      // 오류 발생 시 checked는 false로 유지
    }
  }
  sendResponse({
    success: checked,
    message: checked
      ? "체크박스를 체크했습니다!"
      : "일치하는 등록번호가 없습니다.",
  });
}
