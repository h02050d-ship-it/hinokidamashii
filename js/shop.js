// =====================================================
// ひのき魂 オンラインストア 共通スクリプト
// 商品データは hayazai.com/data/products.js (PRODUCTS) を
// 実行時に読み込む。表示価格 = price × 0.95 を10円未満切捨て。
// =====================================================

const SHOP = {
  ORDER_ENDPOINT: 'https://hayazai.com/shop/order.php',
  CART_KEY: 'hinokidamashii_cart',
  CATS: {
    flooring15: { label: '桧フローリング 15mm厚', desc: '本実加工・エンドマッチ付き。床材の定番。' },
    flooring12: { label: '桧フローリング 12mm厚', desc: 'リフォームや上張りに。軽くて扱いやすい12mm。' },
    panel:      { label: '桧羽目板 12mm厚',       desc: '壁・天井に。部屋中がひのきの香りに包まれます。' },
  },
  QUALITY_ORDER: { '節有': 1, '小節': 2, '特上小': 3, '無節': 4 },
};

// ---------- 価格 ----------

function shopPrice(p) {
  return Math.floor(p.price * 0.95 / 10) * 10;
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

// ---------- カート（localStorage には id と数量のみ。価格は常に最新データから再計算） ----------

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
}

function addToCart(id, qty) {
  const p = findProduct(id);
  if (!p) return;
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += qty;
  } else {
    cart.push({ id, qty });
  }
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
    return { ...i, product: p, unit: shopPrice(p), subtotal: shopPrice(p) * i.qty };
  });
}

function cartTotal() {
  return cartLines().reduce((s, l) => s + l.subtotal, 0);
}

function cartCount() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}

function cartHasLength(minLen) {
  return cartLines().some(l => l.product.length >= minLen);
}

function updateCartBadge() {
  const n = cartCount();
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = n;
    el.classList.toggle('is-empty', n === 0);
  });
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

// ---------- 商品一覧描画 ----------

