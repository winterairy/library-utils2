chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "search-barcode") {
    const barcode = request.barcode;
    let found = false;
    let firstMark = null;

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
        message: `등록번호 ${barcode}를 찾았습니다!`,
      });
    } else {
      sendResponse({
        success: false,
        message: `등록번호 ${barcode}를 찾을 수 없습니다.`,
      });
    }
    return true;
  }
});
