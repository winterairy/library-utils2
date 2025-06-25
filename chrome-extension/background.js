// 크롬 확장 프로그램의 service worker (필수, 현재는 기능 없음)

// 작업 중인 탭들을 추적
let activeWorkTabs = new Set();

// 팝업에서 작업 시작 시 호출되는 함수
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-work") {
    activeWorkTabs.add(request.tabId);
    sendResponse({ success: true });
  }
});

// 탭이 닫힐 때 해당 탭에서 작업했던 경우에만 초기화
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 해당 탭에서 작업했던 경우에만 초기화
  if (activeWorkTabs.has(tabId)) {
    chrome.storage.local.remove("successCount");
    activeWorkTabs.delete(tabId);
  }
});
