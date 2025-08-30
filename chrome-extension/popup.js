let successCount = 0;
let currentTabId = null;

// 팝업이 열릴 때 실행
document.addEventListener("DOMContentLoaded", () => {
  initCount();
  document.getElementById("searchBtn").addEventListener("click", searchBarcode);
  document.getElementById("barcode").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBarcode();
  });
});

window.onload = function () {
  // 2초 후에 스플래시 화면 숨김
  setTimeout(function () {
    document.getElementById("splash").style.display = "none";
    document.getElementById("main-content").style.display = "block";
  }, 2000); 
};

function initCount() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabId = tabs[0].id;
    const tabKey = `tab_${currentTabId}`;
    chrome.storage.local.get([tabKey], (result) => {
      successCount = result[tabKey]?.successCount || 0;
      updateSuccessCount();
    });
  });
}


 // 성공 횟수를 최신 값으로 업데이트 
function updateSuccessCount() {
  const div = document.getElementById("successCount");
  if (successCount > 0) {
    div.innerHTML = `검색 성공: <span class="success-number">${successCount}</span>`;
  } else {
    div.innerHTML = `검색 성공: <span class="success-number">0</span>`;
  }
}

/**
 * 입력된 바코드 검색
 * 성공 여부에 따라 상태 메시지와 카운트 관리
 */
function searchBarcode() {
  const barcodeInput = document.getElementById("barcode");
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    showStatus("바코드를 입력하세요.", "error");
    return;
  }

  showStatus("검색 중...", "info");

  // 현재 탭에서 작업 시작을 background에 알림
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const tabId = tab.id;
    // 현재 탭 ID 업데이트
    currentTabId = tabId; 
    chrome.runtime.sendMessage({ action: "start-work", tabId: tabId });

    const url = tab.url || "";
    if (url.startsWith("chrome://") || url.includes("chromewebstore.google.com")) {
      showStatus("이 페이지에는 스크립트를 주입할 수 없습니다.", "error");
      return;
    }

    chrome.scripting.executeScript(
      { target: { tabId, allFrames: true }, files: ["content.js"] },
      () => {
        if (chrome.runtime.lastError) {
          showStatus(`스크립트 주입 실패: ${chrome.runtime.lastError.message}`, "error");
          return;
        }
        chrome.tabs.sendMessage(
          tabId,
          { action: "search-barcode", barcode: barcode },
          (highlightResponse) => {
            chrome.tabs.sendMessage(
              tabId,
              {
                action: "check-checkbox-by-barcode",
                barcode: barcode,
              },
              (checkboxResponse) => {
                barcodeInput.value = "";
                handleSearchResult(highlightResponse);
              }
            );
          }
        );
      }
    );
  });
}

/**
 * 콘텐츠 스크립트의 하이라이트 결과를 받아 UI와 카운트 갱신
 * @param {{success: boolean|string, message: string}} highlightResponse - 검색 결과 응답
 */
function handleSearchResult(highlightResponse) {
  if (!highlightResponse) {
    showStatus(
      "확장 프로그램 권한 또는 CSP 문제로 content script가 동작하지 않습니다.",
      "error"
    );
    return;
  }
  if (highlightResponse.success === true) {
    showStatus(highlightResponse.message, "success");
    successCount++;
    // 탭별로 카운트 저장
    const tabKey = `tab_${currentTabId}`;
    chrome.storage.local.set({ [tabKey]: { successCount: successCount } });
    updateSuccessCount();
  } else if (highlightResponse.success === "duplicate") {
    showStatus(highlightResponse.message, "info");
  } else {
    showStatus(highlightResponse.message, "error");
    if (chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "검색 결과",
        message: "일치하는 등록번호가 없습니다.",
      });
    }
  }
}

/**
 * 상태 메시지를 표시
 * @param {string} message - 표시할 메시지
 * @param {'info'|'success'|'error'} [type='info'] - 메시지 유형
 */
function showStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = type;
  status.style.display = "block";
}
