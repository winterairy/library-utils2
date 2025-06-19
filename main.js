const { app, BrowserWindow, ipcMain } = require("electron");
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
ipcMain.handle("init-browser", async () => {
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--start-maximized", "--new-window"],
      ignoreDefaultArgs: ["--enable-automation"],
    });
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
      // 하이라이팅
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.textContent = `
                    .highlight {
                        background-color: yellow;
                        font-weight: bold;
                    }
                `;
        document.head.appendChild(style);
      });

      // 텍스트 노드 하이라이팅 및 스크롤
      await page.evaluate((searchText) => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        const nodes = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes(searchText)) {
            nodes.push(node);
          }
        }

        nodes.forEach((node) => {
          const span = document.createElement("span");
          span.className = "highlight";
          node.parentNode.insertBefore(span, node);
          span.appendChild(node);

          if (nodes.indexOf(node) === 0) {
            span.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        });
      }, barcode);

      return { success: true, message: `등록번호 ${barcode}를 찾았습니다!` };
    }

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
