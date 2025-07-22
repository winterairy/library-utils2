// ====== [1] 전역 변수 및 상태 ======
let successCount = 0;

// ====== [2] 팝업이 열릴 때 실행 ======
document.addEventListener("DOMContentLoaded", () => {
  loadSuccessCount();
  document.getElementById("searchBtn").addEventListener("click", searchBarcode);
  document.getElementById("barcode").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBarcode();
  });
});

// ====== [3] 성공 횟수 로드 및 표시 ======
function loadSuccessCount() {
  chrome.storage.local.get(["successCount"], (result) => {
    successCount = result.successCount || 0;
    updateSuccessCount();
  });
}

function updateSuccessCount() {
  const div = document.getElementById("successCount");
  if (successCount > 0) {
    div.innerHTML = `검색 성공: <span class="success-number">${successCount}</span>`;
  } else {
    div.innerHTML = `검색 성공: <span class="success-number">0</span>`;
  }
}

// ====== [4] 바코드 검색 및 처리 ======
function searchBarcode() {
  const barcodeInput = document.getElementById("barcode");
  const barcode = barcodeInput.value.trim();
  if (!barcode) {
    showStatus("바코드를 입력하세요.", "error");
    return;
  }
  // 전처리 없이 원본 barcode만 사용
  showStatus("검색 중...", "info");

  // 현재 탭에서 작업 시작을 background에 알림
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ action: "start-work", tabId: tabId });

    chrome.scripting.executeScript(
      { target: { tabId }, files: ["content.js"] },
      () => {
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

// ====== [5] 검색 결과 처리 (조건별 분기) ======
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
    chrome.storage.local.set({ successCount: successCount });
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

// ====== [6] 상태 메시지 표시 ======
function showStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = type;
  status.style.display = "block";
}
