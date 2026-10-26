# Iconify 正體中文搜尋工具

用正體中文搜尋、預覽並複製 Iconify 圖示的開源前端小工具。

## 開發

```sh
npm install
npm run check
npm run build
npx wrangler dev
```

## 資料與授權

本工具使用 [Iconify 公開 API](https://api.iconify.design) 取得搜尋結果與 SVG，不重新打包 Iconify 圖示資料。Iconify 軟體與 API 的授權不代表每一個圖示集的授權；圖示集各自擁有授權條款。本工具會在結果與預覽中顯示圖示集、作者、授權及來源連結，使用者仍須依該圖示集授權履行署名或其他義務。

本 repository 的前端程式碼採 MIT License。第三方圖示資料與 Iconify API 不屬於本 repository 的 MIT 授權範圍。

## 服務、作者與責任揭露

- 專案負責與維護：Tonny／JoyYoungAI。
- 共同創作與 AI 協作：GPT-5.6-Luna；此標示不代表 AI 是法律上的著作權或服務責任主體。
- 免費服務與防禦機制：賽博菩薩提供。
- 圖示資料：Iconify API 與各圖示集原作者；每個圖示集的授權與署名要求不同。
- 語意搜尋：Groq API；受 Groq 模型、速率、額度與服務條款限制。
- 代管與防禦：Cloudflare Workers Static Assets、DDoS 防護與 Worker Rate Limiting。

第三方 API、免費服務、模型、額度與防禦規則可能變更或中斷。使用者仍須自行遵守各圖示集、Iconify、Groq、Cloudflare 與其他第三方服務條款；本工具不保證第三方服務的持續可用性或搜尋結果適用於特定用途。

## 部署

本專案使用 Cloudflare Workers Static Assets，建置輸出為 `dist/`。語意搜尋由 Worker 安全呼叫 Groq Chat Completions API，再查詢 Iconify。

部署後，在 Cloudflare Worker 設定 Secret：

```sh
npx wrangler secret put GROQ_API_KEY
```

不要把 key 寫入 `wrangler.jsonc`、`.env` 或 GitHub。沒有這個 Secret 時，網站仍可載入，但語意搜尋會顯示未設定提示。

搜尋 API 另有 Cloudflare Worker 限流：同一來源每 60 秒最多 10 次語意搜尋。前端會顯示 Cloudflare／Groq 的 HTTP 狀態與可用額度資訊；這是防止濫用的保護層，Groq Console 的組織與專案額度仍需另外設定。

Cloudflare 免費方案的標準 DDoS 防護已由 Cloudflare 自動提供；本專案另外加入安全 headers、API 來源檢查與 request body 大小限制。若日後接上自訂網域，建議在 Cloudflare Security 開啟免費 Bot Fight Mode，並建立針對 `/api/semantic-search` 的 WAF custom rule。
