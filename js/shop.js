// =====================================================
// ひのき魂 オンラインストア 共通スクリプト
// 商品データは hayazai.com/data/products.js (PRODUCTS) を
// 実行時に読み込む。当店価格 = モール価格 × 0.95 を10円未満切捨て。
// =====================================================

const SHOP = {
  ORDER_ENDPOINT:  'https://hayazai.com/shop/order.php',
  SAMPLE_ENDPOINT: 'https://hayazai.com/shop/sample.php',
  CART_KEY: 'hinokidamashii_cart',
  CATS: {
    flooring15: { label: '桧フローリング 15mm厚', desc: '床材の定番。踏み心地がよく、無垢材の断熱効果も高い厚み。新築・大規模リフォームに。本実突付（ほんざねつきつけ）加工。' },
    flooring12: { label: '桧フローリング 12mm厚', desc: '既存の床への重ね張りに最適。段差が少なく済むため、リフォームで多く使われます。' },
    panel:      { label: '桧羽目板 12mm厚',       desc: '壁・天井に。薄くて軽く、施工しやすい内装材です。本実目透し（2mm目透し）仕上げ。' },
  },
  QUALITY_ORDER: { '節有': 1, '小節': 2, '特上小': 3, '無節': 4 },
  // 比較表に使う代表商品（トップページ）
  SAMPLE_ID: 'ff151082000a',
};

// ---------- 価格 ----------

// メーカー希望小売価格（税抜/1枚。A級の1820/3000/4000のみ。HPの価格表と同じ表）
const MSRP_PER_SHEET = {
  1820: { '節有': 1050, '小節': 1325, '特上小': 1500, '無節': 2200 },
  3000: { '節有': 1760, '小節': 2320, '特上小': 3300, '無節': 4000 },
  4000: { '節有': 2350, '小節': 3000, '特上小': 5000, '無節': 6000 },
};
function msrpPrice(p) {
  if (p.grade !== 'A') return null;
  const row = MSRP_PER_SHEET[p.length];
  const per = row ? row[p.quality] : null;
  return per ? Math.round(per * p.qty * 1.10) : null;
}

// 基準価格 = ヤフー店(products.js) と 楽天店(base_prices.js) のうち安い方
function basePrice(p) {
  const o = (window.SHOP_BASE_OVERRIDES || {})[p.id];
  return (o && o < p.price) ? o : p.price;
}

function shopPrice(p) {
  return Math.floor(basePrice(p) * 0.95 / 10) * 10;
}

function yen(n) {
  return '¥' + Number(n).toLocaleString();
}

function visibleProducts() {
  if (typeof PRODUCTS === 'undefined') return [];
  return PRODUCTS.filter(p => SHOP.CATS[p.cat] && p.price > 0 && p.qty > 0);
}

function findProduct(id) {
  return visibleProducts().find(p => p.id === id);
}

function shortName(p) {
  const kind = p.cat === 'panel' ? '桧羽目板' : '桧フローリング';
  return `${kind} ${p.thick}×${p.width}×${p.length}mm ${p.quality}（${p.grade}級・${p.qty}枚入）`;
}

// ---------- カート（idと数量のみ保存。価格は常に最新データから再計算） ----------

function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(SHOP.CART_KEY) || '[]');
    return raw.filter(item => findProduct(item.id));
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(SHOP.CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  updateStickyCart();
}

function addToCart(id, qty) {
  const p = findProduct(id);
  if (!p) return;
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) item.qty += qty; else cart.push({ id, qty });
  saveCart(cart);
  showToast('カートに入れました');
}

function setCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty | 0 || 1);
  saveCart(cart);
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
}

function cartLines() {
  return getCart().map(i => {
    const p = findProduct(i.id);
    return { ...i, product: p, unit: shopPrice(p), mall: basePrice(p), subtotal: shopPrice(p) * i.qty };
  });
}

function cartTotal() { return cartLines().reduce((s, l) => s + l.subtotal, 0); }
function cartMallTotal() { return cartLines().reduce((s, l) => s + l.mall * l.qty, 0); }
function cartCount() { return getCart().reduce((s, i) => s + i.qty, 0); }
function cartHasLength(minLen) { return cartLines().some(l => l.product.length >= minLen); }

function updateCartBadge() {
  const n = cartCount();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = n;
    el.classList.toggle('is-empty', n === 0);
  });
}

function updateStickyCart() {
  const bar = document.getElementById('sticky-cart');
  if (!bar) return;
  const n = cartCount();
  bar.classList.toggle('show', n > 0);
  document.body.classList.toggle('has-sticky', n > 0);
  const info = document.getElementById('sticky-cart-info');
  if (info) info.innerHTML = `カート ${n}点<strong>${yen(cartTotal())}</strong>`;
}

// ---------- トースト ----------

