/**
 * 팝업에서 작업 시작을 알리는 메시지를 처리
 * @param {{action: string, tabId?: number}} request - 요청 메시지
 * @param {chrome.runtime.MessageSender} sender - 메시지 보낸 주체
 * @param {(response: {success: boolean}) => void} sendResponse - 응답 콜백
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start-work") {
    // 활성 탭 ID를 스토리지에 저장
    chrome.storage.local.set({ activeWorkTabId: request.tabId });
    sendResponse({ success: true });
  }
});

/**
 * 탭이 닫힐 때 해당 탭의 카운트 및 관련 상태를
 * @param {number} tabId - 닫힌 탭의 ID
 * @param {chrome.tabs.TabRemoveInfo} removeInfo - 제거 정보
 */
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
