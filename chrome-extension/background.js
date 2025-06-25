// 크롬 확장 프로그램의 service worker (필수, 현재는 기능 없음)

// 탭이 닫힐 때 localStorage 초기화
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 모든 탭에서 localStorage 초기화
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: () => {
            localStorage.removeItem("successCount");
          },
        })
        .catch((err) => {
          // 일부 탭에서는 스크립트 실행이 불가능할 수 있음 (chrome://, about: 등)
          console.log("탭에서 스크립트 실행 불가:", err);
        });
    });
  });
});
