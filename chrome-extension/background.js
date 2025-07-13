// 크롬 확장 프로그램의 service worker (필수, 현재는 기능 없음)

// 팝업에서 작업 시작 시 호출되는 함수
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-work") {
    // 활성 탭 ID를 스토리지에 저장
    chrome.storage.local.set({ activeWorkTabId: request.tabId });
    sendResponse({ success: true });
  }
});

// 탭이 닫힐 때 해당 탭에서 작업했던 경우에만 초기화
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 스토리지에서 활성 탭 ID를 확인
  chrome.storage.local.get(["activeWorkTabId"], (result) => {
    if (result.activeWorkTabId === tabId) {
      // 해당 탭에서 작업했던 경우에만 초기화
      chrome.storage.local.remove(["successCount", "activeWorkTabId"]);
    }
  });
});
