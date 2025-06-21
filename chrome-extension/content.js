chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search-barcode") {
    const barcode = request.barcode;
    let found = false;
    let firstMark = null;
    let duplicate = false;

    // 하이라이트 스타일이 이미 있으면 추가하지 않음
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
      } catch (e) {
        console.warn("스타일 적용 중 CSP 제한:", e);
      }
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
    // 첫 번째 하이라이트로 스크롤
    if (firstMark) {
      try {
        firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {
        console.warn("스크롤 중 CSP 제한:", e);
      }
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
    // 모든 테이블 row를 찾음
    const rows = document.querySelectorAll("table tr");
    let checked = false;
    rows.forEach((row) => {
      // 체크박스와 등록번호 셀을 찾음 (구조에 따라 인덱스 조정)
      const checkbox = row.querySelector('input[type="checkbox"]');
      const tds = row.querySelectorAll("td");
      if (tds.length < 2) return; // 구조에 따라 조정
      const regNum = tds[1].textContent.trim(); // 두 번째 셀에 등록번호가 있다고 가정
      if (regNum === barcode && checkbox) {
        try {
          checkbox.checked = true; // 또는 checkbox.click();
          checked = true;
        } catch (e) {
          console.warn("체크박스 조작 중 CSP 제한:", e);
        }
      }
    });
    sendResponse({
      success: checked,
      message: checked
        ? "체크박스를 체크했습니다!"
        : "일치하는 등록번호가 없습니다.",
    });
    return true;
  }
});
