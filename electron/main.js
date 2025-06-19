const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const puppeteer = require("puppeteer");

let mainWindow;
let browser = null;
let currentUrl = null; // 현재 로드된 URL 추적

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "icon.ico"), // 아이콘 파일이 있다면
  });

  mainWindow.loadFile("index.html");

  // 개발 모드에서는 개발자 도구 열기
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Puppeteer 브라우저 초기화
ipcMain.handle("init-browser", async (event, url) => {
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--start-maximized", "--new-window"],
      ignoreDefaultArgs: ["--enable-automation"],
    });
    const pages = await browser.pages();
    const page = pages[0];
    if (url && url.trim()) {
      await page.goto(url, {
        waitUntil: ["networkidle0", "domcontentloaded"],
      });
      currentUrl = url;
    } else {
      currentUrl = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 바코드 검색
ipcMain.handle("search-barcode", async (event, { url, barcode }) => {
  if (!browser) {
    return { success: false, message: "브라우저가 초기화되지 않았습니다." };
  }

  try {
    // 기본 탭 재사용
    const pages = await browser.pages();
    const page = pages[0];

    // URL이 변경된 경우에만 페이지 로드
    if (currentUrl !== url) {
      console.log("새 URL로 페이지 로드:", url);
      await page.goto(url, {
        waitUntil: ["networkidle0", "domcontentloaded"],
      });

      // 페이지 로딩 대기
      try {
        await page.waitForFunction(
          () => {
            return document.readyState === "complete";
          },
          {
            timeout: 30000,
            polling: 1000,
          }
        );
      } catch (error) {
        console.log("페이지 로딩 타임아웃");
      }

      currentUrl = url; // 현재 URL 업데이트
    } else {
      console.log("같은 URL이므로 페이지 재사용:", url);
    }

    // 텍스트 검색
    const pageText = await page.evaluate(() => document.body.innerText);

    if (pageText.includes(barcode)) {
      // 하이라이팅 스타일이 이미 있으면 추가하지 않음
      await page.evaluate(() => {
        if (!document.getElementById("barcode-highlight-style")) {
          const style = document.createElement("style");
          style.id = "barcode-highlight-style";
          style.textContent = `
            .highlight {
              background-color: yellow;
              font-weight: bold;
            }
          `;
          document.head.appendChild(style);
        }
      });

      // 기존 하이라이트는 유지, 이미 하이라이트된 부분은 중복 감싸지 않음
      await page.evaluate((searchText) => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let firstMark = null;
        let node;
        while ((node = walker.nextNode())) {
          // 이미 하이라이트된 부분은 건너뜀
          if (
            node.parentNode &&
            node.parentNode.classList &&
            node.parentNode.classList.contains("highlight")
          ) {
            continue;
          }
          if (node.textContent.includes(searchText)) {
            const span = document.createElement("span");
            let lastIndex = 0;
            let idx;
            while (
              (idx = node.textContent.indexOf(searchText, lastIndex)) !== -1
            ) {
              if (idx > lastIndex) {
                span.appendChild(
                  document.createTextNode(
                    node.textContent.slice(lastIndex, idx)
                  )
                );
              }
              const mark = document.createElement("span");
              mark.className = "highlight";
              mark.textContent = searchText;
              span.appendChild(mark);
              if (!firstMark) firstMark = mark;
              lastIndex = idx + searchText.length;
            }
            if (lastIndex < node.textContent.length) {
              span.appendChild(
                document.createTextNode(node.textContent.slice(lastIndex))
              );
            }
            node.parentNode.insertBefore(span, node);
            node.parentNode.removeChild(node);
          }
        }
        // 첫 번째 하이라이트로 스크롤
        if (firstMark) {
          firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, barcode);

      return { success: true, message: `등록번호 ${barcode}를 찾았습니다!` };
    }

    // 바코드를 찾지 못한 경우 알림 표시
    new Notification({
      title: "검색 결과",
      body: "일치하는 등록번호가 없습니다.",
    }).show();

    return {
      success: false,
      message: `등록번호 ${barcode}를 찾을 수 없습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `검색 중 오류가 발생했습니다: ${error.message}`,
    };
  }
});

// 브라우저 종료
ipcMain.handle("close-browser", async () => {
  if (browser) {
    await browser.close();
    browser = null;
    currentUrl = null; // URL 추적 초기화
  }
  return { success: true };
});

// 앱 종료 시 브라우저 정리
app.on("before-quit", async () => {
  if (browser) {
    await browser.close();
  }
});
