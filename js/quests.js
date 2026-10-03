'use strict';
// ===== КВЕСТИ Й ЖУРНАЛ [J]: цілі, події, нагороди, нотатки, Пам'ять =====
// Стан: P.quests[id] = { s: 1 (активний) | 2 (виконаний), p: [прогрес цілей] }, P.memory (0–10), P.notes, P.track.

const MEM_MAX = 10;
const QUESTS = {
  q_road: { title: 'Дорога на Місто', area: 'Селище', main: true, giver: 'goran', to: 'Староста Горан', req: [],
    desc: 'Староста Горан радить підготуватись до дороги: познайомитись із торговцем Костом на ринку й роздивитись спорядження та таланти.',
    obj: [{ t: 'talk', k: 'kost', text: 'Поговорити з Костом на ринку', line: ['А, ти від Горана? Тоді слухай: гроші — це Попіл, Попіл — це час. Витрачай його з розумом. Заходь, коли захочеш купити чи продати.'] }, { t: 'ui', k: 'inv', text: 'Відкрити інвентар [I]' }, { t: 'ui', k: 'talents', text: 'Відкрити таланти [T]' }],
    offer: ['Пробуджений, перш ніж іти до Міста — підготуйся. Поговори з Костом на ринку: він продає все, що треба.', 'Потім загляни до інвентаря [I] і талантів [T]. Це не гра, це виживання.'],
    remind: 'Кост — на ринку. Інвентар [I], таланти [T]. Тоді повертайся.',
    done: ['Молодець. Тепер ти знаєш, де що лежить. Візьми це в дорогу — і хай Жар тебе береже.'], rew: { ash: 40, xp: 30, gear: { slot: 'amulet', rar: [0, 70, 30, 0, 0] } } },
  q_letter: { title: 'Лист для Гільдмайстра', area: 'Селище → Місто', main: true, giver: 'goran', to: 'Гільдмайстер Ревн (Місто Ейри)', turnIn: 'rev', req: ['q_road'],
    desc: 'Горан дав запечатаний лист для гільдмайстра Ревна. Шлях лежить на південь, до Міста Ейри.',
    obj: [{ t: 'talk', k: 'rev', text: 'Віднести лист Ревну в Місті Ейри', line: ['Лист від Горана? Старий упертюх. Скажи йому: гільдія пам’ятає борги. А тобі — дякую.'] }],
    offer: ['Ось лист. Віднеси його Ревну, гільдмайстру Міста — це недалеко, на південь. Не запечатуй його іншого, не гни і не мни.', 'І, прошу: не відкривай. Хоча… вирішувати тобі.'],
    remind: 'Лист — у тебе. Ревн — у Місті Ейри, біля Гільдії.',
    done: ['Гільдія знову матиме справу. Тримай — і подякуй Горану від мене.'], rew: { ash: 60, xp: 40, memory: 1, gear: { rar: [0, 30, 55, 15, 0] } },
    accept: () => showChoice('Печатка тонка. Здається, її можна зламати, не залишивши слідів.', [
      { text: 'Прочитати лист', cb: () => { G.state = 'play'; addNote('letter', 'Лист Горана', '«Ревне, пишу вдруге. Пробуджений, про якого я казав, — не звичайний. Дивись на шрам на його лівій руці. Дивись на очі. І не питай його ім’я — він його не знає. Горан».'); showDialog([{ who: '', text: 'У листі лише кілька рядків. «…Дивись на шрам. Дивись на очі. Не питай його ім’я — він його не знає.»' }, { who: '', text: 'Ти дивишся на власну ліву руку. Шрам справді є. Звідки?' }]); } },
      { text: 'Не чіпати', cb: () => { G.state = 'play'; } }]) },
  q_eggs: { title: 'Яйця для Мілени', area: 'Селище', giver: 'mil', to: 'Мілена, пекарка', req: [],
    desc: 'Мілена не може спекти пироги: кури розбігаються, а яйця закінчились. Яйця можна забрати з гнізд у дворі біля комори.',
    obj: [{ t: 'collect', k: 'egg', n: 4, text: 'Принести 4 яйця (гнізда біля комори)' }], take: true,
    offer: ['Мої кури геть здичавіли — несуться де хочуть. Збери, будь ласка, чотири яйця. Гнізда — у дворі біля комори, на фермі.'],
    remind: 'Чотири яйця — у дворі біля комори, там, де кури.', done: ['Свіженькі! Тримай — трохи меду і хліб. Бери, поки гарячий.'], rew: { ash: 25, xp: 25, items: [['honey', 2], ['bread', 2]] } },
  q_berries: { title: 'Ягоди для Рути', area: 'Селище / Узлісся', giver: 'ruta', to: 'Рута (сад)', req: [],
    desc: 'Рута збирає яблука, а ягід у садах нема. У Сірому Узліссі на галявинах ростуть кущі з лісовими ягодами.',
    obj: [{ t: 'collect', k: 'berries', n: 6, text: 'Зібрати 6 лісових ягід' }], take: true,
    offer: ['Хочу зварити варення на зиму, а ягід — ні гілки. В Узліссі, кажуть, повно кущів. Принесеш шість жмень?'],
    remind: 'Ягоди ростуть на кущах в Узліссі, на захід.', done: ['Які гарні! Візьми яблук — з нашого саду.'], rew: { ash: 30, xp: 30, items: [['apple', 4]] } },
  q_herbs: { title: 'Трави для Ліси', area: 'Селище / Узлісся', giver: 'lisa', to: 'Ліса, алхімікиня', req: [],
    desc: 'Алхімікині Лісі потрібні цілющі трави. Їх можна збирати в Сірому Узліссі (з серпом — вдвічі більше).',
    obj: [{ t: 'collect', k: 'herb', n: 6, text: 'Зібрати 6 цілющих трав' }], take: true,
    offer: ['Трави закінчились, а настої самі не варяться. Принеси шість пучків цілющої трави — в Узліссі її повно. Серпом буде вдвічі швидше.'],
    remind: 'Трави — в Узліссі. Шукай зелені пучки з білими квітами.', done: ['Чудово! Ось — моя стара ступка. І трохи меду на дорогу.'], rew: { ash: 35, xp: 35, items: [['mortar', 1], ['honey', 1]] } },
  q_timber: { title: 'Деревина для кузні', area: 'Селище / Узлісся', giver: 'bran', to: 'Бран, коваль', req: [],
    desc: 'Бранові потрібна деревина для горна. Сокира лежить у скрині біля мисливської хати в Узліссі — можна й купити в кузні.',
    obj: [{ t: 'collect', k: 'wood', n: 6, text: 'Принести 6 колод деревини' }], take: true,
    offer: ['Горн їсть дрова, як звір. Принеси шість колод — й я віддячу кліщами. Сокиру можна купити в мене або знайти в Узліссі.'],
    remind: 'Шість колод. Сокира — у мене або в хаті мисливців в Узліссі.', done: ['Саме те! Ось кліщі — тобі знадобляться, коли заговориш із горном.'], rew: { ash: 30, xp: 35, items: [['tongs', 1]] } },
  q_blade: { title: 'Новий клинок', area: 'Селище', giver: 'cust', to: 'Мисливець Орк (кузня)', req: [],
    desc: 'Мисливець Орк чекає свій меч ще з весни. Бран каже: «майже готовий» — але потрібні залізні злитки. Їх можна виплавити в горні з руди (потрібні кліщі та вугілля).',
    obj: [{ t: 'collect', k: 'iron_ingot', n: 2, text: 'Принести 2 залізні злитки' }], take: true,
    offer: ['Чекаю на меч з весни. Бран то каже «завтра», то «майже». Може, допоможеш зі злитками? Два залізні — і він нарешті доб’є клинок.', 'Руду — на скелях в Узліссі, вугілля — теж там. Плавити — у горні. Кліщі потрібні.'],
    remind: 'Два злитки: руда й вугілля — на скелях в Узліссі, плавка — в горні.', done: ['Нарешті! Бери цей меч — він тепер твій, мені потрібен лук. Дякую.'], rew: { ash: 40, xp: 60, gear: { slot: 'weapon', rar: [0, 10, 60, 28, 2] } } },
  q_fish: { title: 'Риба до столу', area: 'Селище / Узлісся', giver: 'orm', to: 'Шинкар Орм', req: [],
    desc: 'Шинкарю Орму потрібна печена риба для гостей. Рибу ловлять біля озера в Узліссі (потрібна вудка) і печуть на похідному вогнищі.',
    obj: [{ t: 'collect', k: 'cooked_fish', n: 2, text: 'Принести 2 печені риби' }], take: true,
    offer: ['Гості питають про рибу, а в мене — ні лускатої. Принеси дві печені — озеро в Узліссі повне. Вудка — у Тараса або у Зої, а пекти — на будь-якому вогнищі.'],
    remind: 'Дві печені риби. Озеро — в Узліссі. Печи на вогнищі.', done: ['Пахне, як у дитинстві! Ось тобі за труди й мед з погреба.'], rew: { ash: 50, xp: 40, items: [['honey', 1]] } },
  q_wolves: { title: 'Вовки біля саду', area: 'Узлісся', giver: 'g1', to: 'Вартовий Ґрід', req: [],
    desc: 'Вовки з Узлісся підходять до саду вночі. Вартовий Ґрід просить відігнати зграю: убити чотирьох.',
    obj: [{ t: 'kill', k: 'wolf', n: 4, text: 'Убити 4 вовків в Узліссі' }],
    offer: ['Вовки лізуть ближче й ближче. Чотири шкури — й вони зрозуміють. Ліс — на заході. Ідеш?'],
    remind: 'Вовки — на півночі Узлісся, у лігві.', done: ['Тихіше стало, чуєш? Бери шолом — він мені не пасує.'], rew: { ash: 60, xp: 80, gear: { slot: 'helmet', rar: [0, 30, 50, 18, 2] } } },
  q_bear: { title: 'Ведмідь біля скель', area: 'Узлісся', giver: 'kayel', to: 'Мисливець Каєль', req: [],
    desc: 'Мисливець Каєль вистежує ведмедів, що залишили печеру біля скель на північному заході Узлісся.',
    obj: [{ t: 'kill', k: 'bear', n: 2, text: 'Убити 2 ведмедів біля скель' }],
    offer: ['Ведмеді з печери біля скель псують усе: ловушки, стежки, нерви. Двох убий — і лишиш мені трохи спокою. Це небезпечно.'],
    remind: 'Печера — на північному заході Узлісся, біля скель з рудою.', done: ['Лиш двоє? Ти не промах. Пазурі — тобі, а ось ще й нагорода.'], rew: { ash: 90, xp: 120, items: [['claw', 2]], gear: { rar: [0, 10, 50, 35, 5] } } },
  q_elves: { title: 'Розбійники Узлісся', area: 'Узлісся', giver: 'taras', to: 'Мисливець Тарас (Привал)', req: [],
    desc: 'Ельфи-розбійники обжили табір на заході Узлісся. Їхній ватажок Ільвар — серце банди. Тарас просить прибрати його.',
    obj: [{ t: 'killname', k: 'Ватажок Ільвар', text: 'Убити Ватажка Ільвара у таборі розбійників' }],
    offer: ['Колись ельфи були нашими сусідами. Тепер вони грабують усе, що рухається. Їхній ватажок — Ільвар. Приберіть його — й решта розбіжиться.', 'Табір — на заході, за палісадом. Їх багато. Ідіть підготовленим.'],
    remind: 'Ільвар — у таборі за палісадом, на заході.', done: ['Сам Ільвар?! Тоді Узлісся дихатиме. Це — тобі від мисливців, і ще дещо від мене.'], rew: { ash: 150, xp: 200, gear: { rar: [0, 0, 35, 50, 15] } } },
  q_meat: { title: 'Свіже м’ясо', area: 'Узлісся', giver: 'taras', to: 'Мисливець Тарас (Привал)', req: [],
    desc: 'Тарасу потрібне смажене м’ясо для табору. Здобич — олені, зайці, вовки. Смажити — на будь-якому вогнищі.',
    obj: [{ t: 'collect', k: 'cooked_meat', n: 3, text: 'Принести 3 порції смаженого м’яса' }], take: true,
    offer: ['Мисливці їдять, коли мисливці полюють. Принеси три порції смаженого м’яса — вбий звіра і засмаж на вогнищі.'],
    remind: 'Три порції смаженого м’яса. Сире — на вогнище, і готово.', done: ['Ось це їжа! Візьми стріл — і хліб на дорогу.'], rew: { ash: 25, xp: 30, items: [['arrows', 10], ['bread', 2]] } },
  q_song: { title: 'Пісня без слів', area: 'Селище', giver: 'lir', to: 'Бард Лір (шинок)', req: [],
    desc: 'Бард Лір забув слова пісні, яку писав для когось. Він вірить: колискова вціліла в трьох місцях селища — колиска в рідній хаті, дзеркало там же й Книга Імен у каплиці.',
    obj: [{ t: 'use', k: 'cradle', text: 'Оглянути колиску в рідній хаті' }, { t: 'use', k: 'mirror', text: 'Подивитись у дзеркало в рідній хаті' }, { t: 'use', k: 'book_names', text: 'Прочитати Книгу Імен у каплиці' }],
    offer: ['Я забув слова. Мелодію — пам’ятаю. Колись написав її для хлопчика, що жив у хаті на околиці. Колиска, дзеркало там, і книга в каплиці — може, звідти щось вернеться…'],
    remind: 'Рідна хата — колиска й дзеркало. Каплиця — Книга Імен.', done: ['«Ой у Попелі, у Попелі зоря гасне… а хлопчик спить, і ім’я своє не пам’ятає…» Ось. Усі слова. Дякую.'], rew: { ash: 30, xp: 50, memory: 1 },
    doneNote: ['song', 'Колискова Ліра', '«Ой у Попелі, у Попелі зоря гасне… а хлопчик спить, і ім’я своє не пам’ятає. Прийде вогонь — і згадає».'] },
  q_names: { title: 'Імена на могилах', area: 'Селище', giver: 'ivar', to: 'Отець Івар (каплиця)', req: [],
    desc: 'На кладовищі біля каплиці стерті написи. Отець Івар просить прочитати три могили й назвати імена вголос.',
    obj: [{ t: 'use', k: 'grave1', text: 'Прочитати першу могилу' }, { t: 'use', k: 'grave2', text: 'Прочитати другу могилу' }, { t: 'use', k: 'grave3', text: 'Прочитати третю могилу' }],
    offer: ['Кладовище за каплицею: написи стираються самі, наче їх лижуть. Три могили — підійди, прочитай і назви ім’я вголос. Поки назване — людина жива.'],
    remind: 'Могили — на кладовищі за каплицею, на сході.', done: ['Чуєш? Тиша стала легшою. Холод відступив — хоч на хвилину. Візьми благословення й трохи хліба.'], rew: { ash: 20, xp: 70, memory: 2, items: [['bread', 1]] } },
  q_boy: { title: 'Хлопчик без імені', area: 'Селище → Місто', main: true, giver: 'anna', to: 'Стара Анна (рідна хата)', req: [], seq: true,
    desc: 'Стара Анна пам’ятає хлопчика, який колись жив у цій хаті. Його ім’я стерли з одвірка й з колиски. Агата, здається, знає більше. А відповідь — після першого підземелля.',
    obj: [{ t: 'talk', k: 'agata', text: 'Розпитати Стару Агату біля колодязя', line: ['Хлопчик? Було таке. Тихий, уперта голова. Шрам на лівій руці — від ножа, що не мав би потрапити йому в руки. Йому було страшно, а він ніс щось важке…', 'Іди, куди ти йдеш. А повернешся — розкажи Анні. Вона чекає давно.'] }, { t: 'dungeon', k: 0, text: 'Здолати Вартового Цвинтаря (брама в Місті)' }],
    offer: ['Ти схожий на нього. Лише очі… не ті. Хоча я вже давно помиляюсь.', 'Тут жив хлопчик. Ім’я було гарне — не пам’ятаю, яке. Агата біля колодязя бачила його частіше за мене. Розпитай її. А якщо підеш під землю — повернися й розкажи, що знайшов.'],
    remind: 'Агата — біля колодязя на площі. Потім — перше підземелля в Місті.', done: ['Повернувся… Подивись. У скрині під ліжком — дерев’яний меч. На руків’ї вирізано літеру. Лише першу — «М». Решту стерли ножем.', 'Це ж було твоє? Мені здається, що так. Тримай. Це — єдине, що лишилось від хлопчика.'], rew: { memory: 2, xp: 100, gear: { slot: 'weapon', rar: [0, 0, 60, 35, 5] } },
    doneNote: ['boy', 'Меч хлопчика', 'На руків’ї дерев’яного меча вирізано літеру «М». Решту стерто ножем.'] },
  q_face: { title: 'Обличчя статуї', area: 'Місто Ейри', giver: 'stef', to: 'Жебрак Стеф (Місто)', req: [],
    desc: 'Жебрак Стеф переконаний, що в статуї короля стерте обличчя неспроста. Він радить подивитись на статую і… на себе — в дзеркало в рідній хаті.',
    obj: [{ t: 'use', k: 'statue', text: 'Оглянути статую короля в Місті' }, { t: 'use', k: 'mirror', text: 'Подивитись у дзеркало в рідній хаті' }],
    offer: ['Дивись на статую, подорожній. Потім — в дзеркало. Не питай, у яке. У тебе одне є. Ти знаєш, у яке.'],
    remind: 'Статуя — на північ від фонтану. Дзеркало — в рідній хаті, в селищі.', done: ['Ну що? Бачив? Не кажи. Я чую по голосу. Тримай за допитливість — і бережи цей погляд.'], rew: { ash: 20, xp: 60, memory: 1 } },
  q_first: { title: 'Перший спуск', area: 'Місто Ейри', main: true, giver: 'revn', to: 'Гільдмайстер Ревн (гільдія)', req: [],
    desc: 'Гільдмайстер Ревн просить пройти перше підземелля — Цвинтар — і здолати його вартового.',
    obj: [{ t: 'dungeon', k: 0, text: 'Здолати Вартового Цвинтаря' }],
    offer: ['Кожен, хто йде під землю, починає з Цвинтаря. Знищ вартового біля порталу — й ось тобі перша брама. Рекомендований рівень — перший.'],
    remind: 'Цвинтар — перша брама на Площі Брам.', done: ['Живий і з трофеєм. Тепер можеш іти далі — Катакомби чекають.'], rew: { ash: 100, xp: 150, memory: 1, gear: { rar: [0, 10, 50, 35, 5] } } },
  q_second: { title: 'Темрява Катакомб', area: 'Місто Ейри', main: true, giver: 'revn', to: 'Гільдмайстер Ревн (гільдія)', req: ['q_first'],
    desc: 'Друга брама веде в Катакомби Забутих Королів. Там володарює Мати Скверни.',
    obj: [{ t: 'dungeon', k: 1, text: 'Здолати Матір Скверни в Катакомбах' }],
    offer: ['Катакомби — це вже не жарти. Мати Скверни береже портал. Бери спорядження, їжу й талант на підкласи. Рекомендований рівень — третій.'],
    remind: 'Катакомби — друга брама на Площі Брам.', done: ['Мати Скверни мертва… Королі нарешті лежать спокійно. Ось — твоя доля.'], rew: { ash: 200, xp: 250, gear: { rar: [0, 0, 35, 50, 15] } } },
};
const QIDS = Object.keys(QUESTS);

