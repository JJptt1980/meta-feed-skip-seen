# STATUS

## 目前進度
- 2026-11-24 1.3.0：返回防誤觸（手機）。使用者回報「手勢往內拖會跳到最外面而不是上一步，然後就當掉」。實測原因：Firefox 桌面捷徑（PWA）的第一頁前面還有一個 Firefox 自己的空白頁（navigation.entries 看得到），在動態首頁往內滑返回就退到空白頁，看起來像當掉；一般分頁沒有上一頁時則會直接把分頁關掉。做法：動態首頁在使用者第一次碰畫面後 replaceState 標記墊底那筆、再 pushState 一筆；popstate 落在墊底那筆時 stopImmediatePropagation（不讓網站知道）。捷徑（display-mode 不是 browser；Threads 是 standalone、FB 是 minimal-ui）永遠擋住並提示「已是第一頁，要離開請從底部上滑」；一般分頁沒有上一頁時 2 秒內再滑一次才離開。踩過的坑：Firefox 返回會跳過使用者沒碰過的那幾筆，所以一定要等碰過畫面才墊；腳本沙盒和網頁的 state 物件不能混用，要 JSON 轉文字再複製。實測 vivo X200 Pro 的 Firefox 捷徑：Threads、FB、IG 往內滑都停在動態並跳提示，連滑三次也擋住；IG 從個人頁滑返回正常回動態。
- 2026-11-24 FB 粉專介紹文已排程 11/24 08:00 發布（post 1466948699840024_122104877289554073），圖片貼文：右半主圖 Muse 生成，左邊 GB子 05 捷運比讚。
- 2026-11-24 1.2.0：藏廣告（data-jj-ad），選單「顯示廣告／隱藏廣告」（localStorage jjShowAds）。判斷：電腦版 FB 有作者、有 use 圖形、但沒有任何 aria-labelledby 指向時間字（小時、天…）就是廣告（在使用者 Chrome 的 FB 動態試過，35 篇抓出 7 篇都是廣告）；手機版 FB 看前 150 字有沒有「贊助」；IG、Threads 看前 8 行有沒有一行剛好是「贊助／Sponsored／廣告」。實測：Mac Firefox FB 使用者往下捲約 20 篇沒有廣告、一般貼文正常；手機 IG、Threads 各滑 12 頁畫面上沒有「贊助」。開頁提示改成「跳過 N 篇看過的、藏 N 則廣告」。
- 2026-11-24 1.1.0：加電腦版（Mac Firefox）。@match 加 www.facebook.com，電腦版 FB 貼文用 [aria-posinset]，識別用作者（h2/h3/strong a）＋內文（data-ad-preview=message 等）前 80 字，抓不到才用內文前三行；Threads、IG 電腦版結構跟手機一樣（用使用者 Chrome 查過）。開頁時藏掉看過的會提示「跳過 N 篇看過的」。2026-11-24 Mac Firefox 160 實測 FB：第二次開頁跳出「跳過 1 篇看過的」。Mac 的 IG、Threads 還沒測：IG 登入只能用存在 vivo 手機上的通行密鑰，Mac 叫不出手機掃碼視窗（陸版手機可能缺 Google 服務），也沒有其他驗證方式。
- 2026-11-24 1.0.1：從「手機整理」專案搬出來公開（原本 1.0.0 在私人 repo 的 tools/meta-feed.user.js），加上 @updateURL 讓 Violentmonkey 自動更新。功能：記住看過的貼文（一半以上在畫面上超過 1 秒）、首頁動態自動藏掉；在頂端下拉用 touchmove preventDefault 擋掉 Firefox 整頁重新載入，改成藏掉看過的、捲回頂端（Threads 先點「查看另外 N 則串文」），1.5 秒內沒有新貼文才 location.reload()。1.0.0 已在 vivo X200 Pro 的 Firefox 桌面捷徑實測三站：放手約 0.3 秒換成沒看過的貼文；重開頁面看過的會藏。

## 已定案的決定
- 只做在手機 Firefox＋Violentmonkey；字型、藏開 App 按鈕由 JJptt1980/JJSans-download 的腳本負責，這裡不重複。
- 識別：Threads 用 /post/ 代碼、IG 用 /p/ 或 /reel/ 代碼、FB 用內文前三行（去掉時間、純數字、私用區圖示字元）。
- 只藏「這次打開頁面之前看過的」和「按下拉時一起算進來的」，邊滑邊看的不會當場消失。
- @namespace 保留 jjptt.phone-cleanup，避免手機上的 Violentmonkey 當成另一支腳本而重複。

## 下一步
- 無，等使用者回報。

## 已知問題
- 捷徑裡的動態首頁無法用返回離開（設計如此），要從底部上滑回主畫面。
- FB 內容幾乎一樣的兩篇可能被當成同一篇。
- 手機裡沒有還沒看過的貼文時，還是要整頁重新載入（2 秒以上）。
