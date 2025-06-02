// ==UserScript==
// @name         网页论文提取下载工具
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  多平台优化的论文提取工具，可提取网页中的所有论文内容并按原始大小合并成文档，支持A4格式检测，深度内容检索，支持内容压缩以减小文件体积
// @author       Trae AI
// @match        *://*.etdlib.bnu.edu.cn/read/*
// @grant        GM_addStyle
// @grant        GM_saveTab
// @grant        unsafeWindow
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function () {
  "use strict";

  // 添加样式
  // 添加样式
  GM_addStyle(`
              #tm-thesis-extractor {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background-color: #2D8CF0;
                  color: white;
                  padding: 10px 15px;
                  border-radius: 5px;
                  cursor: pointer;
                  z-index: 9999;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
                  font-size: 14px;
              }
              #tm-thesis-extractor:hover {
                  background-color: #2b85e4;
              }
              #tm-thesis-status {
                  position: fixed;
                  bottom: 70px;
                  right: 20px;
                  background-color: rgba(0,0,0,0.7);
                  color: white;
                  padding: 10px;
                  border-radius: 5px;
                  z-index: 9999;
                  display: none;
                  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
                  font-size: 13px;
                  min-width: 200px;
              }
              #tm-thesis-progress {
                  width: 100%;
                  height: 5px;
                  background-color: #ddd;
                  border-radius: 3px;
                  margin-top: 5px;
              }
              #tm-thesis-progress-bar {
                  height: 100%;
                  background-color: #2D8CF0;
                  border-radius: 3px;
                  width: 0%;
              }
              #tm-thesis-options {
                  position: fixed;
                  bottom: 70px;
                  right: 20px;
                  background-color: white;
                  color: #333;
                  padding: 15px;
                  border-radius: 5px;
                  z-index: 9998;
                  display: none;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
                  font-size: 13px;
                  width: 250px;
              }
              #tm-thesis-options h3 {
                  margin-top: 0;
                  margin-bottom: 10px;
                  font-size: 15px;
                  color: #2D8CF0;
              }
              .tm-option-item {
                  margin-bottom: 8px;
              }
              .tm-option-item label {
                  display: flex;
                  align-items: center;
                  cursor: pointer;
              }
              .tm-option-item input {
                  margin-right: 8px;
              }
              .tm-button {
                  background-color: #2D8CF0;
                  color: white;
                  border: none;
                  padding: 5px 10px;
                  border-radius: 3px;
                  cursor: pointer;
                  margin-top: 10px;
              }
              .tm-button:hover {
                  background-color: #2b85e4;
              }
              .tm-settings-button {
                  position: fixed;
                  bottom: 20px;
                  right: 150px;
                  background-color: #F8F8F8;
                  color: #666;
                  padding: 10px 15px;
                  border-radius: 5px;
                  cursor: pointer;
                  z-index: 9999;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
                  font-size: 14px;
              }
              .tm-settings-button:hover {
                  background-color: #EFEFEF;
              }
          `);

  // 创建UI元素
  const button = document.createElement("div");
  button.id = "tm-thesis-extractor";
  button.textContent = "下载论文文档";
  document.body.appendChild(button);

  const settingsButton = document.createElement("div");
  settingsButton.className = "tm-settings-button";
  settingsButton.textContent = "设置";
  document.body.appendChild(settingsButton);

  const statusBox = document.createElement("div");
  statusBox.id = "tm-thesis-status";
  statusBox.innerHTML =
    '准备中...<div id="tm-thesis-progress"><div id="tm-thesis-progress-bar"></div></div>';
  document.body.appendChild(statusBox);

  // 创建设置面板
  const optionsPanel = document.createElement("div");
  optionsPanel.id = "tm-thesis-options";
  optionsPanel.innerHTML = `
          <h3>论文内容提取设置</h3>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-include-small" />
              包含小尺寸内容（图标等）
            </label>
          </div>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-prefer-a4" checked />
              优先提取A4比例内容
            </label>
          </div>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-deep-search" checked />
              深度检索文档内容
            </label>
          </div>
          <div class="tm-option-item">
            <label>内容质量：</label>
            <select id="tm-option-content-quality">
              <option value="0.3">低质量 (小文件)</option>
              <option value="0.5">中等质量</option>
              <option value="0.7" selected>良好质量</option>
              <option value="0.9">高质量 (大文件)</option>
            </select>
          </div>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-compress-content" checked />
              压缩内容 (减小文件大小)
            </label>
          </div>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-one-per-page" checked />
              每页一个内容单元
            </label>
          </div>
          <div class="tm-option-item">
            <label>
              <input type="checkbox" id="tm-option-auto-filename" checked />
              使用页面标题作为文件名
            </label>
          </div>
          <div class="tm-option-item">
            <label>最小内容尺寸：</label>
            <select id="tm-option-min-size">
              <option value="50">50px</option>
              <option value="100" selected>100px</option>
              <option value="200">200px</option>
              <option value="300">300px</option>
            </select>
          </div>
          <button class="tm-button" id="tm-options-save">保存设置</button>
        `;
  document.body.appendChild(optionsPanel);

  // 设置按钮点击事件
  settingsButton.addEventListener("click", function () {
    optionsPanel.style.display =
      optionsPanel.style.display === "block" ? "none" : "block";
  });

  // 保存设置按钮点击事件
  document
    .getElementById("tm-options-save")
    .addEventListener("click", function () {
      optionsPanel.style.display = "none";
      statusBox.style.display = "block";
      statusBox.textContent = "设置已保存！";
      setTimeout(() => {
        statusBox.style.display = "none";
      }, 2000);
    });

  // 点击按钮时执行提取操作
  button.addEventListener("click", extractThesisContent);

  // 主函数：提取论文内容并创建文档
  async function extractThesisContent() {
    const statusBox = document.getElementById("tm-thesis-status");
    const progressBar = document.getElementById("tm-thesis-progress-bar");
    statusBox.style.display = "block";
    statusBox.textContent = "正在收集论文内容...";
    statusBox.innerHTML =
      '正在收集论文内容...<div id="tm-thesis-progress"><div id="tm-thesis-progress-bar"></div></div>';

    // 获取用户设置
    const minSize =
      parseInt(document.getElementById("tm-option-min-size").value) || 100;
    const compressContent = document.getElementById(
      "tm-option-compress-content"
    ).checked;
    const contentQuality = parseFloat(
      document.getElementById("tm-option-content-quality").value
    );
    const preferA4 = document.getElementById("tm-option-prefer-a4").checked;
    const deepSearch = document.getElementById("tm-option-deep-search").checked;

    // 获取页面上所有内容
    let images = Array.from(document.querySelectorAll("img"));

    /**
     * @description 深度检索页面中的内容元素
     * @param {Element} rootElement - 要检索的根元素
     * @returns {Array} - 找到的内容元素数组
     */
    function deepSearchContent(rootElement) {
      const result = [];
      // 检索所有iframe中的内容
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        try {
          if (iframe.contentDocument) {
            const iframeImages = Array.from(
              iframe.contentDocument.querySelectorAll("img")
            );
            result.push(...iframeImages);
          }
        } catch (e) {
          console.log("无法访问iframe内容:", e);
        }
      });

      // 检索所有shadow DOM中的内容
      function searchShadowDOM(element) {
        if (element.shadowRoot) {
          const shadowImages = Array.from(
            element.shadowRoot.querySelectorAll("img")
          );
          result.push(...shadowImages);

          // 递归检索shadow DOM中的所有元素
          const shadowChildren = Array.from(
            element.shadowRoot.querySelectorAll("*")
          );
          shadowChildren.forEach((child) => searchShadowDOM(child));
        }
      }

      // 对所有元素进行shadow DOM检索
      const allElements = document.querySelectorAll("*");
      allElements.forEach((element) => searchShadowDOM(element));

      // 检索可能嵌套在canvas或SVG中的内容
      const canvasElements = document.querySelectorAll("canvas");
      canvasElements.forEach((canvas) => {
        // 尝试从canvas中提取内容数据
        try {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const canvasImage = new Image();
            canvasImage.src = canvas.toDataURL();
            canvasImage.dataset.fromCanvas = "true";
            result.push(canvasImage);
          }
        } catch (e) {
          console.log("无法从canvas提取内容:", e);
        }
      });

      return result;
    }

    // 如果启用了深度检索，执行深度内容检索
    if (deepSearch) {
      const deepContent = deepSearchContent(document);
      images = images.concat(deepContent);
      console.log(`深度检索找到 ${deepContent.length} 个额外内容`);
    }

    // 特别处理超星平台的内容
    // 处理可能的懒加载内容
    const lazyImages = Array.from(
      document.querySelectorAll(
        "img[data-src], img[data-original], img[data-lazy-src]"
      )
    );
    lazyImages.forEach((img) => {
      if (img.dataset.src && !img.src.includes(img.dataset.src)) {
        img.src = img.dataset.src;
      } else if (
        img.dataset.original &&
        !img.src.includes(img.dataset.original)
      ) {
        img.src = img.dataset.original;
      } else if (
        img.dataset.lazySrc &&
        !img.src.includes(img.dataset.lazySrc)
      ) {
        img.src = img.dataset.lazySrc;
      }
    });

    // 处理超星特有的内容容器
    const chaoxingContainers = document.querySelectorAll(
      ".imgtxt, .imgc, .media, .ans-attach-ct"
    );
    chaoxingContainers.forEach((container) => {
      const containerImages = Array.from(container.querySelectorAll("img"));
      images = images.concat(containerImages);
    });

    // 处理可能被隐藏的内容
    const hiddenImages = Array.from(
      document.querySelectorAll(
        ".hidden img, [style*='display: none'] img, [style*='visibility: hidden'] img"
      )
    );
    hiddenImages.forEach((img) => {
      // 确保内容可见以便获取其尺寸
      const originalDisplay = img.style.display;
      const originalVisibility = img.style.visibility;
      img.style.display = "block";
      img.style.visibility = "visible";

      // 添加到内容集合
      images.push(img);

      // 恢复原始样式
      setTimeout(() => {
        img.style.display = originalDisplay;
        img.style.visibility = originalVisibility;
      }, 100);
    });

    // 去重
    images = Array.from(new Set(images));

    // 过滤掉太小的内容（可能是图标或装饰元素）
    let validImages = images.filter((img) => {
      return img.naturalWidth > minSize && img.naturalHeight > minSize;
    });

    /**
     * @description 检测内容是否接近A4比例
     * @param {HTMLImageElement} img - 内容元素
     * @returns {boolean} - 是否接近A4比例
     */
    function isA4Ratio(img) {
      // A4纸张比例约为1:1.414 (210mm:297mm)
      const A4_RATIO = 1.414;
      const imgRatio = img.naturalHeight / img.naturalWidth;
      // 允许10%的误差范围
      return (
        Math.abs(imgRatio - A4_RATIO) / A4_RATIO < 0.1 ||
        Math.abs(1 / imgRatio - A4_RATIO) / A4_RATIO < 0.1
      );
    }

    // 如果启用了A4优先选项，对内容进行排序
    if (preferA4 && validImages.length > 0) {
      // 将内容分为A4比例和非A4比例两组
      const a4Images = validImages.filter((img) => isA4Ratio(img));
      const nonA4Images = validImages.filter((img) => !isA4Ratio(img));

      // 如果找到了A4比例的内容，优先使用它们
      if (a4Images.length > 0) {
        console.log(`找到 ${a4Images.length} 个A4比例内容`);
        // 如果只有少量A4内容，可能需要补充一些非A4内容
        if (a4Images.length < 3 && nonA4Images.length > 0) {
          validImages = [...a4Images, ...nonA4Images];
        } else {
          validImages = a4Images;
        }
      }
    }

    if (validImages.length === 0) {
      statusBox.textContent = "未找到有效内容！";
      setTimeout(() => {
        statusBox.style.display = "none";
      }, 3000);
      return;
    }

    // 显示压缩信息
    const compressionInfo = compressContent
      ? `（使用${
          contentQuality === 0.3
            ? "低"
            : contentQuality === 0.5
            ? "中"
            : contentQuality === 0.7
            ? "良好"
            : "高"
        }质量压缩）`
      : "（无压缩）";

    statusBox.innerHTML = `找到 ${validImages.length} 个内容，正在处理...${compressionInfo}<div id="tm-thesis-progress"><div id="tm-thesis-progress-bar"></div></div>`;
    progressBar.style.width = "0%";

    // 创建文档
    const { jsPDF } = window.jspdf;

    /**
     * @description 创建标准A4尺寸的文档页面
     * @param {jsPDF} doc - 文档对象
     * @param {string} orientation - 页面方向，'p'为纵向，'l'为横向
     * @returns {Object} - 返回页面尺寸信息
     */
    function createA4Page(doc, orientation = "p") {
      // A4尺寸为210mm x 297mm，转换为pt (1mm = 2.83pt)
      const width = orientation === "p" ? 595 : 842; // 210mm x 2.83 ≈ 595pt
      const height = orientation === "p" ? 842 : 595; // 297mm x 2.83 ≈ 842pt

      if (doc.getNumberOfPages() === 0) {
        doc.addPage([width, height], orientation);
      } else {
        doc.addPage([width, height], orientation);
      }

      return { width, height };
    }

    // 先创建一个默认文档，使用A4尺寸
    const doc = new jsPDF();
    doc.deletePage(1); // 删除默认页面
    let currentPage = 0;

    // 处理每个内容单元
    for (let i = 0; i < validImages.length; i++) {
      const img = validImages[i];
      const progress = Math.round((i / validImages.length) * 100);
      progressBar.style.width = `${progress}%`;
      statusBox.innerHTML = `处理内容 ${i + 1}/${
        validImages.length
      }...<div id="tm-thesis-progress"><div id="tm-thesis-progress-bar" style="width:${progress}%"></div></div>`;

      try {
        // 获取内容的原始URL
        const imgUrl = img.src;

        // 将内容转换为base64
        const imgData = await getBase64Content(img);
        if (!imgData) continue;

        // 获取内容尺寸
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // 确定页面方向
        const isLandscape = imgWidth > imgHeight;
        const orientation = isLandscape ? "l" : "p";

        // 检查是否为A4比例内容
        const isA4 = isA4Ratio(img);

        // 创建页面 - 如果是A4比例内容使用标准A4尺寸，否则使用内容尺寸
        let pageWidth, pageHeight;

        if (isA4 || preferA4) {
          // 使用标准A4尺寸
          const pageSize = createA4Page(doc, orientation);
          pageWidth = pageSize.width;
          pageHeight = pageSize.height;
        } else {
          // 使用内容原始尺寸
          pageWidth = imgWidth * 0.75;
          pageHeight = imgHeight * 0.75;

          if (currentPage > 0) {
            doc.addPage([pageWidth, pageHeight], orientation);
          } else {
            doc.addPage([pageWidth, pageHeight], orientation);
          }
        }

        // 计算内容在页面上的位置和尺寸，使其居中且适应页面
        let drawWidth, drawHeight, xOffset, yOffset;

        // 计算内容适应页面的尺寸
        const widthRatio = pageWidth / (imgWidth * 0.75);
        const heightRatio = pageHeight / (imgHeight * 0.75);
        const scaleFactor = Math.min(widthRatio, heightRatio, 1); // 不超过原始尺寸

        drawWidth = imgWidth * 0.75 * scaleFactor;
        drawHeight = imgHeight * 0.75 * scaleFactor;

        // 计算居中位置
        xOffset = (pageWidth - drawWidth) / 2;
        yOffset = (pageHeight - drawHeight) / 2;

        // 将内容添加到文档，使用计算后的尺寸和位置
        doc.addImage(imgData, "JPEG", xOffset, yOffset, drawWidth, drawHeight);
        currentPage++;
      } catch (error) {
        console.error("处理内容时出错:", error);
      }
    }

    // 保存文档
    const pageTitle = document.title || "网页论文";
    const safeTitle = pageTitle
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")
      .substring(0, 50);
    statusBox.textContent = "正在生成文档...";

    // 使用FileSaver.js提供文件保存对话框
    try {
      // 生成文档数据
      const docBlob = doc.output("blob");

      // 使用FileSaver.js的saveAs函数显示保存对话框
      window.saveAs(docBlob, `${safeTitle}_论文文档.pdf`);

      statusBox.textContent = "文档已生成，请选择保存位置！";
      setTimeout(() => {
        statusBox.style.display = "none";
      }, 3000);
    } catch (error) {
      console.error("保存文档时出错:", error);
      statusBox.textContent = "保存文档时出错，请重试！";
      setTimeout(() => {
        statusBox.style.display = "none";
      }, 3000);
    }
  }

  /**
   * @description 将内容转换为base64格式，支持压缩功能和增强的内容处理
   * @param {HTMLImageElement} img - 内容元素
   * @returns {Promise<string|null>} - 返回base64格式的内容数据或null
   */
  async function getBase64Content(img) {
    return new Promise((resolve) => {
      try {
        // 获取用户设置
        const compressContent = document.getElementById(
          "tm-option-compress-content"
        ).checked;
        const contentQuality = parseFloat(
          document.getElementById("tm-option-content-quality").value
        );
        const preferA4 = document.getElementById("tm-option-prefer-a4").checked;

        // 处理超星特有的内容URL
        let imgSrc = img.src;

        // 超星平台的内容URL处理
        if (
          imgSrc.includes("chaoxing.com") ||
          imgSrc.includes("ssreader.com")
        ) {
          // 移除可能的尺寸限制参数
          imgSrc = imgSrc.replace(/[?&](w|h|width|height)=\d+/g, "");
          imgSrc = imgSrc.replace(/[?&]resize=\d+x\d+/g, "");
          imgSrc = imgSrc.replace(/[?&]quality=\d+/g, "");

          // 尝试获取高清版本
          if (imgSrc.includes("_thumb")) {
            imgSrc = imgSrc.replace("_thumb", "");
          }
          if (imgSrc.includes("/thumb/")) {
            imgSrc = imgSrc.replace("/thumb/", "/original/");
          }
        }

        // 检查是否有data-original或其他高清属性
        if (img.dataset.original) {
          imgSrc = img.dataset.original;
        } else if (img.dataset.src) {
          imgSrc = img.dataset.src;
        } else if (img.dataset.lazySrc) {
          imgSrc = img.dataset.lazySrc;
        }

        // 尝试使用fetch获取跨域内容
        const fetchContent = async () => {
          try {
            const response = await fetch(imgSrc, {
              method: "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Referer: window.location.href,
              },
              cache: "no-cache",
              mode: "cors",
            });

            if (response.ok) {
              const blob = await response.blob();
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
            }
          } catch (e) {
            console.log("Fetch方法失败，尝试canvas方法:", e);
          }
          return null;
        };

        // 首先尝试fetch方法
        fetchContent().then((fetchResult) => {
          if (fetchResult) {
            // 如果需要压缩或A4调整，使用canvas处理
            if (compressContent || preferA4) {
              processWithCanvas(fetchResult);
            } else {
              resolve(fetchResult);
            }
          } else {
            // fetch失败，使用canvas方法
            processWithCanvas();
          }
        });

        function processWithCanvas(existingData = null) {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const processImg = new Image();
          processImg.crossOrigin = "anonymous";

          processImg.onload = function () {
            let { width, height } = processImg;

            // A4比例调整
            if (preferA4) {
              const A4_RATIO = 1.414; // A4纸张比例
              const currentRatio = height / width;

              if (Math.abs(currentRatio - A4_RATIO) / A4_RATIO > 0.1) {
                // 如果不是A4比例，进行调整
                if (currentRatio > A4_RATIO) {
                  // 太高，调整高度
                  height = width * A4_RATIO;
                } else {
                  // 太宽，调整宽度
                  width = height / A4_RATIO;
                }
              }
            }

            canvas.width = width;
            canvas.height = height;

            // 绘制内容
            ctx.drawImage(processImg, 0, 0, width, height);

            // 转换为base64
            try {
              const quality = compressContent ? contentQuality : 0.9;
              const result = canvas.toDataURL("image/jpeg", quality);
              resolve(result);
            } catch (e) {
              console.error("Canvas转换失败:", e);
              resolve(null);
            }
          };

          processImg.onerror = function () {
            console.error("内容加载失败:", imgSrc);
            resolve(null);
          };

          // 如果有现有数据，使用它；否则使用原始src
          processImg.src = existingData || imgSrc;
        }
      } catch (error) {
        console.error("处理内容时出错:", error);
        resolve(null);
      }
    });
  }
})();
