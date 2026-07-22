'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PUBLIC_COPY_UZ } from '@/content/public-copy-uz';

export type AppLanguage = 'ru' | 'uz';

const STORAGE_KEY = 'perkly-language';
const COOKIE_KEY = 'perkly_language';
const LANGUAGE_EVENT = 'perkly-language-change';

// UI copy only. User-generated product names, descriptions and chat messages are
// deliberately not translated: the author remains responsible for their wording.
const RU_TO_UZ: Record<string, string> = {
  ...PUBLIC_COPY_UZ,
  'Поиск': 'Qidiruv',
  'Купоны': 'Kuponlar',
  'Каталог': 'Katalog',
  'Чаты': 'Chatlar',
  'Профиль': 'Profil',
  'Карта': 'Xarita',
  'Топка': 'Topka',
  'Планы': 'Rejalar',
  'Продавать': 'Sotish',
  'Войти': 'Kirish',
  'Начать': 'Boshlash',
  'Выйти': 'Chiqish',
  'Назад': 'Orqaga',
  'Закрыть': 'Yopish',
  'Отмена': 'Bekor qilish',
  'Продолжить': 'Davom etish',
  'Дальше': 'Keyingi',
  'Готово': 'Tayyor',
  'Сохранить': 'Saqlash',
  'Удалить': 'O‘chirish',
  'Изменить': 'O‘zgartirish',
  'Подтвердить': 'Tasdiqlash',
  'Загрузка...': 'Yuklanmoqda...',
  'Загружаем...': 'Yuklanmoqda...',
  'Повторить': 'Qayta urinish',
  'Подробнее': 'Batafsil',
  'Поделиться': 'Ulashish',
  'Уведомления': 'Bildirishnomalar',
  'Настройки': 'Sozlamalar',
  'Безопасность': 'Xavfsizlik',
  'Поддержка': 'Yordam',
  'История': 'Tarix',
  'Подписки': 'Obunalar',
  'Сохранённые': 'Saqlanganlar',
  'Промокоды': 'Promokodlar',
  'Покупки': 'Xaridlar',
  'Баланс': 'Balans',
  'Сегодня': 'Bugun',
  'Бесплатно': 'Bepul',
  'Цена': 'Narx',
  'Описание': 'Tavsif',
  'Категория': 'Turkum',
  'Все категории': 'Barcha turkumlar',
  'Рестораны и кафе': 'Restoran va kafelar',
  'Маркетплейсы': 'Marketpleyslar',
  'Игры': 'O‘yinlar',
  'Курсы': 'Kurslar',
  'Обучение': 'Ta’lim',
  'Туризм': 'Turizm',
  'Фитнес': 'Fitnes',
  'Другое': 'Boshqa',
  'События': 'Tadbirlar',
  'Концерт': 'Konsert',
  'Фестиваль': 'Festival',
  'Вечеринка': 'Ziyofat',
  'Выставка': 'Ko‘rgazma',
  'Спорт': 'Sport',
  'Акция': 'Aksiya',
  'Адрес': 'Manzil',
  'Сходить': 'Borish',
  'Фильтры': 'Filtrlar',
  'Сначала новые': 'Avval yangilari',
  'Сбросить фильтры': 'Filtrlarni tozalash',
  'Товары не найдены': 'Mahsulotlar topilmadi',
  'Предложений пока нет': 'Hozircha takliflar yo‘q',
  'Найти': 'Topish',
  'Открыть поиск': 'Qidiruvni ochish',
  'Закрыть поиск': 'Qidiruvni yopish',
  'Поиск купонов, подписок, товаров...': 'Kuponlar, obunalar va mahsulotlarni qidiring...',
  'Найти промокод, подписку или товар': 'Promokod, obuna yoki mahsulotni toping',
  'О сервисе': 'Xizmat haqida',
  'Как это работает': 'Qanday ishlaydi',
  'Полезные материалы': 'Foydali materiallar',
  'Контакты': 'Aloqa',
  'Покупателям': 'Xaridorlarga',
  'Возвраты и споры': 'Qaytarish va nizolar',
  'Продавцам': 'Sotuvchilarga',
  'Стать продавцом': 'Sotuvchi bo‘lish',
  'Правила продавцов': 'Sotuvchilar qoidalari',
  'Правила контента': 'Kontent qoidalari',
  'Как оформить карточку': 'Mahsulot kartasini tayyorlash',
  'Конфиденциальность': 'Maxfiylik',
  'Условия использования': 'Foydalanish shartlari',
  'Настройки конфиденциальности': 'Maxfiylik sozlamalari',
  'Узбекистан': 'O‘zbekiston',
  'Только в сумах': 'Faqat so‘mda',
  'Смотреть предложения': 'Takliflarni ko‘rish',
  'Найти в каталоге': 'Katalogdan topish',
  'Перейти в каталог': 'Katalogga o‘tish',
  'Купить': 'Sotib olish',
  'Открыть покупку': 'Xaridni ochish',
  'Открыть промокод': 'Promokodni ochish',
  'Добавить в Apple Wallet': 'Apple Wallet’ga qo‘shish',
  'Покупка завершена': 'Xarid yakunlandi',
  'Завершено': 'Yakunlangan',
  'Оплачено': 'To‘langan',
  'Ожидание': 'Kutilmoqda',
  'Отменено': 'Bekor qilingan',
  'Спор': 'Nizo',
  'Споры': 'Nizolar',
  'Активна': 'Faol',
  'Истекла': 'Muddati tugagan',
  'Продлить': 'Uzaytirish',
  'Копировать': 'Nusxalash',
  'Скопировано': 'Nusxalandi',
  'Код': 'Kod',
  'без срока': 'muddatsiz',
  'Подарок': 'Sovg‘a',
  'Написать': 'Yozish',
  'Открыть бота': 'Botni ochish',
  'Привязан': 'Ulangan',
  'Привязать': 'Ulash',
  'Связанные аккаунты': 'Ulangan akkauntlar',
  'Выйти из аккаунта': 'Akkauntdan chiqish',
  'Изменить профиль': 'Profilni o‘zgartirish',
  'Выбрать фото': 'Rasm tanlash',
  'Сохранить изменения': 'O‘zgarishlarni saqlash',
  'Пополнить баланс': 'Balansni to‘ldirish',
  'Другая сумма': 'Boshqa summa',
  'Пополнить': 'To‘ldirish',
  'Отзывы покупателей': 'Xaridorlar sharhlari',
  'Оставить отзыв': 'Sharh qoldirish',
  'Оценка:': 'Baho:',
  'Отправить отзыв': 'Sharhni yuborish',
  'Аноним': 'Anonim',
  'Жалоба отправлена. Мы проверим товар и сообщим о решении.': 'Shikoyat yuborildi. Mahsulotni tekshirib, qaror haqida xabar beramiz.',
  'Пожаловаться на товар': 'Mahsulot haqida shikoyat qilish',
  'Сообщить о нарушении': 'Qoidabuzarlik haqida xabar berish',
  'Мошенничество': 'Firibgarlik',
  'Неверное описание': 'Noto‘g‘ri tavsif',
  'Запрещённый контент': 'Taqiqlangan kontent',
  'Спам': 'Spam',
  'Отправить жалобу': 'Shikoyat yuborish',
  'Отправляем…': 'Yuborilmoqda…',
  'Светлая тема': 'Yorug‘ mavzu',
  'Тёмная тема': 'Tungi mavzu',
  'Включить светлую тему': 'Yorug‘ mavzuni yoqish',
  'Включить тёмную тему': 'Tungi mavzuni yoqish',
  'Русский': 'Ruscha',
  'Узбекский': 'O‘zbekcha',
  'Язык': 'Til',
  'На этой странице': 'Ushbu sahifada',
  'Обновлено': 'Yangilangan',
  'Сейчас нет актуальных событий': 'Hozircha dolzarb tadbirlar yo‘q',
  'Новые мероприятия появятся здесь после публикации организаторами.': 'Yangi tadbirlar tashkilotchilar e’lon qilgach shu yerda paydo bo‘ladi.',
  'События Ташкента': 'Toshkent tadbirlari',
  'Уже есть аккаунт?': 'Akkauntingiz bormi?',
  'Создать аккаунт': 'Akkaunt yaratish',
  'Войти в аккаунт': 'Akkauntga kirish',
  'Электронная почта': 'Elektron pochta',
  'Пароль': 'Parol',
  'Забыли пароль?': 'Parolni unutdingizmi?',
  'Быстро через Telegram': 'Telegram orqali tezkor',
  'Продолжить по email': 'Email orqali davom etish',
  'Открыть бот': 'Botni ochish',
  'Погнали': 'Boshladik',
  'Покупайте понятнее.': 'Tushunarli xarid qiling.',
  'Условия — до оплаты.': 'Shartlar — to‘lovdan oldin.',
  'Промокоды, подписки и локальные предложения Узбекистана. Цена, ограничения и способ получения видны в карточке.': 'O‘zbekistondagi promokodlar, obunalar va mahalliy takliflar. Narx, cheklovlar va olish usuli mahsulot kartasida ko‘rsatiladi.',
  'История операции и споры': 'Operatsiyalar tarixi va nizolar',
  'Способ выдачи указан заранее': 'Berish usuli oldindan ko‘rsatilgan',
  'Цены только в UZS': 'Narxlar faqat UZSda',
  'Что ищете?': 'Nima qidiryapsiz?',
  'Весь каталог →': 'Barcha katalog →',
  'Рядом': 'Yaqinda',
  'Кафе и услуги': 'Kafe va xizmatlar',
  'Сервисы и приложения': 'Servislar va ilovalar',
  'Ключи и лицензии': 'Kalitlar va litsenziyalar',
  'Скидки и QR-коды': 'Chegirmalar va QR-kodlar',
  'Выгода на покупки': 'Xaridlar uchun foyda',
  'Еда': 'Taomlar',
  'Предложения заведений': 'Muassasalar takliflari',
  'Что происходит сегодня': 'Bugun nimalar bo‘lmoqda',
  'Актуальные события и места города в вертикальной ленте.': 'Shahardagi dolzarb tadbirlar va joylar vertikal lentada.',
  'Открыть Topka': 'Topka’ni ochish',
  'Успейте забрать': 'Olishga ulgurib qoling',
  'Все акции →': 'Barcha aksiyalar →',
  'Стоит посмотреть': 'Ko‘rishga arziydi',
  'Смотреть все →': 'Barchasini ko‘rish →',
  'Публикуем только проверенные предложения': 'Faqat tekshirilgan takliflarni e’lon qilamiz',
  'Сейчас в открытом каталоге нет товаров, прошедших модерацию. Мы скрыли тестовые карточки и не подменяем их вымышленными предложениями. Пока можно изучить правила безопасной покупки или подать заявку продавца.': 'Hozir ochiq katalogda moderatsiyadan o‘tgan mahsulotlar yo‘q. Sinov kartalarini yashirdik va ularni soxta takliflar bilan almashtirmaymiz. Hozircha xavfsiz xarid qoidalarini o‘rganish yoki sotuvchi sifatida ariza berish mumkin.',
  'Читать руководства': 'Qo‘llanmalarni o‘qish',
  'Для продавцов': 'Sotuvchilar uchun',
  'Получить': 'Olish',
  'Открыть': 'Ochish',
  'Скоро закончится': 'Tez orada tugaydi',
  'Предложение': 'Taklif',
  'Рестораны и Кафе': 'Restoran va kafelar',
  'Сначала дешевле': 'Avval arzonlari',
  'Сначала дороже': 'Avval qimmatlari',
  'Сначала старые': 'Avval eskilari',
  'Все товары': 'Barcha mahsulotlar',
  'Без ограничений': 'Cheklovlarsiz',
  'Цифровые товары': 'Raqamli mahsulotlar',
  'Код или QR после покупки': 'Xariddan so‘ng kod yoki QR',
  'Ключи, лицензии и доступы': 'Kalitlar, litsenziyalar va kirishlar',
  'Ссылки': 'Havolalar',
  'Доступ по защищённой ссылке': 'Himoyalangan havola orqali kirish',
  'Товары и услуги': 'Mahsulot va xizmatlar',
  'Получение по инструкции': 'Yo‘riqnoma bo‘yicha olish',
  'Временные Акции': 'Vaqtinchalik aksiyalar',
  'Обновляем предложения…': 'Takliflar yangilanmoqda…',
  'Сбросить': 'Tozalash',
  'Каталог предложений и цифровых товаров для Узбекистана. Цена, ограничения и способ получения должны быть понятны до покупки.': 'O‘zbekiston uchun takliflar va raqamli mahsulotlar katalogi. Narx, cheklovlar va olish usuli xariddan oldin tushunarli bo‘lishi kerak.',
  'Информация о предложении проверяется перед покупкой.': 'Taklif haqidagi ma’lumot xariddan oldin tekshiriladi.',
  'Хлебные крошки': 'Navigatsiya yo‘li',
  'Используйте уникальный пароль и не вводите его на страницах, открытых по случайной ссылке. Проверяйте адрес сайта: официальный веб-интерфейс работает на perkly.uz. Если вы получили неожиданный код входа, никому его не сообщайте и измените пароль.': 'Noyob paroldan foydalaning va uni tasodifiy havola orqali ochilgan sahifalarga kiritmang. Sayt manzilini tekshiring: rasmiy veb-interfeys perkly.uz manzilida ishlaydi. Agar kutilmagan kirish kodini olsangiz, uni hech kimga bermang va parolingizni almashtiring.',
  'Рекомендуем в каталоге': 'Katalog tavsiyalari',
  'Выгода для города': 'Shahar uchun foyda',
  'Промокоды заведений и сервисов Узбекистана — сразу после покупки.': 'O‘zbekiston muassasa va xizmatlari promokodlari — xariddan so‘ng darhol.',
  'Смотреть промокоды': 'Promokodlarni ko‘rish',
  'Предыдущий баннер': 'Oldingi banner',
  'Следующий баннер': 'Keyingi banner',
  'Сортировка': 'Saralash',
  'Каталог временно недоступен': 'Katalog vaqtincha ishlamayapti',
  'Каталог без тестовых карточек': 'Sinov kartalarisiz katalog',
  'Активных предложений, прошедших модерацию, сейчас нет. Мы не показываем вымышленные товары и логотипы брендов без реального предложения. Перед первой покупкой можно ознакомиться с практическими руководствами Perkly.': 'Hozir moderatsiyadan o‘tgan faol takliflar yo‘q. Haqiqiy taklifsiz soxta mahsulotlar va brend logotiplarini ko‘rsatmaymiz. Birinchi xariddan oldin Perkly amaliy qo‘llanmalari bilan tanishishingiz mumkin.',
  'Открыть руководства': 'Qo‘llanmalarni ochish',
  'Подать заявку продавца': 'Sotuvchi arizasini yuborish',
  '© 2026 Perkly. Информация о предложении проверяется перед покупкой.': '© 2026 Perkly. Taklif haqidagi ma’lumot xariddan oldin tekshiriladi.',
};