// ---------- Стан ----------
function questInit() { if (!P.quests || typeof P.quests !== 'object') P.quests = {}; Object.keys(P.quests).forEach((k) => { if (!QUESTS[k]) delete P.quests[k]; }); if (!Array.isArray(P.notes)) P.notes = []; if (typeof P.memory !== 'number') P.memory = 0; if (!P.track || !QUESTS[P.track] || !isActive(P.track)) P.track = QIDS.find(isActive) || null; }
const qst = (id) => P.quests[id];
const isActive = (id) => !!(qst(id) && qst(id).s === 1);
const isDone = (id) => !!(qst(id) && qst(id).s === 2);
const reqOk = (q) => (q.req || []).every(isDone);
function objDone(id, i) { const o = QUESTS[id].obj[i]; if (o.t === 'collect') return countItem(o.k) >= (o.n || 1); return ((qst(id).p || [])[i] || 0) >= (o.n || 1); }
const isReady = (id) => QUESTS[id].obj.every((_, i) => objDone(id, i));
function activeObjs(id) { const q = QUESTS[id], idx = q.obj.map((_, i) => i).filter((i) => !objDone(id, i)); return q.seq ? idx.slice(0, 1) : idx; }
const objProgress = (id, i) => { const o = QUESTS[id].obj[i]; return o.t === 'collect' ? Math.min(countItem(o.k), o.n || 1) : Math.min((qst(id).p[i] || 0), o.n || 1); };
function addNote(id, title, text) { if (P.notes.some((n) => n.id === id)) return; P.notes.push({ id, title, text }); toast('Нова нотатка в Журналі [J]: ' + title); }
function addMemory(n) { P.memory = Math.min(MEM_MAX, (P.memory || 0) + n); }
function questEvent(type, key, n = 1) {
  if (!P || !P.quests) return;
  Object.keys(P.quests).forEach((id) => {
    if (!isActive(id)) return; const q = QUESTS[id];
    activeObjs(id).forEach((i) => {
      const o = q.obj[i]; if (o.t !== type || o.k !== key) return;
      const st = qst(id); st.p[i] = Math.min(o.n || 1, (st.p[i] || 0) + n); qNotify(id, i);
    });
  });
}
function qNotify(id, i) {
  const q = QUESTS[id], o = q.obj[i];
  if (isReady(id)) { toast(`«${q.title}»: усе виконано — до ${q.to.split(' (')[0]}`); Sfx.play('pickup'); }
  else if (objDone(id, i)) { toast('✓ ' + o.text); Sfx.play('pickup'); }
  else if ((o.n || 1) > 1) toast(`${q.title}: ${objProgress(id, i)}/${o.n}`);
}
function useEvent(key) { questEvent('use', key); }

