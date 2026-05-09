/**
 * Seed demo offers for Perkly catalog
 * Real Uzbekistan restaurants & cafes with Unsplash images
 * 
 * Run: node seed_demo.mjs
 */

const API = 'http://95.130.227.217/api';

async function post(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function registerUser(email, password, displayName) {
  // Try register first
  const res = await post('/auth/register', { email, password, displayName });
  if (res.id) return res.id;

  // Already exists — login and decode JWT
  const loginRes = await post('/auth/login', { email, password });
  if (loginRes.access_token) {
    // Decode JWT payload (base64)
    const payload = JSON.parse(
      Buffer.from(loginRes.access_token.split('.')[1], 'base64').toString()
    );
    return payload.sub;
  }
  
  console.error(`Failed to get ID for ${displayName}:`, res, loginRes);
  return null;
}

async function createOffer(data) {
  const res = await post('/offers', data);
  if (res.id) {
    console.log(`  ✅ ${data.title}`);
  } else {
    console.log(`  ❌ ${data.title}:`, JSON.stringify(res).slice(0, 100));
  }
  return res;
}

async function main() {
  console.log('🏪 Creating vendor accounts...\n');

  const vendors = {
    evos:    await registerUser('evos@perkly.demo',    'demo123456', 'Evos'),
    safia:   await registerUser('safia@perkly.demo',   'demo123456', 'Safia Coffee'),
    dodo:    await registerUser('dodo@perkly.demo',    'demo123456', 'Dodo Pizza'),
    oqtepa:  await registerUser('oqtepa@perkly.demo',  'demo123456', 'Oqtepa Lavash'),
    chopar:  await registerUser('chopar@perkly.demo',  'demo123456', 'Chopar Pizza'),
    plovbar: await registerUser('plovbar@perkly.demo', 'demo123456', 'The Plovbar'),
    kfc:     await registerUser('kfc@perkly.demo',     'demo123456', 'KFC Uzbekistan'),
    makro:   await registerUser('makro@perkly.demo',   'demo123456', 'Makro'),
  };

  for (const [name, id] of Object.entries(vendors)) {
    console.log(`  ${id ? '✅' : '❌'} ${name}: ${id || 'FAILED'}`);
  }

  console.log('\n🍕 Creating offers...\n');

  const offers = [
    // ===== EVOS (3 offers) =====
    {
      title: 'Evos: Комбо со скидкой 40%',
      description: 'Чизбургер, картошка фри и напиток 0.5л по суперцене. Акция действует во всех филиалах Ташкента.',
      price: 0.80, discountPercent: 40,
      vendorLogo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'EVOS-COMBO-40',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код кассиру до оплаты. Действует 1 раз на человека.',
      latitude: 41.3111, longitude: 69.2797,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.evos } },
    },
    {
      title: 'Evos: Бесплатный напиток',
      description: 'Получите любой напиток 0.5л бесплатно при заказе от 30 000 сум. Pepsi, Fanta, чай на выбор.',
      price: 0, discountPercent: 100,
      vendorLogo: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'EVOS-DRINK-FREE',
      isFlashDrop: false,
      usageInstructions: 'Назовите промокод кассиру. Действует при заказе от 30 000 сум.',
      latitude: 41.2995, longitude: 69.2401,
      seller: { connect: { id: vendors.evos } },
    },
    {
      title: 'Evos: Хот-дог за 1 000 сум',
      description: 'Фирменный хот-дог Evos всего за 1 000 сум вместо 15 000. Только по промокоду Perkly!',
      price: 0.50, discountPercent: 90,
      vendorLogo: 'https://images.unsplash.com/photo-1612392062126-31cc5ee40a1f?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'EVOS-HOTDOG-1K',
      isFlashDrop: true,
      expiresAt: '2026-05-10T23:59:00.000Z',
      usageInstructions: 'Покажите QR-код на кассе. Лимит: 1 хот-дог на человека.',
      latitude: 41.3152, longitude: 69.2920,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.evos } },
    },

    // ===== SAFIA COFFEE (3 offers) =====
    {
      title: 'Safia: Кофе L по цене M',
      description: 'Любой кофе размера Large по цене Medium. Латте, капучино, раф — на ваш выбор.',
      price: 0.30, discountPercent: 30,
      vendorLogo: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'SAFIA-UPGRADE-L',
      isFlashDrop: false,
      usageInstructions: 'Назовите промокод бариста или покажите QR-код при заказе.',
      latitude: 41.3113, longitude: 69.2794,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.safia } },
    },
    {
      title: 'Safia: Десерт в подарок',
      description: 'Бесплатный чизкейк или тирамису при покупке двух напитков. Действует до конца месяца.',
      price: 0, discountPercent: 100,
      vendorLogo: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'SAFIA-DESSERT-0',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код бариста. Один десерт на чек.',
      latitude: 41.3200, longitude: 69.2550,
      seller: { connect: { id: vendors.safia } },
    },
    {
      title: 'Safia: 2 кофе по цене 1',
      description: 'Акция 1+1: закажите любой кофе и получите второй такой же бесплатно. С 14:00 до 17:00.',
      price: 0.50, discountPercent: 50,
      vendorLogo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'SAFIA-1PLUS1',
      isFlashDrop: true,
      expiresAt: '2026-05-15T17:00:00.000Z',
      usageInstructions: 'Действует с 14:00 до 17:00. Покажите QR-код.',
      latitude: 41.3046, longitude: 69.2873,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.safia } },
    },

    // ===== DODO PIZZA (2 offers) =====
    {
      title: 'Dodo: Большая пицца в подарок',
      description: 'Купите 2 любые большие пиццы и получите третью бесплатно! Пепперони, Маргарита, 4 сыра.',
      price: 1.50, discountPercent: 33,
      vendorLogo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'DODO-3FOR2',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код при оформлении заказа в ресторане.',
      latitude: 41.3264, longitude: 69.2281,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.dodo } },
    },
    {
      title: 'Dodo: -50% на доставку',
      description: 'Скидка 50% на доставку при заказе через приложение Dodo. Минимальный заказ 50 000 сум.',
      price: 0.20, discountPercent: 50,
      vendorLogo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'DODO-DELIVERY-50',
      isFlashDrop: false,
      usageInstructions: 'Введите промокод в приложении Dodo Pizza при оформлении доставки.',
      latitude: 41.2985, longitude: 69.2405,
      seller: { connect: { id: vendors.dodo } },
    },

    // ===== OQTEPA LAVASH (2 offers) =====
    {
      title: 'Oqtepa: Лаваш + напиток за 20 000',
      description: 'Фирменный лаваш Oqtepa и напиток 0.5л всего за 20 000 сум вместо 35 000. Экономия 43%!',
      price: 0.60, discountPercent: 43,
      vendorLogo: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'OQTEPA-COMBO-20K',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код кассиру. Действует во всех филиалах Ташкента.',
      latitude: 41.3007, longitude: 69.2686,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.oqtepa } },
    },
    {
      title: 'Oqtepa: Бесплатный мини-лаваш',
      description: 'Получите мини-лаваш бесплатно при первом заказе через Perkly. Только новым пользователям!',
      price: 0, discountPercent: 100,
      vendorLogo: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'OQTEPA-FREE-MINI',
      isFlashDrop: true,
      expiresAt: '2026-05-20T23:59:00.000Z',
      usageInstructions: 'Только для новых пользователей. Покажите QR-код на кассе.',
      latitude: 41.3111, longitude: 69.2580,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.oqtepa } },
    },

    // ===== CHOPAR PIZZA (2 offers) =====
    {
      title: 'Chopar: -35% на любую пиццу',
      description: 'Скидка 35% на любую пиццу из меню Chopar. Тонкое тесто, свежие ингредиенты, быстрая подача.',
      price: 1.00, discountPercent: 35,
      vendorLogo: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'CHOPAR-35-OFF',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код на кассе до оплаты.',
      latitude: 41.3115, longitude: 69.2810,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.chopar } },
    },
    {
      title: 'Chopar: Комбо Семейное',
      description: '2 большие пиццы + 4 напитка + картошка фри за 99 000 сум вместо 160 000. Для всей семьи!',
      price: 2.00, discountPercent: 38,
      vendorLogo: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'CHOPAR-FAMILY',
      isFlashDrop: false,
      usageInstructions: 'Назовите промокод при заказе. Действует на посещение и самовывоз.',
      latitude: 41.2950, longitude: 69.2750,
      seller: { connect: { id: vendors.chopar } },
    },

    // ===== THE PLOVBAR (3 offers) =====
    {
      title: 'Plovbar: -30% на праздничный плов',
      description: 'Большая порция фирменного плова и салат ачичук по специальной цене. Филиал у метро Космонавтов.',
      price: 1.49, discountPercent: 30,
      vendorLogo: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'PLOVBAR-PLOV-30',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код официанту до оформления заказа.',
      latitude: 41.3120, longitude: 69.2800,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.plovbar } },
    },
    {
      title: 'Plovbar: Чай и самса бесплатно',
      description: 'Бесплатный чайник зелёного чая и 2 самсы при заказе любого плова. Уютная атмосфера!',
      price: 0, discountPercent: 100,
      vendorLogo: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'PLOVBAR-TEA-FREE',
      isFlashDrop: true,
      expiresAt: '2026-05-25T23:59:00.000Z',
      usageInstructions: 'Покажите QR-код официанту. Один купон на стол.',
      latitude: 41.3050, longitude: 69.2650,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.plovbar } },
    },
    {
      title: 'Plovbar: -20% на лагман',
      description: 'Горячий лагман, лепёшка и чай по скидке. Количество купонов ограничено!',
      price: 0.99, discountPercent: 20,
      vendorLogo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'PLOVBAR-LAGMAN-20',
      isFlashDrop: false,
      usageInstructions: 'Купон активируется сотрудником через сканер QR.',
      latitude: 41.3080, longitude: 69.2730,
      seller: { connect: { id: vendors.plovbar } },
    },

    // ===== KFC (2 offers) =====
    {
      title: 'KFC: Баскет за полцены',
      description: 'Баскет из 8 крылышек, картошка фри и соус по специальной цене. Только через Perkly!',
      price: 1.20, discountPercent: 50,
      vendorLogo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'KFC-BASKET-50',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код на кассе до оплаты.',
      latitude: 41.3145, longitude: 69.2850,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.kfc } },
    },
    {
      title: 'KFC: Бесплатные стрипсы',
      description: '3 куриных стрипса бесплатно при любом заказе от 40 000 сум. Хрустящие и сочные!',
      price: 0, discountPercent: 100,
      vendorLogo: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'KFC-STRIPS-FREE',
      isFlashDrop: true,
      expiresAt: '2026-05-12T23:59:00.000Z',
      usageInstructions: 'Назовите промокод кассиру. Заказ от 40 000 сум.',
      latitude: 41.3090, longitude: 69.2770,
      featuredUntil: '2026-06-01T00:00:00.000Z',
      seller: { connect: { id: vendors.kfc } },
    },

    // ===== MAKRO (1 offer) =====
    {
      title: 'Makro: -15% на всю выпечку',
      description: 'Скидка 15% на весь ассортимент свежей выпечки Makro. Хлеб, булочки, круассаны.',
      price: 0.30, discountPercent: 15,
      vendorLogo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
      category: 'RESTAURANTS', hiddenData: 'MAKRO-BAKERY-15',
      isFlashDrop: false,
      usageInstructions: 'Покажите QR-код на кассе супермаркета Makro.',
      latitude: 41.3180, longitude: 69.2620,
      seller: { connect: { id: vendors.makro } },
    },
  ];

  // Filter out offers with null vendor IDs
  const validOffers = offers.filter(o => {
    const sellerId = o.seller?.connect?.id;
    if (!sellerId) {
      console.log(`  ⚠️  Skipping "${o.title}" — vendor not found`);
      return false;
    }
    return true;
  });

  for (const offer of validOffers) {
    await createOffer(offer);
  }

  console.log(`\n✅ Done! Created ${validOffers.length} offers.`);
  console.log(`\n📋 Check: curl ${API}/offers?take=30 | python3 -m json.tool`);
}

main().catch(console.error);