const UZ_TO_RU = Object.fromEntries(Object.entries(RU_TO_UZ).map(([ru, uz]) => [uz, ru]));

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (copy: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'ru';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'ru' || stored === 'uz') return stored;
  const cookie = document.cookie.split('; ').find((part) => part.startsWith(`${COOKIE_KEY}=`))?.split('=')[1];
  if (cookie === 'ru' || cookie === 'uz') return cookie;
  return navigator.language.toLowerCase().startsWith('uz') ? 'uz' : 'ru';
}

function translateCopy(copy: string, language: AppLanguage): string {
  const dictionary = language === 'uz' ? RU_TO_UZ : UZ_TO_RU;
  return localizeDynamicCopy(dictionary[copy] ?? copy, language);
}

const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

function localizeDynamicCopy(copy: string, language: AppLanguage): string {
  let result = copy;
  if (language === 'uz') {
    result = result.replace(/\bсум\b/gi, "so‘m");
    result = result.replace(/\s+года\b/gi, '');
    RU_MONTHS.forEach((month, index) => {
      result = result.replace(new RegExp(`(\\d{1,2}) ${month}`, 'gi'), `$1-${UZ_MONTHS[index]}`);
    });
    result = result
      .replace(/(\d+) предложени(?:е|я|й)/gi, '$1 ta taklif')
      .replace(/(\d+) покуп(?:ка|ки|ок)/gi, '$1 ta xarid')
      .replace(/(\d+) дн(?:я|ей|\.)?/gi, '$1 kun');
  } else {
    result = result.replace(/\bso[‘']m\b/gi, 'сум');
    UZ_MONTHS.forEach((month, index) => {
      result = result.replace(new RegExp(`(\\d{1,2})-${month}`, 'gi'), `$1 ${RU_MONTHS[index]}`);
    });
  }
  return result;
}

function translateElement(root: ParentNode, language: AppLanguage) {
  const dictionary = language === 'uz' ? RU_TO_UZ : UZ_TO_RU;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    if (node.parentElement?.closest('script, style, textarea, [data-no-translate]')) continue;
    const original = node.data;
    const trimmed = original.trim();
    const translated = localizeDynamicCopy(dictionary[trimmed] ?? trimmed, language);
    if (translated !== trimmed) node.data = original.replace(trimmed, translated);
  }

  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));
  for (const element of elements) {
    if (element.closest('[data-no-translate]')) continue;
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const value = element.getAttribute(attribute);
      if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
    }
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('ru');

  useEffect(() => {
    // The server renders Russian to keep hydration deterministic; the saved
    // preference is restored immediately after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguageState(readInitialLanguage());
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.cookie = `${COOKIE_KEY}=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setLanguageState(nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: nextLanguage }));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.perklyLanguage = language;
    translateElement(document.body, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.parentElement) {
          translateElement(mutation.target.parentElement, language);
        }
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElement(mutation.target, language);
        }
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element, language);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) translateElement(node.parentElement, language);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language]);

  const t = useCallback((copy: string) => translateCopy(copy, language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