// ---------- Діалоги ----------
function rewardText(q) {
  const r = q.rew, p = [];
  if (r.ash) p.push(`${r.ash} Попелу`); if (r.xp) p.push(`${r.xp} досвіду`); if (r.memory) p.push(`Пам’ять +${r.memory}`);
  (r.items || []).forEach(([id, n]) => p.push(`${n > 1 ? n + '× ' : ''}${ITEMS[id].name}`)); if (r.gear) p.push('спорядження');
  return 'Нагорода: ' + p.join(', ') + '.';
}
function grantReward(q) {
  const r = q.rew; if (r.ash) P.ash += r.ash; if (r.memory) addMemory(r.memory);
  (r.items || []).forEach(([id, n]) => gain(id, n, true));
  if (r.gear) { const it = genItem(Math.min(4, Math.floor(P.level / 2)), rollRarity(r.gear.rar), r.gear.slot), got = pickupItem(it); toast(it.name + (got ? '' : ' лежить поруч')); if (!got) pickups.push({ type: 'item', item: it, x: P.x, y: P.y + 20, vx: 0, vy: 0, t: 1 }); }
  if (r.xp) gainXp(r.xp);
}
function offerQuest(id, n) {
  const q = QUESTS[id];
  showDialog(q.offer.map((t) => ({ who: n.name, text: t })), () => {
    showChoice(`Взяти завдання «${q.title}»?`, [
      { text: 'Прийняти', cb: () => { G.state = 'play'; n.busy = false; P.quests[id] = { s: 1, p: [] }; P.track = id; Sfx.play('level'); toast(`Новий квест: ${q.title} — Журнал [J]`); if (q.accept) q.accept(); } },
      { text: 'Пізніше', cb: () => { G.state = 'play'; n.busy = false; } },
    ]);
  });
}
function completeQuest(id, n, pre) {
  const q = QUESTS[id];
  q.obj.forEach((o) => { if (o.t === 'collect') takeItem(o.k, o.n || 1); });
  qst(id).s = 2; grantReward(q); if (q.doneNote) addNote(...q.doneNote);
  if (P.track === id) P.track = QIDS.find(isActive) || null;
  showDialog([...pre, ...q.done.map((t) => ({ who: n.name, text: t })), { who: '', text: `Квест виконано: ${q.title}. ${rewardText(q)}` }], () => { n.busy = false; });
  Sfx.play('level'); return true;
}
function applyTalk(n) {
  const lines = [];
  Object.keys(P.quests).forEach((id) => {
    if (!isActive(id)) return; const q = QUESTS[id];
    activeObjs(id).forEach((i) => { const o = q.obj[i]; if (o.t === 'talk' && o.k === n.id) { qst(id).p[i] = 1; (o.line || []).forEach((t) => lines.push({ who: n.name, text: t })); qNotify(id, i); } });
  });
  return lines;
}
function questHook(n) {
  let pre = applyTalk(n);
  for (const id of Object.keys(P.quests)) { const q = QUESTS[id]; if (isActive(id) && (q.turnIn || q.giver) === n.id && isReady(id)) return completeQuest(id, n, pre); }
  if (pre.length) { showDialog(pre, () => { n.busy = false; }); return true; }
  for (const id of QIDS) { const q = QUESTS[id]; if (!qst(id) && q.giver === n.id && reqOk(q)) { offerQuest(id, n); return true; } }
  for (const id of Object.keys(P.quests)) { const q = QUESTS[id], st = qst(id); if (isActive(id) && q.giver === n.id && (!st.rem || G.time - st.rem > 90)) { st.rem = G.time; showDialog([{ who: n.name, text: q.remind }], () => { n.busy = false; }); return true; } }
  return false;
}
function questMark(n) {
  if (!P || !P.quests) return '';
  for (const id of Object.keys(P.quests)) { const q = QUESTS[id]; if (isActive(id) && (q.turnIn || q.giver) === n.id && isReady(id)) return '?'; }
  for (const id of Object.keys(P.quests)) { if (isActive(id) && activeObjs(id).some((i) => QUESTS[id].obj[i].t === 'talk' && QUESTS[id].obj[i].k === n.id)) return '!'; }
  for (const id of QIDS) { const q = QUESTS[id]; if (!qst(id) && q.giver === n.id && reqOk(q)) return '!'; }
  return '';
}

