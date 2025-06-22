chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search-barcode") {
    const barcode = request.barcode;
    let found = false;
    let firstMark = null;
    let duplicate = false;

    // 하이라이트 스타일이 이미 있으면 추가하지 않음
    if (!document.getElementById("barcode-highlight-style")) {
      const style = document.createElement("style");
      style.id = "barcode-highlight-style";
      style.textContent = `
                .highlight {
                    background-color: yellow;
                    font-weight: bold;
                }
            `;
      document.head.appendChild(style);
    }

    // 이미 하이라이트된 부분에 등록번호가 있는지 먼저 확인
    const highlighted = document.querySelectorAll(".highlight");
    highlighted.forEach((el) => {
      if (el.textContent === barcode) {
        duplicate = true;
      }
    });
    if (duplicate) {
      sendResponse({
        success: "duplicate",
        message: `${barcode}는 이미 검색했어요.`,
      });
      return true;
    }

    // 이미 하이라이트된 부분은 중복 감싸지 않음
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
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
      }
    }
    // 첫 번째 하이라이트로 스크롤
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (found) {
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
    return true;
  }
  if (request.action === "check-checkbox-by-barcode") {
    const barcode = request.barcode;
    // 등록번호-행 매핑 캐시
    if (!window.barcodeRowMap) {
      window.barcodeRowMap = new Map();
      const rows = document.querySelectorAll("table tr");
      rows.forEach((row) => {
        const tds = row.querySelectorAll("td");
        if (tds.length < 2) return;
        const regNum = tds[1].textContent.trim();
        window.barcodeRowMap.set(regNum, row);
      });
    }
    let checked = false;
    const row = window.barcodeRowMap.get(barcode);
    if (row) {
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }
      if (!row.classList.contains("on")) {
        row.classList.add("on");
      }
      checked = true;
    }
    sendResponse({
      success: checked,
      message: checked
        ? "체크박스를 체크했습니다!"
        : "일치하는 등록번호가 없습니다.",
    });
    return true;
  }
});
