// 팝업에서 작업 시작 시 호출되는 함수
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-work") {
    // 활성 탭 ID를 스토리지에 저장 (기존 호환성을 위해 유지)
    chrome.storage.local.set({ activeWorkTabId: request.tabId });
    sendResponse({ success: true });
  }
});

// 탭이 닫힐 때 해당 탭의 카운트만 삭제
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 탭별 카운트 삭제
  const tabKey = `tab_${tabId}`;
  chrome.storage.local.remove([tabKey]);

  // 기존 activeWorkTabId도 함께 삭제 (해당 탭이었던 경우)
  chrome.storage.local.get(["activeWorkTabId"], (result) => {
    if (result.activeWorkTabId === tabId) {
      chrome.storage.local.remove(["activeWorkTabId"]);
    }
  });
});