// ---------- Журнал ----------
const jEl = $('#journal');
let jTab = 'active', jSel = null;
function renderJournal() {
  $('#jMem').innerHTML = `Пам’ять: <b>${'◆'.repeat(P.memory)}${'◇'.repeat(MEM_MAX - P.memory)}</b> ${P.memory}/${MEM_MAX}`;
  const tabs = $('#jTabs'); tabs.innerHTML = '';
  [['active', 'Активні'], ['done', 'Виконані'], ['notes', 'Нотатки']].forEach(([id, nm]) => { const b = document.createElement('button'); b.className = 'invTab' + (jTab === id ? ' on' : ''); b.textContent = nm; b.onclick = () => { jTab = id; jSel = null; Sfx.play('click'); renderJournal(); }; tabs.appendChild(b); });
  const list = $('#jList'), det = $('#jDetail'); list.innerHTML = ''; det.innerHTML = '';
  if (jTab === 'notes') {
    if (!P.notes.length) list.innerHTML = '<div class="tipHint">Нотатки з’являться, коли ти знайдеш щось важливе.</div>';
    P.notes.forEach((nt, i) => { const d = document.createElement('div'); d.className = 'jItem' + (jSel === i ? ' sel' : ''); d.innerHTML = `<b>${nt.title}</b>`; d.onclick = () => { jSel = i; renderJournal(); }; list.appendChild(d); });
    const nt = P.notes[jSel === null ? 0 : jSel]; if (nt) det.innerHTML = `<h3>${nt.title}</h3><p class="jTxt">${nt.text}</p>`; return;
  }
  const ids = QIDS.filter((id) => (jTab === 'active' ? isActive(id) : isDone(id)));
  if (!ids.length) list.innerHTML = `<div class="tipHint">${jTab === 'active' ? 'Активних квестів немає. Поговори з мешканцями: над тими, хто має завдання, стоїть «!».' : 'Поки що нічого не виконано.'}</div>`;
  if (jSel === null || !ids.includes(jSel)) jSel = ids[0] || null;
  ids.forEach((id) => { const q = QUESTS[id], d = document.createElement('div'); d.className = 'jItem' + (jSel === id ? ' sel' : '') + (q.main ? ' main' : ''); d.innerHTML = `<b>${P.track === id ? '★ ' : ''}${q.title}</b><small>${q.area}${isActive(id) && isReady(id) ? ' · <span class="yes">готово до здачі</span>' : ''}</small>`; d.onclick = () => { jSel = id; Sfx.play('click'); renderJournal(); }; list.appendChild(d); });
  if (jSel === null) return;
  const q = QUESTS[jSel], act = isActive(jSel), rows = q.obj.map((o, i) => {
    const dn = act ? objDone(jSel, i) : true, cur = act && activeObjs(jSel).includes(i), hidden = act && q.seq && !dn && !cur;
    return `<li class="${dn ? 'yes' : cur || !q.seq ? '' : 'dim'}">${dn ? '✔' : '◦'} ${hidden ? '???' : o.text}${!dn && (o.n || 1) > 1 && !hidden ? ` (${objProgress(jSel, i)}/${o.n})` : ''}</li>`;
  }).join('');
  det.innerHTML = `<h3>${q.main ? '✦ ' : ''}${q.title}</h3><div class="jMeta">${q.area} · ${act ? 'у процесі' : 'виконано'}</div><p class="jTxt">${q.desc}</p><ul class="jObj">${rows}</ul><div class="jMeta">${act ? 'Здати: ' + q.to : ''}</div><div class="jRew">${rewardText(q)}</div>`;
  if (act) { const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = P.track === jSel ? '★ Відстежується' : 'Відстежувати'; b.onclick = () => { P.track = jSel; Sfx.play('click'); renderJournal(); }; det.appendChild(b); }
}
function openJournal() { if (G.state !== 'play') return; G.state = 'journal'; if (!jSel || jTab === 'notes') jTab = 'active'; renderJournal(); jEl.classList.remove('hidden'); Sfx.play('click'); }
function closeJournal() { jEl.classList.add('hidden'); G.state = 'play'; }
$('#jClose').onclick = closeJournal;

// ---------- Трекер у HUD ----------
function drawQuestTracker(x, y) {
  const id = P.track && isActive(P.track) ? P.track : null; if (!id) return; const q = QUESTS[id];
  const lines = activeObjs(id).slice(0, 3).map((i) => { const o = q.obj[i]; return '• ' + o.text + ((o.n || 1) > 1 ? ` ${objProgress(id, i)}/${o.n}` : ''); });
  if (isReady(id)) lines.splice(0, lines.length, '• Повернись: ' + q.to.split(' (')[0]);
  ctx.font = 'bold 13px Georgia'; ctx.fillStyle = '#ffd24a'; ctx.fillText('✦ ' + q.title, x, y);
  ctx.font = '12px Georgia'; ctx.fillStyle = isReady(id) ? '#9be89b' : '#d8cdb8'; lines.forEach((t, k) => ctx.fillText(t.length > 48 ? t.slice(0, 47) + '…' : t, x, y + 16 + k * 15));
}
