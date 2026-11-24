// ==UserScript==
// @name         Meta 動態：快速下拉、跳過看過的
// @namespace    jjptt.phone-cleanup
// @version      1.3.0
// @description  Facebook、Instagram、Threads 首頁動態（手機和電腦的 Firefox 都能用）：藏掉廣告（贊助貼文）；記住看過的貼文，下次出現自動藏起來；在最上面下拉時不重新載入整頁，直接藏掉看過的、露出後面還沒看的（Threads 有「查看另外 N 則串文」就先點它），比 Firefox 整頁重新載入快很多。
// @match        https://m.facebook.com/*
// @match        https://www.facebook.com/*
// @match        https://www.instagram.com/*
// @match        https://www.threads.com/*
// @match        https://www.threads.net/*
// @run-at       document-start
// @homepageURL  https://github.com/JJptt1980/meta-feed-skip-seen
// @updateURL    https://raw.githubusercontent.com/JJptt1980/meta-feed-skip-seen/main/meta-feed.user.js
// @downloadURL  https://raw.githubusercontent.com/JJptt1980/meta-feed-skip-seen/main/meta-feed.user.js
// @license      MIT
// @grant        GM_registerMenuCommand
// ==/UserScript==

/*
看過的定義：貼文有一半以上在畫面上超過 1 秒。
看過的記錄存在各網站自己的 localStorage（jjSeen），最多 4000 筆，只在這支手機的 Firefox 裡。
只在首頁動態作用；個人頁、單篇貼文頁不藏。
*/
(function () {
  'use strict';
  const host = location.hostname;
  const SITE = host.includes('facebook') ? 'fb' : host.includes('instagram') ? 'ig' : 'th';
  const FB_DESKTOP = host === 'www.facebook.com';
  const KEY = 'jjSeen';
  const MAX = 4000;
  const SEEN_MS = 1000;

  // ---------- 看過的記錄 ----------
  let seenList = [];
  try { seenList = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { seenList = []; }
  const seen = new Set(seenList);
  let saveTimer = 0;
  function markSeen(id) {
    if (!id || seen.has(id)) return;
    seen.add(id); seenList.push(id);
    if (seenList.length > MAX) { const drop = seenList.splice(0, seenList.length - MAX); drop.forEach(d => seen.delete(d)); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(seenList)); } catch (e) {} }, 500);
  }
  // 只藏「這次打開頁面之前」看過的，和按下拉時一起算進來的；邊滑邊看的不會當場消失
  const hideSet = new Set(seenList);
  let paused = false, showAds = false;
  try { paused = localStorage.getItem('jjSeenPaused') === '1'; showAds = localStorage.getItem('jjShowAds') === '1'; } catch (e) {}

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('清除看過的記錄', () => {
      seen.clear(); seenList = []; hideSet.clear();
      try { localStorage.removeItem(KEY); } catch (e) {}
      document.querySelectorAll('[data-jj-seen-hidden]').forEach(el => { el.style.display = ''; el.removeAttribute('data-jj-seen-hidden'); });
      toast('已清除看過的記錄');
    });
    GM_registerMenuCommand(paused ? '恢復跳過看過的' : '暫停跳過看過的', () => {
      try { localStorage.setItem('jjSeenPaused', paused ? '0' : '1'); } catch (e) {}
      location.reload();
    });
    GM_registerMenuCommand(showAds ? '隱藏廣告' : '顯示廣告', () => {
      try { localStorage.setItem('jjShowAds', showAds ? '0' : '1'); } catch (e) {}
      location.reload();
    });
  }

  // ---------- 各站：找貼文、取識別 ----------
  function isFeed() {
    const p = location.pathname;
    if (SITE === 'fb') return p === '/' || p === '/home.php';
    return p === '/';
  }
  function posts() {
    if (SITE === 'th') return [...document.querySelectorAll('[data-pagelet^="threads_feed_"]')];
    if (SITE === 'ig') return [...document.querySelectorAll('article')];
    if (FB_DESKTOP) return [...document.querySelectorAll('[aria-posinset]')];
    return [...document.querySelectorAll('[data-tracking-duration-id]')];
  }
  const TIME_RE = /^(\d+\s*(秒|分鐘|小時|天|週|周|個月|年)|昨天|剛剛|\d+月\d+日|\d{4}年)/;
  function postId(el) {
    if (SITE === 'th') {
      const a = el.querySelector('a[href*="/post/"]');
      const m = a && a.getAttribute('href').match(/\/post\/([^/?#]+)/);
      return m ? 'th:' + m[1] : null;
    }
    if (SITE === 'ig') {
      for (const a of el.querySelectorAll('a[href]')) {
        const m = a.getAttribute('href').match(/\/(?:p|reel)\/([^/?#]+)/);
        if (m) return 'ig:' + m[1];
      }
      return null;
    }
    // FB 沒有固定的貼文代碼：用作者＋內文開頭（去掉時間、按讚數這類會變的字）
    if (FB_DESKTOP) {
      const au = el.querySelector('h2 a, h3 a, h4 a, strong a, h2 span, h3 span');
      const msg = el.querySelector('[data-ad-preview="message"],[data-ad-comet-preview="message"],[data-ad-rendering-role="story_message"]');
      const a = au ? au.textContent.trim() : '', m = msg ? msg.textContent.trim().slice(0, 80) : '';
      if (a && m) return 'fb:' + a + '|' + m;
    }
    if (el.offsetHeight < 60) return null;
    const lines = (el.innerText || '').split('\n').map(s => s.trim())
      .filter(s => s.length > 1 && !TIME_RE.test(s) && !/^[\d,.\s萬千]+$/.test(s) && !/[-]|[\uDB80-\uDBFF]/.test(s));
    if (lines.length < 2) return null;
    return 'fb:' + lines.slice(0, 3).join('|').slice(0, 120);
  }

  // ---------- 廣告（贊助貼文）----------
  const AD_RE = /^(贊助|赞助|Sponsored|廣告)$/;
  const FB_TIME_RE = /(秒|分鐘|小時|天|週|周|個月|月|年|昨天|剛剛)|^\d+\s*[smhdwy]$/;
  function isAd(el) {
    if (SITE === 'fb' && FB_DESKTOP) {
      // 電腦版 FB 把「贊助」拆散成圖形；一般貼文作者下面有時間（aria-labelledby 指向「3小時」這類字），廣告沒有
      // 作者和作者下面那行（含圖形）都出來了才判斷，避免時間還沒載入就誤判
      if (!el.querySelector('h2 a, h3 a, h4 a, strong a, h2 span, h3 span') || !el.querySelector('use')) return false;
      for (const x of el.querySelectorAll('[aria-labelledby]')) {
        const t = document.getElementById((x.getAttribute('aria-labelledby') || '').split(' ')[0]);
        if (t && FB_TIME_RE.test(t.textContent)) return false;
      }
      return true;
    }
    if (SITE === 'fb') return /贊助|Sponsored/.test((el.innerText || '').slice(0, 150));
    // IG、Threads：貼文開頭幾行有一行就是「贊助」
    return (el.innerText || '').split('\n').slice(0, 8).some(l => AD_RE.test(l.trim()));
  }
  let adCount = 0;
  function hideAds() {
    if (showAds || !isFeed()) return 0;
    let n = 0;
    for (const el of posts()) {
      if (el.hasAttribute('data-jj-ad') || el.offsetHeight === 0 && el.style.display === 'none') continue;
      if (!(el.innerText || '').trim()) continue; // 還沒載入內容
      if (isAd(el)) { el.style.display = 'none'; el.setAttribute('data-jj-ad', '1'); n++; }
    }
    adCount += n;
    return n;
  }

  // ---------- 一出現就藏掉看過的（只在首頁動態）----------
  function hideSeen() {
    if (paused || !isFeed()) return 0;
    let n = 0;
    for (const el of posts()) {
      if (el.hasAttribute('data-jj-seen-hidden') || el.hasAttribute('data-jj-ad')) continue;
      const id = postId(el);
      if (id && hideSet.has(id)) {
        el.style.display = 'none'; el.setAttribute('data-jj-seen-hidden', '1'); n++;
      }
    }
    return n;
  }

  // ---------- 記錄看過的：一半以上在畫面上超過 1 秒 ----------
  const timers = new WeakMap();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const el = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        if (!timers.has(el)) timers.set(el, setTimeout(() => { markSeen(postId(el)); timers.delete(el); }, SEEN_MS));
      } else if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
    }
  }, { threshold: [0, 0.5] });
  const watched = new WeakSet();
  function watch() {
    for (const el of posts()) {
      if (watched.has(el)) continue;
      watched.add(el); io.observe(el);
    }
  }

  // 打開頁面時藏掉的篇數，累計後提示一次
  let loadHidden = 0, loadAds = 0, loadToastTimer = 0;
  function tick() {
    const a = hideAds();
    watch();
    const n = hideSeen();
    if (n || a) {
      loadHidden += n; loadAds += a; clearTimeout(loadToastTimer);
      loadToastTimer = setTimeout(() => {
        const msg = [loadHidden ? '跳過 ' + loadHidden + ' 篇看過的' : '', loadAds ? '藏 ' + loadAds + ' 則廣告' : ''].filter(Boolean).join('、');
        toast(msg); loadHidden = 0; loadAds = 0;
      }, 800);
    }
  }
  const mo = new MutationObserver(() => { if (!mo.pending) { mo.pending = true; requestAnimationFrame(() => { mo.pending = false; tick(); }); } });
  function start() { mo.observe(document.documentElement, { childList: true, subtree: true }); tick(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // ---------- 提示 ----------
  let toastEl;
  function toast(msg) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,.8);color:#fff;font:14px/1.4 sans-serif;padding:6px 14px;border-radius:16px;pointer-events:none;transition:opacity .3s';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 1500);
  }

  // ---------- 返回防誤觸（手機） ----------
  // 桌面捷徑（PWA）開的頁面，第一頁前面還有一個 Firefox 自己的空白頁：在動態首頁往內滑返回，
  // 會退到那個空白頁，看起來像當掉。一般分頁沒有上一頁時，滑一下 Firefox 就直接把頁面關掉。
  // 做法：在動態首頁多墊一筆上一頁（等使用者碰過畫面才墊），滑返回時畫面不動、只跳提示。
  //   捷徑：永遠擋住（要離開就從底部往上滑回主畫面）
  //   一般分頁：2 秒內再滑一次才離開
  if (matchMedia('(pointer: coarse)').matches) {
    const pwa = !matchMedia('(display-mode: browser)').matches;   // 捷徑開的：Threads 是 standalone、FB 是 minimal-ui
    let armed = false, rearm = 0;
    const isBase = st => !!(st && typeof st === 'object' && st.jjBase);
    // 網頁的 state 先轉成文字再複製（腳本和網頁不同沙盒，直接混用物件會出錯）
    const copy = st => { try { return JSON.parse(JSON.stringify(st ?? null)); } catch (e) { return null; } };
    const push = () => { const st = history.state; history.pushState(isBase(st) ? JSON.parse(st.jjOrig || 'null') : copy(st), '', location.href); };
    const arm = () => {
      if (armed || !isFeed() || document.readyState !== 'complete') return;
      if (!pwa && history.length > 1) { armed = true; return; }   // 一般分頁前面有真的上一頁，不用墊
      armed = true;
      history.replaceState({ jjBase: 1, jjOrig: JSON.stringify(copy(history.state)) }, '', location.href);
      push();
    };
    // 比網站自己的程式先收到：落在墊的那筆時不讓網站知道，畫面不動
    addEventListener('popstate', e => {
      if (!isBase(e.state)) return;
      e.stopImmediatePropagation();
      clearTimeout(rearm);
      if (pwa) { push(); toast('已是第一頁，要離開請從底部上滑'); return; }
      toast('再滑一次返回才會離開');
      rearm = setTimeout(() => { if (isBase(history.state)) push(); }, 2000);
    }, true);
    // Firefox 返回時會跳過使用者沒碰過的那幾筆，所以等使用者在首頁滑過／點過才墊
    addEventListener('touchend', () => { if (!armed) setTimeout(arm, 300); }, { capture: true, passive: true });
  }

  // ---------- 下拉：不重新載入，藏掉看過的 ----------
  const PULL = 70;
  let y0 = null, dy = 0, ind;
  function indicator() {
    if (!ind) {
      ind = document.createElement('div');
      ind.style.cssText = 'position:fixed;left:50%;top:0;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:#fff;color:#333;box-shadow:0 2px 6px rgba(0,0,0,.35);z-index:2147483647;display:flex;align-items:center;justify-content:center;font:22px/1 sans-serif;pointer-events:none;opacity:0';
      document.body.appendChild(ind);
    }
    return ind;
  }
  function atTop() { return (document.scrollingElement || document.documentElement).scrollTop <= 0; }
  function blocked(t) {
    // 打字、看大圖／限時動態、在有自己捲軸的面板裡，都不接手
    if (!t || !t.closest) return false;
    if (t.closest('input,textarea,[contenteditable=""],[contenteditable="true"],[role=dialog],video')) return true;
    for (let el = t; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 4 && el.scrollTop > 0 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return true;
    }
    return false;
  }
  addEventListener('touchstart', e => {
    y0 = (e.touches.length === 1 && isFeed() && atTop() && !blocked(e.target)) ? e.touches[0].clientY : null; dy = 0;
  }, { passive: true, capture: true });
  addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || !atTop()) { if (dy < 0) y0 = null; if (ind) ind.style.opacity = '0'; return; }
    e.preventDefault(); // 擋掉 Firefox 自己的整頁重新載入
    const d = Math.min(dy, PULL * 1.6);
    const i = indicator();
    i.style.opacity = String(Math.min(1, d / PULL));
    i.style.transform = 'translateY(' + (d * 0.8) + 'px)';
    i.textContent = dy >= PULL ? '↻' : '↓';
  }, { passive: false, capture: true });
  addEventListener('touchend', () => {
    if (y0 === null) return;
    const go = dy >= PULL; y0 = null;
    if (ind) { ind.style.opacity = '0'; ind.style.transform = ''; }
    if (go) refresh();
  }, { passive: true, capture: true });

  function visiblePosts() {
    const h = innerHeight;
    return posts().filter(el => { if (el.style.display === 'none') return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < h && r.height > 0; });
  }
  function refresh() {
    // Threads 已經抓好新串文時，直接點「查看另外 N 則串文」
    if (SITE === 'th') {
      const s = [...document.querySelectorAll('span')].find(x => /^查看另外.*串文$/.test(x.textContent.trim()));
      const b = s && s.closest('[role=button]');
      if (b) { b.click(); }
    }
    // 畫面上這幾篇算看過
    visiblePosts().forEach(el => markSeen(postId(el)));
    seen.forEach(id => hideSet.add(id));
    const n = hideSeen();
    (document.scrollingElement || document.documentElement).scrollTop = 0;
    toast(n ? '跳過 ' + n + ' 篇看過的' : '更新中…');
    // 1.5 秒內沒有還沒看過的貼文出現，才整頁重新載入
    const t0 = Date.now();
    (function check() {
      const fresh = visiblePosts().some(el => { const id = postId(el); return id && !seen.has(id); });
      if (fresh) return;
      if (Date.now() - t0 > 1500) { location.reload(); return; }
      setTimeout(check, 150);
    })();
  }
})();
