# Meta 動態：快速下拉、跳過看過的

給 Firefox 用的使用者腳本，適用 Facebook、Instagram、Threads 的首頁動態。手機（Android）和電腦（Mac、Windows）的 Firefox 都能用。

- **跳過看過的貼文**：一篇貼文有一半以上在畫面上停留超過 1 秒，就記成看過；之後重新打開或下拉時自動藏起來，不會一直看到同一篇。
- **快速下拉**：在頁面最上面往下拉，不會整頁重新載入（不會再閃「from Meta」）。腳本直接藏掉看過的貼文，露出頁面裡已經載好、還沒看過的，大約 0.3 秒就換好。Threads 出現「查看另外 N 則串文」時會自動點它。
- 如果 1.5 秒內沒有還沒看過的貼文可以顯示，才整頁重新載入，向伺服器要新貼文。

## 安裝

1. Firefox 安裝擴充套件 **Violentmonkey**（https://addons.mozilla.org/firefox/addon/violentmonkey/）。
2. 用 Firefox 打開下面的網址，按「安裝」：

   https://raw.githubusercontent.com/JJptt1980/meta-feed-skip-seen/main/meta-feed.user.js

之後有新版時，Violentmonkey 會自動更新。

手機上建議把三個網站用 Firefox 選單的「新增至主畫面」做成桌面捷徑，用起來像 App。

電腦版沒有下拉手勢：按 F5（Mac 是 ⌘R）重新整理時，看過的會自動藏起來，畫面上方會顯示「跳過 N 篇看過的」。

## 選單

在 Firefox 選單 → Violentmonkey 裡：

- **清除看過的記錄**：全部重來。
- **暫停跳過看過的**／**恢復跳過看過的**：暫時關掉或打開自動跳過。

## 運作方式與限制

- 看過的記錄存在各網站自己的瀏覽器儲存空間（localStorage），最多 4000 筆，只存在你的手機上，不會傳到任何地方。
- 只在首頁動態作用，個人頁、單篇貼文頁不會藏東西。
- Threads、Instagram 用貼文網址裡的編號辨識，很準。Facebook 沒有固定的貼文編號，改用作者和內文開頭辨識，所以內容幾乎一樣的兩篇偶爾會被當成同一篇。手機和電腦的看過記錄各自分開，不會互通。
- 手機下拉時，只有在頁面裡已經有還沒看過的貼文，才會這麼快；要從網路抓新貼文，還是得看網路和 Meta 伺服器的速度（通常 2 秒以上）。
- Meta 常改網頁結構，改版後腳本可能失效。

## 授權

MIT