function showToast(msg) {
  let box = document.querySelector('.toast-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2400);
}

// ---------- トップページの価格比較 ----------

function renderPriceCompare() {
  const mallEl = document.getElementById('pc-mall');
  if (!mallEl) return;
  const p = findProduct(SHOP.SAMPLE_ID) || visibleProducts()[0];
  if (!p) return;
  mallEl.textContent = yen(basePrice(p));
  const shopEl = document.getElementById('pc-shop');
  if (shopEl) shopEl.textContent = yen(shopPrice(p));
  const msrpEl = document.getElementById('pc-msrp');
  if (msrpEl) { const m = msrpPrice(p); msrpEl.textContent = m ? yen(m) : '—'; }
  const note = document.getElementById('pc-note');
  if (note) {
    const diff = basePrice(p) - shopPrice(p);
    note.innerHTML = `※ ${shortName(p)} の場合。この商品なら <strong style="color:var(--price)">${yen(diff)}お得</strong>です。価格はモール側の改定に合わせて自動更新しています。`;
  }
}

// ---------- 商品一覧描画 ----------

function productCard(p) {
  const price = shopPrice(p);
  const save = basePrice(p) - price;
  const perSheet = Math.round(price / p.qty);
  const gradeCls = p.grade === 'B' ? 'badge-b' : 'badge-a';
  const pop = p.quality === '小節' ? '<span class="badge badge-pop">人気</span>' : '';
  return `
    <div class="p-card" data-id="${p.id}">
      <div class="p-card-img">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <span class="p-save-flag">${yen(save)}お得</span>
      </div>
      <div class="p-card-body">
        <div class="p-badges">
          <span class="badge ${gradeCls}">${p.grade}級品</span>
          <span class="badge badge-q">${p.quality}</span>
          ${pop}
        </div>
        <div class="p-size">${p.thick}×${p.width}×${p.length}mm <span class="p-qty">${p.qty}枚入</span></div>
        <div class="p-price-row">モール価格 <span class="p-price-ref">${yen(basePrice(p))}</span> → 当店</div>
        <div class="p-price">${yen(price)}<span class="p-tax">税込</span></div>
        <div class="p-per">1枚あたり 約${yen(perSheet)}</div>
        <div class="p-actions">
          <div class="qty-input">
            <button type="button" class="qty-btn" data-d="-1">−</button>
            <input type="number" class="qty-num" value="1" min="1" inputmode="numeric" aria-label="数量">
            <button type="button" class="qty-btn" data-d="1">＋</button>
          </div>
          <button type="button" class="btn btn-cart">カートに入れる</button>
        </div>
      </div>
    </div>`;
}

function renderProducts() {
  const root = document.getElementById('product-list');
  if (!root) return;
  const items = visibleProducts();
  if (items.length === 0) {
    root.innerHTML = '<p class="load-error">商品データを読み込めませんでした。時間をおいて再度お試しいただくか、info@hayazai.com までご連絡ください。</p>';
    return;
  }
  root.innerHTML = Object.keys(SHOP.CATS).map(cat => {
    const list = items
      .filter(p => p.cat === cat)
      .sort((a, b) => a.length - b.length
        || (SHOP.QUALITY_ORDER[a.quality] || 9) - (SHOP.QUALITY_ORDER[b.quality] || 9)
        || a.grade.localeCompare(b.grade));
    if (list.length === 0) return '';
    const c = SHOP.CATS[cat];
    return `
      <section class="p-section" id="${cat}">
        <div class="p-section-head">
          <h2>${c.label}</h2>
          <p>${c.desc}</p>
        </div>
        <div class="p-grid">${list.map(productCard).join('')}</div>
      </section>`;
  }).join('');

  root.addEventListener('click', e => {
    const card = e.target.closest('.p-card');
    if (!card) return;
    const input = card.querySelector('.qty-num');
    if (e.target.classList.contains('qty-btn')) {
      input.value = Math.max(1, (parseInt(input.value) || 1) + parseInt(e.target.dataset.d));
    }
    if (e.target.classList.contains('btn-cart')) {
      addToCart(card.dataset.id, Math.max(1, parseInt(input.value) || 1));
    }
  });
}

// ---------- カートページ ----------

function renderCartPage() {
  const root = document.getElementById('cart-root');
  if (!root) return;
  const lines = cartLines();

  if (lines.length === 0) {
    root.innerHTML = `
      <div class="cart-empty">
        <p>カートに商品がありません</p>
        <a class="btn btn-primary" href="products.html">商品一覧を見る</a>
      </div>`;
    return;
  }

  const saved = cartMallTotal() - cartTotal();

  root.innerHTML = `
    <div class="cart-layout">
      <div class="cart-list">
        ${lines.map(l => `
          <div class="cart-line">
            <img class="cart-img" src="${l.product.img}" alt="">
            <div class="cart-line-main">
              <div class="cart-name">${shortName(l.product)}</div>
              <div class="cart-unit"><s>モール ${yen(l.mall)}</s>当店 ${yen(l.unit)}／束</div>
            </div>
            <div class="cart-line-right">
              <div class="qty-input">
                <button type="button" class="qty-btn" onclick="setCartQty('${l.id}', ${l.qty - 1}); renderCartPage();">−</button>
                <input type="number" class="qty-num" value="${l.qty}" min="1" aria-label="数量"
                  onchange="setCartQty('${l.id}', parseInt(this.value)); renderCartPage();">
                <button type="button" class="qty-btn" onclick="setCartQty('${l.id}', ${l.qty + 1}); renderCartPage();">＋</button>
              </div>
              <div class="cart-sub">${yen(l.subtotal)}</div>
              <button type="button" class="cart-del" title="削除" aria-label="削除" onclick="removeFromCart('${l.id}'); renderCartPage();">✕</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="cart-summary">
        <div class="cart-total-row">商品合計（税込）<strong>${yen(cartTotal())}</strong></div>
        <div class="cart-saved">モールで買うより ${yen(saved)} お得です</div>
        <p class="cart-note">送料は別途かかります。ご注文後にお送りする確認メールで、送料込みの合計金額をご案内します。<strong>お支払いはその後です。</strong></p>
        ${cartHasLength(4000) ? '<p class="cart-note cart-note-warn">4m材を含むご注文：個人のお客様は西濃運輸の最寄り支店でのお受け取り（支店止め）となります。</p>' : ''}
        <a class="btn btn-primary btn-lg" href="order.html">ご注文手続きへ</a>
        <a class="link-back" href="products.html">← 買い物を続ける</a>
      </div>
    </div>`;
}

// ---------- 注文ページ ----------

function renderOrderPage() {
  const root = document.getElementById('order-items');
  if (!root) return;
  const lines = cartLines();
  if (lines.length === 0) { location.href = 'cart.html'; return; }

  root.innerHTML = lines.map(l => `
    <tr>
      <td>${shortName(l.product)}</td>
      <td class="ta-r">${yen(l.unit)}</td>
      <td class="ta-c">${l.qty}</td>
      <td class="ta-r">${yen(l.subtotal)}</td>
    </tr>`).join('');

  const totalEl = document.getElementById('order-total');
  if (totalEl) totalEl.textContent = yen(cartTotal());

  const savedEl = document.getElementById('order-saved');
  if (savedEl) savedEl.textContent = `モールで買うより ${yen(cartMallTotal() - cartTotal())} お得です`;

  const warn4m = document.getElementById('warn-4m');
  if (warn4m) warn4m.style.display = cartHasLength(4000) ? '' : 'none';
}

async function postForm(endpoint, form, extra) {
  const fd = new FormData(form);
  if (extra) Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
  const res = await fetch(endpoint, { method: 'POST', body: fd });
  return res.json();
}

async function submitOrder(form) {
  const btn = form.querySelector('button[type=submit]');
  const err = document.getElementById('order-error');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = '送信中…';
  try {
    const data = await postForm(SHOP.ORDER_ENDPOINT, form, { cart_json: JSON.stringify(getCart()) });
    if (data.ok) {
      saveCart([]);
      location.href = 'complete.html?order=' + encodeURIComponent(data.orderNo);
      return;
    }
    err.textContent = (data.errors || ['送信に失敗しました']).join(' / ');
  } catch {
    err.textContent = '通信エラーが発生しました。時間をおいて再度お試しいただくか、info@hayazai.com へメールでご注文ください。';
  }
  btn.disabled = false;
  btn.textContent = '注文を確定する';
}

async function submitSample(form) {
  const btn = form.querySelector('button[type=submit]');
  const err = document.getElementById('sample-error');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = '送信中…';
  try {
    const data = await postForm(SHOP.SAMPLE_ENDPOINT, form);
    if (data.ok) {
      location.href = 'complete.html?sample=1&order=' + encodeURIComponent(data.orderNo);
      return;
    }
    err.textContent = (data.errors || ['送信に失敗しました']).join(' / ');
  } catch {
    err.textContent = '通信エラーが発生しました。時間をおいて再度お試しいただくか、info@hayazai.com へメールでご請求ください。';
  }
  btn.disabled = false;
  btn.textContent = '無料サンプルを申し込む（送料も無料）';
}

// ---------- 初期化 ----------

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderPriceCompare();
  renderProducts();
  renderCartPage();
  renderOrderPage();
  updateStickyCart();

  const orderForm = document.getElementById('order-form');
  if (orderForm) orderForm.addEventListener('submit', e => { e.preventDefault(); submitOrder(orderForm); });

  const sampleForm = document.getElementById('sample-form');
  if (sampleForm) sampleForm.addEventListener('submit', e => { e.preventDefault(); submitSample(sampleForm); });

  const burger = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (burger && nav) burger.addEventListener('click', () => nav.classList.toggle('open'));

  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => q.closest('.faq-item').classList.toggle('open'));
  });
});
