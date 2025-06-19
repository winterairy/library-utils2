document.getElementById("searchBtn").addEventListener("click", searchBarcode);

document.getElementById("barcode").addEventListener("keypress", function (e) {
  if (e.key === "Enter") searchBarcode();
});

function showStatus(message, type = "info") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = type;
  status.style.display = "block";
}

// 누적 성공 횟수 저장
let successCount = 0;

// storage에서 성공 횟수 불러오기
chrome.storage.local.get(["successCount"], function (result) {
  successCount = result.successCount || 0;
  updateSuccessCount();
});

function searchBarcode() {
  let barcodeInput = document.getElementById("barcode");
  let barcode = barcodeInput.value.trim();
  if (!barcode) {
    showStatus("바코드를 입력하세요.", "error");
    return;
  }
  // 영문 추출
  const letters = barcode.replace(/[^A-Za-z]/g, "");
  // 숫자만 추출
  let numbers = barcode.replace(/[A-Za-z]/g, "");
  if (numbers.length === 6) {
    numbers = "0000" + numbers;
  }
  const processedBarcode = letters + numbers;

  showStatus("검색 중...", "info");
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    // 1. 하이라이트/스크롤
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "search-barcode", barcode: processedBarcode },
      function (highlightResponse) {
        // 2. 체크박스 체크
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "check-checkbox-by-barcode", barcode: processedBarcode },
          function (checkboxResponse) {
            // 검색 후 입력창 초기화
            barcodeInput.value = "";
            if (!highlightResponse) {
              showStatus(
                "확장 프로그램 권한 또는 CSP 문제로 content script가 동작하지 않습니다.",
                "error"
              );
              return;
            }
            if (highlightResponse.success === true) {
              showStatus(highlightResponse.message, "success");
              // 성공 횟수 누적 및 저장/표시
              successCount++;
              chrome.storage.local.set({ successCount: successCount });
              updateSuccessCount();
            } else if (highlightResponse.success === "duplicate") {
              showStatus(highlightResponse.message, "info");
              // 성공 횟수는 누적시키지 않음
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
        );
      }
    );
  });
}

function updateSuccessCount() {
  const div = document.getElementById("successCount");
  if (successCount > 0) {
    div.innerHTML = `검색 성공한 횟수: <span class="success-number">${successCount}</span>`;
  } else {
    div.textContent = "";
  }
}
