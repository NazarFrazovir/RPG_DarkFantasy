'use strict';
// ===== ТОРГІВЛЯ: валюта «Попіл», торговець біля вогнища (купівля/продаж) =====

const PRICE = [15, 50, 140, 380, 1000]; // за рідкістю при ilvl 0
const SELL_RATE = 0.35;
const itemPrice = (it) => Math.round(PRICE[it.rar] * ilvlMul(it.ilvl));
const sellPrice = (it) => Math.max(1, Math.round(itemPrice(it) * SELL_RATE));
const potionPrice = () => 45 + 12 * G.level;

// ---------- Монети ----------
function dropCoins(e) {
  if (e.minion || e.ai === 'boss') return;
  const total = Math.max(1, Math.round(e.xp * 0.7 * rand(0.8, 1.2))), n = Math.min(3, Math.ceil(total / 12));
  for (let i = 0; i < n; i++) pickups.push({ type: 'coin', x: e.x, y: e.y, v: Math.max(1, Math.round(total / n)), vx: rand(-90, 90), vy: rand(-90, 90), t: 0 });
}
function updateCoin(p, d, dt) {
  if (p.t > 0.4 && d < P.magnet) { const a = angTo(p, P), s = 220 + (P.magnet - d) * 4; p.x += Math.cos(a) * s * dt; p.y += Math.sin(a) * s * dt; }
  if (d < 14) { p.done = true; P.ash += p.v; Sfx.play('pickup'); G.ashFlash = 0.6; }
}
function drawCoin(p, bx, by) {
  ctx.fillStyle = 'rgba(255,200,80,.25)'; ctx.fillRect(bx - 5, by - 5, 10, 10); ctx.fillStyle = '#a87a20'; ctx.fillRect(bx - 3, by - 3, 6, 6);
  ctx.fillStyle = '#f0c040'; ctx.fillRect(bx - 3, by - 3, 5, 5); ctx.fillStyle = '#fff0b0'; ctx.fillRect(bx - 2, by - 2, 2, 2);
}

// ---------- Крамниця ----------
function initShop() {
  const lv = Math.min(4, G.level);
  G.shop = { items: [] };
  for (let i = 0; i < 5; i++) G.shop.items.push(genItem(lv, rollRarity([18, 40, 30, 10, 2]), SLOTS[i % SLOTS.length].id));
}
const shopEl = $('#shop');
function shopCard(it, price, onClick, disabled) {
  const d = document.createElement('div'); d.className = 'shopRow' + (disabled ? ' off' : ''); d.style.setProperty('--rc', RARITY[it.rar].color);
  d.appendChild(iconEl(it, 2));
  const t = document.createElement('div'); t.className = 'shopTxt'; t.innerHTML = `<b style="color:${RARITY[it.rar].color}">${it.name}</b><small>${itemStats(it).map((a) => STAT[a.k].fmt(a.v) + ' ' + STAT[a.k].label).join(' · ')}</small>`; d.appendChild(t);
  const pr = document.createElement('span'); pr.className = 'price'; pr.textContent = '◆ ' + price; d.appendChild(pr);
  d.onclick = onClick; d.onmouseenter = () => shopTip(it); d.onmouseleave = () => shopTip(null);
  return d;
}
function shopTip(it) {
  const cur = it && P.equip[it.slot];
  $('#shopTip').innerHTML = it ? itemHtml(it, '') + (cur && cur !== it ? itemHtml(cur, 'Зараз одягнено') : '') : '<div class="tipHint">Клік по товару — купити<br>Клік по предмету в сумці — продати (' + Math.round(SELL_RATE * 100) + '% ціни)<br>Одягнене продати не можна</div>';
}
function renderShop() {
  $('#shopAsh').innerHTML = `Попіл: <b>◆ ${P.ash}</b> · Сумка ${P.bag.length}/${BAG_SIZE}`;
  const stock = $('#shopStock'), bag = $('#shopBag'); stock.innerHTML = ''; bag.innerHTML = '';
  G.shop.items.forEach((it) => {
    const price = itemPrice(it);
    stock.appendChild(shopCard(it, price, () => {
      if (P.ash < price) { toast('Не вистачає Попелу'); Sfx.play('hit'); return; }
      if (!pickupItem(it)) { toast('Сумка повна'); Sfx.play('hit'); return; }
      P.ash -= price; G.shop.items.splice(G.shop.items.indexOf(it), 1); Sfx.play('pickup'); shopTip(null); renderShop();
    }, P.ash < price));
  });
  if (!G.shop.items.length) stock.innerHTML = '<div class="tipHint">Товар розпродано.</div>';
  const pp = potionPrice(), pb = $('#shopPotion'); pb.className = 'shopRow' + (P.ash < pp || P.potions >= P.maxPotions ? ' off' : '');
  pb.innerHTML = `<div class="shopTxt"><b style="color:#d0304e">Цілюще зілля</b><small>Є ${P.potions}/${P.maxPotions}</small></div><span class="price">◆ ${pp}</span>`;
  pb.onclick = () => { if (P.ash < pp) { toast('Не вистачає Попелу'); return; } if (P.potions >= P.maxPotions) { toast('Більше не вміщається'); return; } P.ash -= pp; P.potions++; Sfx.play('potion'); renderShop(); };
  P.bag.forEach((it) => bag.appendChild(shopCard(it, sellPrice(it), () => { P.ash += sellPrice(it); discardItem(it); Sfx.play('pickup'); shopTip(null); renderShop(); }, false)));
  if (!P.bag.length) bag.innerHTML = '<div class="tipHint">Сумка порожня.</div>';
}
function openShop() {
  if (G.state !== 'play') return;
  if (!G.shop) initShop();
  G.state = 'shop'; renderShop(); shopTip(null); shopEl.classList.remove('hidden'); Sfx.play('click');
}
function closeShop() { shopEl.classList.add('hidden'); G.state = 'play'; saveGame(); }
$('#shopClose').onclick = closeShop;
