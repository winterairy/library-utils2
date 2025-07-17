export function highlightRow(element) {
  element.style.backgroundColor = "yellow"; // 원하는 스타일로 변경 가능
}

export function ensureHighlightStyle() {
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

export function isBarcodeAlreadyHighlighted(barcode) {
  const highlighted = document.querySelectorAll(".highlight");
  for (const el of highlighted) {
    if (el.textContent === barcode) return true;
  }
  return false;
}

export function highlightBarcodeInDocument(barcode) {
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
