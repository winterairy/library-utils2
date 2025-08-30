if (!window.__TABLE_BARCODE_HELPER_LOADED__) {
  window.__TABLE_BARCODE_HELPER_LOADED__ = true;

  /**
   * 주어진 테이블 선택자에서 바코드를 포함하는 행 검색
   * @param {string} tableSelector - 테이블을 가리키는 CSS 선택자
   * @param {string} barcode - 검색할 바코드 문자열
   * @returns {HTMLTableRowElement[]} 바코드 텍스트를 포함하는 tr 요소 목록
   */
  function findRows(tableSelector, barcode) {
    const table = document.querySelector(tableSelector);
    if (!table) return [];
    const rows = table.querySelectorAll("tr");
    return Array.from(rows).filter((row) => row.textContent.includes(barcode));
  }

  /**
   * 바코드가 포함된 행에 강조 클래스 추가
   * @param {string} tableSelector - 테이블을 가리키는 CSS 선택자
   * @param {string} barcode - 검색할 바코드 문자열
   * @returns {{found: boolean, firstMark: HTMLElement|null}} 처리 결과
   */
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

  /**
   * 바코드가 포함된 각 행에서 체크박스를 체크
   * @param {string} tableSelector - 테이블을 가리키는 CSS 선택자
   * @param {string} barcode - 검색할 바코드 문자열
   * @returns {{checked: boolean, hasCheckbox: boolean}} 체크 여부 및 체크박스 존재 여부
   */
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

  /**
   * 바코드를 전처리
   * @param {string} barcode - 원본 바코드 문자열
   * @returns {string} 전처리된 바코드 문자열
   */
  function preprocessBarcode(barcode) {
    const letters = barcode.replace(/[^A-Za-z]/g, "");
    let numbers = barcode.replace(/[A-Za-z]/g, "");
    // 숫자부 길이를 10자로 맞추기 위해 앞쪽에 0을 채움
    const zeroCount = 10 - numbers.length;
    const zeros = zeroCount > 0 ? "0".repeat(zeroCount) : "";
    return letters + zeros + numbers;
  }

  const tableSelector = ".table_10";

  /**
   * 팝업 또는 백그라운드에서 온 명령 처리
   * - action: 'search-barcode' | 'check-checkbox-by-barcode'
   */
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

  /**
   * 바코드를 하이라이트하고, 결과를 응답으로 반환
   * @param {(response: {success: boolean|string, message: string}) => void} sendResponse - 응답 콜백
   */
  function handleSearchBarcode(barcode, sendResponse) {
    barcode = preprocessBarcode(barcode);
    // 중복 하이라이트 방지: 이미 .on 클래스가 있으면 중복 처리
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
        message: `${barcode}가 있어요✅ 발송 완료!`,
      });
    } else {
      sendResponse({
        success: false,
        message: `${barcode}가 없어요❌ 발송 필요!`,
      });
    }
  }

  /**
   * 바코드가 포함된 행의 체크박스 체크 후 결과 반환
   * @param {(response: {success: boolean, message: string}) => void} sendResponse - 응답 콜백
   */
  function handleCheckCheckbox(barcode, sendResponse) {
    barcode = preprocessBarcode(barcode);
    const result = checkCheckboxes(tableSelector, barcode);
    let message;
    if (result.hasCheckbox) {
      message = result.checked
        ? "체크박스를 체크했습니다!"
        : "이미 체크되어 있습니다.";
    } else {
      message = "일치하는 등록번호가 있는 행에 체크박스가 없습니다.";
    }
    sendResponse({
      success: result.checked,
      message,
    });
  }
}
