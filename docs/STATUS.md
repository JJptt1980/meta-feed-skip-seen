# STATUS

## 目前進度
- 2026-11-24 1.1.0：加電腦版（Mac Firefox）。@match 加 www.facebook.com，電腦版 FB 貼文用 [aria-posinset]，識別用作者（h2/h3/strong a）＋內文（data-ad-preview=message 等）前 80 字，抓不到才用內文前三行；Threads、IG 電腦版結構跟手機一樣（用使用者 Chrome 查過）。開頁時藏掉看過的會提示「跳過 N 篇看過的」。
- 2026-11-24 1.0.1：從「手機整理」專案搬出來公開（原本 1.0.0 在私人 repo 的 tools/meta-feed.user.js），加上 @updateURL 讓 Violentmonkey 自動更新。功能：記住看過的貼文（一半以上在畫面上超過 1 秒）、首頁動態自動藏掉；在頂端下拉用 touchmove preventDefault 擋掉 Firefox 整頁重新載入，改成藏掉看過的、捲回頂端（Threads 先點「查看另外 N 則串文」），1.5 秒內沒有新貼文才 location.reload()。1.0.0 已在 vivo X200 Pro 的 Firefox 桌面捷徑實測三站：放手約 0.3 秒換成沒看過的貼文；重開頁面看過的會藏。

## 已定案的決定
- 只做在手機 Firefox＋Violentmonkey；字型、藏開 App 按鈕由 JJptt1980/JJSans-download 的腳本負責，這裡不重複。
- 識別：Threads 用 /post/ 代碼、IG 用 /p/ 或 /reel/ 代碼、FB 用內文前三行（去掉時間、純數字、私用區圖示字元）。
- 只藏「這次打開頁面之前看過的」和「按下拉時一起算進來的」，邊滑邊看的不會當場消失。
- @namespace 保留 jjptt.phone-cleanup，避免手機上的 Violentmonkey 當成另一支腳本而重複。

## 下一步
- 無，等使用者回報。

## 已知問題
- FB 內容幾乎一樣的兩篇可能被當成同一篇。
- 手機裡沒有還沒看過的貼文時，還是要整頁重新載入（2 秒以上）。
