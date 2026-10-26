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

## 部署

本專案使用 Cloudflare Workers Static Assets，建置輸出為 `dist/`。語意搜尋由 Worker 安全呼叫 OpenAI Responses API，再查詢 Iconify。

部署後，在 Cloudflare Worker 設定 Secret：

```sh
npx wrangler secret put OPENAI_API_KEY
```

不要把 key 寫入 `wrangler.jsonc`、`.env` 或 GitHub。沒有這個 Secret 時，網站仍可載入，但語意搜尋會顯示未設定提示。
