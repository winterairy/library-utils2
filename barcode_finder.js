const puppeteer = require("puppeteer");
const readline = require("readline");

class BarcodeFinder {
  constructor(url) {
    this.url = url;
    this.browser = null;
    this.page = null;
  }

  async start() {
    // 브라우저 시작
    this.browser = await puppeteer.launch({
      headless: false, // 브라우저를 화면에 표시
      defaultViewport: null, // 브라우저 창 크기 자동 조절
      args: [
        "--start-maximized", // 브라우저를 최대화된 상태로 시작
        "--new-window", // 새 창으로 열기
      ],
      ignoreDefaultArgs: ["--enable-automation"], // 자동화 관련 메시지 숨기기
    });

    // 기본으로 열리는 첫 번째 탭을 재사용
    const pages = await this.browser.pages();
    this.page = pages[0];

    // 페이지 로드
    await this.page.goto(this.url, {
      waitUntil: ["networkidle0", "domcontentloaded"], // 페이지 로드 완료 대기
    });

    console.log("페이지 로딩 중...");

    try {
      // 페이지가 완전히 로드될 때까지 대기
      await this.page.waitForFunction(
        () => {
          return document.readyState === "complete";
        },
        {
          timeout: 30000, // 30초 타임아웃
          polling: 1000, // 1초마다 체크
        }
      );
      console.log("페이지가 완전히 로드되었습니다.");
    } catch (error) {
      console.log("페이지 로딩을 기다리는 중 타임아웃이 발생했습니다.");
      console.log("기본 검색 모드로 전환합니다.");
    }
  }

  async findRegistrationNumber(barcode) {
    try {
      // 페이지의 모든 텍스트 내용 가져오기
      const pageText = await this.page.evaluate(() => document.body.innerText);

      if (pageText.includes(barcode)) {
        console.log(`등록번호 ${barcode}를 찾았습니다!`);

        // 하이라이팅을 위한 스타일 추가
        await this.page.evaluate(() => {
          const style = document.createElement("style");
          style.textContent = `
                        .highlight {
                            background-color: yellow;
                            font-weight: bold;
                        }
                    `;
          document.head.appendChild(style);
        });

        // 텍스트 노드를 찾아서 하이라이팅하고 스크롤
        await this.page.evaluate((searchText) => {
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

            // 첫 번째로 찾은 요소로 스크롤
            if (nodes.indexOf(node) === 0) {
              span.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          });
        }, barcode);

        return true;
      }

      console.log(`등록번호 ${barcode}를 찾을 수 없습니다.`);
      return false;
    } catch (error) {
      console.error("검색 중 오류가 발생했습니다:", error);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 사용자 입력을 위한 인터페이스 생성
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // URL 입력 받기
  const url = await new Promise((resolve) => {
    rl.question("검색할 웹페이지 URL을 입력하세요: ", resolve);
  });

  const finder = new BarcodeFinder(url);

  try {
    await finder.start();

    // 바코드 입력 루프
    while (true) {
      const barcode = await new Promise((resolve) => {
        rl.question("\n바코드를 스캔하세요 (종료하려면 q 입력): ", resolve);
      });

      if (barcode.toLowerCase() === "q") {
        break;
      }

      await finder.findRegistrationNumber(barcode);
    }
  } finally {
    await finder.close();
    rl.close();
  }
}

main().catch(console.error);