function productCard(p) {
  const price = shopPrice(p);
  const perSheet = Math.round(price / p.qty);
  const gradeCls = p.grade === 'B' ? 'badge-b' : 'badge-a';
  return `
    <div class="p-card" data-id="${p.id}">
      <div class="p-card-img"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="p-card-body">
        <div class="p-badges">
          <span class="badge ${gradeCls}">${p.grade}級品</span>
          <span class="badge badge-q">${p.quality}</span>
        </div>
        <div class="p-size">${p.thick}×${p.width}×${p.length}mm <span class="p-qty">${p.qty}枚入</span></div>
        <div class="p-price-row">
          <span class="p-price-ref">モール価格 ${yen(p.price)}</span>
          <span class="p-off">5%OFF</span>
        </div>
        <div class="p-price">${yen(price)}<span class="p-tax">税込</span></div>
        <div class="p-per">1枚あたり 約${yen(perSheet)}</div>
        <div class="p-actions">
          <div class="qty-input">
            <button type="button" class="qty-btn" data-d="-1">−</button>
            <input type="number" class="qty-num" value="1" min="1" inputmode="numeric">
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
    root.innerHTML = '<p class="load-error">商品データを読み込めませんでした。時間をおいて再度お試しください。</p>';
    return;
  }
  root.innerHTML = Object.keys(SHOP.CATS).map(cat => {
    const list = items
      .filter(p => p.cat === cat)
      .sort((a, b) => a.length - b.length || (SHOP.QUALITY_ORDER[a.quality] || 9) - (SHOP.QUALITY_ORDER[b.quality] || 9) || a.grade.localeCompare(b.grade));
    if (list.length === 0) return '';
    const c = SHOP.CATS[cat];
    return `
      <section class="p-section" id="${cat}">
        <h2 class="p-section-title">${c.label}</h2>
        <p class="p-section-desc">${c.desc}</p>
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

// ---------- カートページ描画 ----------

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

  root.innerHTML = `
    <div class="cart-table-wrap">
      <table class="cart-table">
        <thead><tr><th></th><th>商品</th><th>単価</th><th>数量</th><th>小計</th><th></th></tr></thead>
        <tbody>
          ${lines.map(l => `
            <tr>
              <td><img class="cart-img" src="${l.product.img}" alt=""></td>
              <td class="cart-name">桧${l.product.cat === 'panel' ? '羽目板' : 'フローリング'} ${l.product.thick}×${l.product.width}×${l.product.length}mm ${l.product.quality}（${l.product.grade}級・${l.product.qty}枚入）</td>
              <td>${yen(l.unit)}</td>
              <td>
                <div class="qty-input">
                  <button type="button" class="qty-btn" onclick="setCartQty('${l.id}', ${l.qty - 1}); renderCartPage();">−</button>
                  <input type="number" class="qty-num" value="${l.qty}" min="1"
                    onchange="setCartQty('${l.id}', parseInt(this.value)); renderCartPage();">
                  <button type="button" class="qty-btn" onclick="setCartQty('${l.id}', ${l.qty + 1}); renderCartPage();">＋</button>
                </div>
              </td>
              <td class="cart-sub">${yen(l.subtotal)}</td>
              <td><button type="button" class="cart-del" title="削除" onclick="removeFromCart('${l.id}'); renderCartPage();">✕</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="cart-summary">
      <div class="cart-total-row">商品合計（税込）<strong>${yen(cartTotal())}</strong></div>
      <p class="cart-note">送料は別途かかります。ご注文後にお送りする確認メールで、送料込みの合計金額をご案内します。</p>
      ${cartHasLength(4000) ? '<p class="cart-note cart-note-warn">4m材を含むご注文：個人のお客様は西濃運輸の最寄り支店でのお受け取り（支店止め）となります。</p>' : ''}
      <a class="btn btn-primary btn-lg" href="order.html">ご注文手続きへ</a>
      <a class="link-back" href="products.html">← 買い物を続ける</a>
    </div>`;
}

// ---------- 注文ページ ----------

function renderOrderPage() {
  const root = document.getElementById('order-items');
  if (!root) return;
  const lines = cartLines();
  if (lines.length === 0) {
    location.href = 'cart.html';
    return;
  }
  root.innerHTML = lines.map(l => `
    <tr>
      <td>${l.product.name.replace(/^A級品 |^B級品 /, '')}（${l.product.grade}級）</td>
      <td class="ta-r">${yen(l.unit)}</td>
      <td class="ta-c">${l.qty}</td>
      <td class="ta-r">${yen(l.subtotal)}</td>
    </tr>`).join('');
  const totalEl = document.getElementById('order-total');
  if (totalEl) totalEl.textContent = yen(cartTotal());

  const warn4m = document.getElementById('warn-4m');
  if (warn4m) warn4m.style.display = cartHasLength(4000) ? '' : 'none';
}

async function submitOrder(form) {
  const btn = form.querySelector('button[type=submit]');
  const err = document.getElementById('order-error');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = '送信中…';

  const fd = new FormData(form);
  fd.set('cart_json', JSON.stringify(getCart()));

  try {
    const res = await fetch(SHOP.ORDER_ENDPOINT, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.ok) {
      saveCart([]);
      location.href = 'complete.html?order=' + encodeURIComponent(data.orderNo);
      return;
    }
    err.textContent = (data.errors || ['送信に失敗しました']).join(' / ');
  } catch {
    err.textContent = '通信エラーが発生しました。時間をおいて再度お試しいただくか、メール（info@hayazai.com）でご注文ください。';
  }
  btn.disabled = false;
  btn.textContent = '注文を確定する';
}

// ---------- 初期化 ----------

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderProducts();
  renderCartPage();
  renderOrderPage();

  const form = document.getElementById('order-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      submitOrder(form);
    });
  }

  const burger = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
