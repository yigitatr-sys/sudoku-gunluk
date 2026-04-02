// ═══════════════════════════════════════════════════════
// JOURNEY MOD — CHAPTER TEMALARI & BUTON GÜNCELLEME
// ═══════════════════════════════════════════════════════

const JOURNEY_CHAPTERS = [
  { id:1, name:'Yeşil Orman',     icon:'🌲', emoji:'🌲', gradient:'linear-gradient(135deg,#0a2010,#1a4a20)', border:'#22c55e', badge:'BÖLÜM 1-20'  },
  { id:2, name:'Karanlık Mağara', icon:'🕯️', emoji:'🦇', gradient:'linear-gradient(135deg,#1a0a2a,#2d1060)', border:'#a855f7', badge:'BÖLÜM 21-40' },
  { id:3, name:'Antik Kale',      icon:'🏰', emoji:'⚔️', gradient:'linear-gradient(135deg,#2a1500,#5c3010)', border:'#f97316', badge:'BÖLÜM 41-60' },
  { id:4, name:'Ejderha Dağı',    icon:'🌋', emoji:'🔥', gradient:'linear-gradient(135deg,#2a0a00,#6b1a00)', border:'#ef4444', badge:'BÖLÜM 61-80' },
  { id:5, name:'Efsane Kule',     icon:'⚡', emoji:'✨', gradient:'linear-gradient(135deg,#0a0a1a,#1a1a5a)', border:'#eab308', badge:'BÖLÜM 81-100'},
];

const JOURNEY_LEVELS = (() => {
  const chapters = [
    { ch:1, mode:'medium',      levels:['Filizlenen Tohum','Ormancı\'nın Evi','Büyük Meşe','Peri Çeşmesi','Gizli Yol','Sarmaşık Kulesi','Ay Işığı Gölü','Kuzey Rüzgarı','Ejderha Otu','Orman Kalbi','Işıltılı Çiçek','Mantar Ormanı','Kayıp İz','Ormancı\'nın Sırrı','Şelale Köprüsü','Yeşil Perde','Fısıldayan Ağaç','Gece Yarısı','Derin Kök','Ormanın Uyanışı'] },
    { ch:2, mode:'hard',        levels:['İlk Adım','Taş Kapı','Yankı Holü','Fosil Duvar','Yeraltı Nehri','Kör Yarasa','Kristal Odası','Karanlık Kıvrım','Çıkmaz Sokak','Mağara Kalbi','Damla Damlaya','Gizli Geçit','Asılı Köprü','Işıksız Yol','Mağara Cini','Taş Ejderha','Kadim Oyma','Gölge Labirenti','Son Fener','Karanlığın Sonu'] },
    { ch:3, mode:'expert',      levels:['Kale Kapısı','Pazar Meydanı','Zindan','Taht Odası','Kule Bekçisi','Gizli Oda','Şövalye Koğuşu','Hazine Odası','Katedral','Kale Kütüphanesi','Silah Deposu','Kuzey Kulesi','Baskı Odası','Kale Mutfağı','Ejderha Kafesi','Son Nöbet','Yenilmez Sur','Taç Salonu','Kale Ruhu','Antik Kale\'nin Sırrı'] },
    { ch:4, mode:'master',      levels:['Dağ Eteği','Lav Kanalı','Kor Köprüsü','Ejderha Yuvası','Ateş Nehri','Kayaç Labirenti','Volkanik Mağara','Ateş Bekçisi','Sülfür Bulutu','Dağın Öfkesi','Lav Gölü','Son Yokuş','Alev Kapısı','Ejderha Evi','Kül Ovası','Kor Taht','Ateşli Ruh','Dağ Kalbi','Ejderha\'nın Gözyaşı','Zirvede Sona Doğru'] },
    { ch:5, mode:'grandmaster', levels:['Kule Girişi','Birinci Kat','Gök Asansörü','Bulut Katı','Yıldız Odası','Zaman Koridoru','Ebedi Kütüphane','Rüzgar Terası','Fırtına Odası','Işık Holü','Ay Platformu','Kaos Kapısı','Efsane Labirent','Tanrısal Oda','Sonsuza Giden Yol','Gök Tahtı','Kristal Kule','Şimşek Holü','Efsane Zirve','Efsane\'nin Kalbi'] },
  ];
  let all = [];
  chapters.forEach(ch => {
    const chData = JOURNEY_CHAPTERS[ch.ch - 1];
    ch.levels.forEach((name, i) => {
      all.push({ num:(ch.ch-1)*20+i+1, name, chapter:ch.ch, chapterName:chData.name, chapterIcon:chData.icon, chapterColor:chData.border, mode:ch.mode });
    });
  });
  return all;
})();

function getJourneyProgress() {
  return parseInt(localStorage.getItem('journey_progress') || '0');
}

function getCurrentChapter(progress) {
  if (progress >= 80) return JOURNEY_CHAPTERS[4];
  if (progress >= 60) return JOURNEY_CHAPTERS[3];
  if (progress >= 40) return JOURNEY_CHAPTERS[2];
  if (progress >= 20) return JOURNEY_CHAPTERS[1];
  return JOURNEY_CHAPTERS[0];
}

function updateJourneyHomeBtn() {
  const progress = getJourneyProgress();
  const chapter  = getCurrentChapter(progress);
  const pct      = Math.round((progress / 100) * 100);
  const btn = document.getElementById('journeyHomeBtn');
  if (!btn) return;
  btn.style.background   = chapter.gradient;
  btn.style.borderColor  = chapter.border;
  const icon = document.getElementById('journeyBtnIcon');
  if (icon) icon.textContent = chapter.icon;
  const watermark = document.getElementById('journeyBtnWatermark');
  if (watermark) watermark.textContent = chapter.emoji;
  const badge = document.getElementById('journeyBtnBadge');
  if (badge) badge.textContent = chapter.badge;
  const desc = document.getElementById('journeyBtnDesc');
  if (desc) desc.textContent = chapter.name + ' · ' + (progress === 0 ? 'Yolculuk başlıyor!' : progress + '. bölümde kaldın');
  const bar = document.getElementById('journeyBtnProgress');
  if (bar) bar.style.width = pct + '%';
  const txt = document.getElementById('journeyBtnProgressText');
  if (txt) txt.textContent = progress + ' / 100 bölüm tamamlandı';
}

function showJourneyScreen() {
  const s = document.getElementById('journeyScreen');
  s.style.display = 'flex';
  document.getElementById('swipeDots').style.display = 'none';
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.display = 'none';
  const bg = document.getElementById('journeyBg');
  const chapter = getCurrentChapter(getJourneyProgress());
  bg.style.transition = 'none';
  bg.style.background = chapter.gradient;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bg.style.transition = 'opacity 0.55s ease';
    bg.style.opacity = '1';
  }));
  renderJourneyMap();
  const mapArea = document.querySelector('.px-map-area');
  if (mapArea) {
    mapArea.addEventListener('scroll', updateJourneyBgOnScroll);
    updateJourneyBgOnScroll.call(mapArea);
  }
}

function updateJourneyBgOnScroll() {
  const mapArea = document.querySelector('.px-map-area');
  if (!mapArea) return;
  const scrollTop  = mapArea.scrollTop;
  const totalHeight = mapArea.scrollHeight - mapArea.clientHeight;
  const pct = totalHeight > 0 ? scrollTop / totalHeight : 0;

  // 5 chapter, her biri %20'lik dilim
  const chIdx = Math.min(4, Math.floor(pct * 5));
  document.getElementById('journeyBg').innerHTML = JOURNEY_BG_SVGS[chIdx];
}2

function hideJourneyScreen() {
  document.getElementById('journeyScreen').style.display = 'none';
  // Swipe dots ve alt nav'ı geri getir
  document.getElementById('swipeDots').style.display = 'flex';
  const nav = document.querySelector('.bottom-nav');
  if (nav) nav.style.display = 'flex';
}

const JOURNEY_BG_SVGS = [
  // CH1 - YEŞİL ORMAN
  `<svg width="100%" height="100%" viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="780" fill="#050e08"/>
  <rect width="390" height="360" fill="#071408"/>
  <rect class="jrn-star" style="--d:2.1s;--delay:0s"   x="18"  y="18"  width="2" height="2" fill="#a7f3d0"/>
  <rect class="jrn-star" style="--d:3.4s;--delay:.6s"  x="48"  y="38"  width="2" height="2" fill="#6ee7b7"/>
  <rect class="jrn-star" style="--d:1.9s;--delay:1.1s" x="85"  y="12"  width="2" height="2" fill="#a7f3d0"/>
  <rect class="jrn-star" style="--d:2.7s;--delay:.3s"  x="128" y="32"  width="2" height="2" fill="#bbf7d0"/>
  <rect class="jrn-star" style="--d:3.1s;--delay:1.5s" x="170" y="8"   width="2" height="2" fill="#6ee7b7"/>
  <rect class="jrn-star" style="--d:2.3s;--delay:.8s"  x="210" y="28"  width="2" height="2" fill="#a7f3d0"/>
  <rect class="jrn-star" style="--d:1.7s;--delay:2.0s" x="255" y="15"  width="2" height="2" fill="#bbf7d0"/>
  <rect class="jrn-star" style="--d:2.9s;--delay:.4s"  x="295" y="40"  width="2" height="2" fill="#6ee7b7"/>
  <rect class="jrn-star" style="--d:3.6s;--delay:1.3s" x="335" y="10"  width="2" height="2" fill="#a7f3d0"/>
  <rect class="jrn-star" style="--d:2.0s;--delay:.9s"  x="368" y="30"  width="2" height="2" fill="#bbf7d0"/>
  <rect class="jrn-star" style="--d:2.5s;--delay:1.7s" x="62"  y="58"  width="2" height="2" fill="#6ee7b7"/>
  <rect class="jrn-star" style="--d:3.2s;--delay:.2s"  x="145" y="62"  width="2" height="2" fill="#a7f3d0"/>
  <rect class="jrn-star" style="--d:1.8s;--delay:2.3s" x="230" y="55"  width="2" height="2" fill="#bbf7d0"/>
  <rect class="jrn-star" style="--d:2.6s;--delay:.7s"  x="318" y="60"  width="2" height="2" fill="#6ee7b7"/>
  <rect class="jrn-star" style="--d:2.8s;--delay:.5s"  x="98"  y="46"  width="3" height="3" fill="#d1fae5"/>
  <rect class="jrn-star" style="--d:3.0s;--delay:1.4s" x="275" y="42"  width="3" height="3" fill="#d1fae5"/>
  <rect x="315" y="22" width="36" height="36" fill="#fde68a"/>
  <rect x="320" y="17" width="26" height="6"  fill="#fde68a"/>
  <rect x="309" y="28" width="6"  height="24" fill="#fde68a"/>
  <rect x="351" y="28" width="6"  height="24" fill="#fde68a"/>
  <rect x="320" y="58" width="26" height="6"  fill="#fde68a"/>
  <rect x="322" y="28" width="14" height="14" fill="#f0c040" opacity=".4"/>
  <rect x="334" y="38" width="8"  height="8"  fill="#c8980a" opacity=".3"/>
  <g class="jrn-cloud-l" opacity=".18">
    <rect x="20"  y="75" width="90" height="16" fill="#a7f3d0" rx="8"/>
    <rect x="10"  y="68" width="60" height="18" fill="#a7f3d0" rx="9"/>
    <rect x="55"  y="65" width="40" height="14" fill="#a7f3d0" rx="7"/>
  </g>
  <g class="jrn-cloud-r" opacity=".15">
    <rect x="220" y="85" width="80" height="14" fill="#a7f3d0" rx="7"/>
    <rect x="240" y="78" width="55" height="16" fill="#a7f3d0" rx="8"/>
    <rect x="210" y="82" width="45" height="12" fill="#a7f3d0" rx="6"/>
  </g>
  <polygon points="0,200 45,115 90,170 140,100 195,155 250,90 305,145 350,105 390,135 390,230 0,230" fill="#061008"/>
  <polygon points="0,250 30,185 75,220 130,175 185,210 240,168 295,205 345,172 390,195 390,280 0,280" fill="#081808"/>
  <rect x="5"   y="245" width="9"  height="80" fill="#051005"/>
  <polygon points="9,195  -4,248  22,248"  fill="#071508"/>
  <polygon points="9,180  -6,232  24,232"  fill="#091a0a"/>
  <polygon points="9,168  -4,218  22,218"  fill="#071508"/>
  <rect x="30"  y="252" width="7"  height="75" fill="#051005"/>
  <polygon points="33,205 22,255  44,255"  fill="#071508"/>
  <polygon points="33,192 20,242  46,242"  fill="#091a0a"/>
  <rect x="55"  y="248" width="8"  height="78" fill="#051005"/>
  <polygon points="59,200 47,250  71,250"  fill="#071508"/>
  <polygon points="59,186 45,236  73,236"  fill="#091a0a"/>
  <polygon points="59,174 48,222  70,222"  fill="#071508"/>
  <rect x="318" y="248" width="8"  height="78" fill="#051005"/>
  <polygon points="322,200 310,250 334,250" fill="#071508"/>
  <polygon points="322,186 308,236 336,236" fill="#091a0a"/>
  <polygon points="322,174 311,222 333,222" fill="#071508"/>
  <rect x="345" y="252" width="7"  height="75" fill="#051005"/>
  <polygon points="348,205 337,255 359,255" fill="#071508"/>
  <polygon points="348,192 335,242 361,242" fill="#091a0a"/>
  <rect x="368" y="245" width="9"  height="80" fill="#051005"/>
  <polygon points="372,195 359,248 385,248" fill="#071508"/>
  <polygon points="372,180 357,232 387,232" fill="#091a0a"/>
  <polygon points="372,168 360,218 384,218" fill="#071508"/>
  <rect x="0" y="340" width="390" height="440" fill="#0d3318"/>
  <rect x="0" y="333" width="390" height="14" fill="#14532d"/>
  <rect x="0" y="322" width="390" height="14" fill="#166534"/>
  <rect x="0"   y="312" width="7"  height="12" fill="#22c55e"/>
  <rect x="12"  y="308" width="5"  height="16" fill="#16a34a"/>
  <rect x="22"  y="313" width="8"  height="10" fill="#22c55e"/>
  <rect x="36"  y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="48"  y="312" width="7"  height="11" fill="#22c55e"/>
  <rect x="62"  y="307" width="5"  height="16" fill="#16a34a"/>
  <rect x="74"  y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="90"  y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="102" y="312" width="7"  height="11" fill="#22c55e"/>
  <rect x="116" y="308" width="5"  height="16" fill="#16a34a"/>
  <rect x="128" y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="144" y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="156" y="311" width="7"  height="12" fill="#22c55e"/>
  <rect x="170" y="307" width="5"  height="16" fill="#16a34a"/>
  <rect x="182" y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="198" y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="210" y="312" width="7"  height="11" fill="#22c55e"/>
  <rect x="224" y="308" width="5"  height="16" fill="#16a34a"/>
  <rect x="236" y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="252" y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="264" y="311" width="7"  height="12" fill="#22c55e"/>
  <rect x="278" y="307" width="5"  height="16" fill="#16a34a"/>
  <rect x="290" y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="306" y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="318" y="312" width="7"  height="11" fill="#22c55e"/>
  <rect x="332" y="308" width="5"  height="16" fill="#16a34a"/>
  <rect x="344" y="312" width="8"  height="10" fill="#22c55e"/>
  <rect x="360" y="309" width="5"  height="14" fill="#16a34a"/>
  <rect x="372" y="312" width="7"  height="11" fill="#22c55e"/>
  <rect x="384" y="307" width="6"  height="16" fill="#16a34a"/>
  <g class="jrn-sway">
    <rect x="0"   y="380" width="14" height="160" fill="#3d1a00"/>
    <polygon points="7,280   -18,382  32,382"  fill="#15803d"/>
    <polygon points="7,258   -20,365  34,365"  fill="#16a34a"/>
    <polygon points="7,240   -16,348  30,348"  fill="#22c55e"/>
    <polygon points="7,226   -12,330  26,330"  fill="#4ade80"/>
  </g>
  <g class="jrn-sway" style="animation-delay:.8s">
    <rect x="42"  y="398" width="11" height="142" fill="#3d1a00"/>
    <polygon points="47,305  26,400  68,400"  fill="#15803d"/>
    <polygon points="47,285  24,382  70,382"  fill="#16a34a"/>
    <polygon points="47,270  28,366  66,366"  fill="#22c55e"/>
    <polygon points="47,258  30,350  64,350"  fill="#4ade80"/>
  </g>
  <g class="jrn-sway" style="animation-delay:1.4s">
    <rect x="78"  y="410" width="9"  height="130" fill="#3d1a00"/>
    <polygon points="82,325  64,412  100,412" fill="#166534"/>
    <polygon points="82,308  62,395  102,395" fill="#15803d"/>
    <polygon points="82,294  65,380  99,380"  fill="#16a34a"/>
    <polygon points="82,283  66,366  98,366"  fill="#22c55e"/>
  </g>
  <g class="jrn-sway" style="animation-delay:.4s">
    <rect x="376" y="375" width="14" height="165" fill="#3d1a00"/>
    <polygon points="383,278 358,380 408,380" fill="#15803d"/>
    <polygon points="383,256 356,363 410,363" fill="#16a34a"/>
    <polygon points="383,238 360,346 406,346" fill="#22c55e"/>
    <polygon points="383,225 362,328 404,328" fill="#4ade80"/>
  </g>
  <g class="jrn-sway" style="animation-delay:1.1s">
    <rect x="336" y="392" width="11" height="148" fill="#3d1a00"/>
    <polygon points="341,300 320,394 362,394" fill="#15803d"/>
    <polygon points="341,280 318,376 364,376" fill="#16a34a"/>
    <polygon points="341,265 322,360 360,360" fill="#22c55e"/>
    <polygon points="341,254 324,345 358,345" fill="#4ade80"/>
  </g>
  <g class="jrn-sway" style="animation-delay:1.9s">
    <rect x="300" y="405" width="9"  height="135" fill="#3d1a00"/>
    <polygon points="304,322 286,408 322,408" fill="#166534"/>
    <polygon points="304,305 284,390 324,390" fill="#15803d"/>
    <polygon points="304,292 287,376 321,376" fill="#16a34a"/>
    <polygon points="304,281 289,363 319,363" fill="#22c55e"/>
  </g>
  <circle class="jrn-ff" style="--d:3.2s;--delay:0s"   cx="130" cy="295" r="2.5" fill="#86efac"/>
  <circle class="jrn-ff" style="--d:4.1s;--delay:1.1s" cx="180" cy="270" r="2"   fill="#4ade80"/>
  <circle class="jrn-ff" style="--d:3.7s;--delay:2.0s" cx="230" cy="305" r="2.5" fill="#bbf7d0"/>
  <circle class="jrn-ff" style="--d:5.0s;--delay:.5s"  cx="155" cy="340" r="2"   fill="#86efac"/>
  <circle class="jrn-ff" style="--d:3.5s;--delay:1.8s" cx="255" cy="285" r="2.5" fill="#4ade80"/>
  </svg>`,

  // CH2 - KARANLIK MAĞARA
  `<svg width="100%" height="100%" viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="780" fill="#0a0418"/>
  <rect width="390" height="120" fill="#110820"/>
  <polygon points="0,0   14,0  7,55"  fill="#1a0d2e"/>
  <polygon points="22,0  38,0  30,72" fill="#150a26"/>
  <polygon points="50,0  68,0  59,60" fill="#1a0d2e"/>
  <polygon points="78,0  94,0  86,80" fill="#150a26"/>
  <polygon points="108,0 126,0 117,65" fill="#1a0d2e"/>
  <polygon points="140,0 156,0 148,75" fill="#150a26"/>
  <polygon points="168,0 184,0 176,58" fill="#1a0d2e"/>
  <polygon points="196,0 214,0 205,82" fill="#150a26"/>
  <polygon points="224,0 242,0 233,62" fill="#1a0d2e"/>
  <polygon points="255,0 271,0 263,70" fill="#150a26"/>
  <polygon points="284,0 300,0 292,56" fill="#1a0d2e"/>
  <polygon points="312,0 330,0 321,78" fill="#150a26"/>
  <polygon points="342,0 358,0 350,64" fill="#1a0d2e"/>
  <polygon points="368,0 384,0 376,72" fill="#150a26"/>
  <polygon points="0,180 0,220 18,200"  fill="#7c3aed" opacity=".5"/>
  <polygon points="0,340 0,375 18,357"  fill="#7c3aed" opacity=".45"/>
  <polygon points="0,520 0,555 18,537"  fill="#7c3aed" opacity=".35"/>
  <polygon points="0,710 0,742 18,726"  fill="#7c3aed" opacity=".4"/>
  <polygon points="390,175 390,215 372,195" fill="#7c3aed" opacity=".5"/>
  <polygon points="390,355 390,388 374,371" fill="#7c3aed" opacity=".45"/>
  <polygon points="390,535 390,568 376,551" fill="#7c3aed" opacity=".35"/>
  <polygon points="390,720 390,752 374,736" fill="#7c3aed" opacity=".4"/>
  <polygon points="30,740  38,700 46,740"  fill="#7c3aed" opacity=".7"/>
  <polygon points="92,745 100,715 108,745" fill="#7c3aed" opacity=".5"/>
  <polygon points="162,742 168,718 174,742" fill="#6d28d9" opacity=".45"/>
  <polygon points="228,744 236,714 244,744" fill="#a855f7" opacity=".5"/>
  <polygon points="292,741 299,716 306,741" fill="#7c3aed" opacity=".5"/>
  <polygon points="348,743 356,712 364,743" fill="#6d28d9" opacity=".45"/>
  <rect x="0" y="748" width="390" height="32" fill="#1a0d2e"/>
  <circle class="jrn-star" style="--d:2.4s;--delay:0s"   cx="22"  cy="198" r="3" fill="#c4b5fd" opacity=".8"/>
  <circle class="jrn-star" style="--d:3.1s;--delay:.8s"  cx="368" cy="193" r="3" fill="#a78bfa" opacity=".8"/>
  <circle class="jrn-star" style="--d:2.7s;--delay:.3s"  cx="372" cy="370" r="2" fill="#a78bfa" opacity=".7"/>
  <circle class="jrn-star" style="--d:3.4s;--delay:1.1s" cx="18"  cy="537" r="3" fill="#c4b5fd" opacity=".8"/>
  <circle class="jrn-star" style="--d:2.9s;--delay:1.7s" cx="42"  cy="725" r="4" fill="#c4b5fd" opacity=".9"/>
  <circle class="jrn-star" style="--d:1.8s;--delay:.4s"  cx="98"  cy="720" r="3" fill="#a78bfa" opacity=".8"/>
  <circle class="jrn-star" style="--d:3.2s;--delay:1.2s" cx="165" cy="722" r="4" fill="#c4b5fd" opacity=".9"/>
  <circle class="jrn-star" style="--d:2.5s;--delay:.9s"  cx="233" cy="720" r="3" fill="#a78bfa" opacity=".8"/>
  <circle class="jrn-star" style="--d:2.1s;--delay:1.5s" cx="295" cy="723" r="4" fill="#c4b5fd" opacity=".9"/>
  <circle class="jrn-star" style="--d:3.6s;--delay:.2s"  cx="353" cy="720" r="3" fill="#a78bfa" opacity=".8"/>
  <g class="jrn-ff" style="--d:5s;--delay:0s">
    <rect x="186" y="140" width="5" height="4" fill="#4c1d95"/>
    <polygon points="186,140 175,132 181,140" fill="#4c1d95"/>
    <polygon points="191,140 202,132 196,140" fill="#4c1d95"/>
  </g>
  <g class="jrn-ff" style="--d:7s;--delay:2.5s">
    <rect x="90" y="160" width="5" height="4" fill="#4c1d95"/>
    <polygon points="90,160 79,152 85,160" fill="#4c1d95"/>
    <polygon points="95,160 106,152 100,160" fill="#4c1d95"/>
  </g>
  </svg>`,

  // CH3 - ANTİK KALE
  `<svg width="100%" height="100%" viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="780" fill="#150800"/>
  <rect width="390" height="300" fill="#1e0e00"/>
  <rect class="jrn-star" style="--d:2.3s;--delay:0s"   x="22"  y="15" width="2" height="2" fill="#fed7aa"/>
  <rect class="jrn-star" style="--d:3.1s;--delay:.7s"  x="65"  y="28" width="2" height="2" fill="#fdba74"/>
  <rect class="jrn-star" style="--d:1.8s;--delay:1.2s" x="105" y="10" width="2" height="2" fill="#fed7aa"/>
  <rect class="jrn-star" style="--d:2.6s;--delay:.4s"  x="148" y="35" width="2" height="2" fill="#fdba74"/>
  <rect class="jrn-star" style="--d:3.4s;--delay:1.6s" x="190" y="12" width="2" height="2" fill="#fed7aa"/>
  <rect class="jrn-star" style="--d:2.1s;--delay:.9s"  x="238" y="30" width="2" height="2" fill="#fdba74"/>
  <rect class="jrn-star" style="--d:2.8s;--delay:.5s"  x="320" y="38" width="2" height="2" fill="#fdba74"/>
  <rect class="jrn-star" style="--d:3.3s;--delay:1.4s" x="358" y="14" width="2" height="2" fill="#fed7aa"/>
  <rect x="100" y="100" width="190" height="200" fill="#0d0500"/>
  <rect x="90"  y="70"  width="45"  height="150" fill="#0a0400"/>
  <rect x="255" y="70"  width="45"  height="150" fill="#0a0400"/>
  <rect x="135" y="130" width="120" height="170" fill="#0d0500"/>
  <rect x="90"  y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="102" y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="114" y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="126" y="62"  width="9"   height="14"  fill="#0a0400"/>
  <rect x="255" y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="267" y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="279" y="62"  width="8"   height="14"  fill="#0a0400"/>
  <rect x="291" y="62"  width="9"   height="14"  fill="#0a0400"/>
  <rect x="170" y="235" width="50"  height="65"  fill="#080300"/>
  <rect x="172" y="232" width="46"  height="8"   fill="#080300" rx="23"/>
  <rect class="jrn-ff" style="--d:2s;--delay:0s"    x="104" y="105" width="12" height="16" fill="#f97316" opacity=".5" rx="2"/>
  <rect class="jrn-ff" style="--d:2.8s;--delay:.6s" x="272" y="105" width="12" height="16" fill="#f97316" opacity=".5" rx="2"/>
  <rect class="jrn-ff" style="--d:1.2s;--delay:0s"  x="96"  y="218" width="4" height="8" fill="#f97316" opacity=".9"/>
  <rect class="jrn-ff" style="--d:1.5s;--delay:.2s" x="96"  y="213" width="4" height="6" fill="#fbbf24" opacity=".8"/>
  <rect class="jrn-ff" style="--d:1.2s;--delay:.1s" x="289" y="218" width="4" height="8" fill="#f97316" opacity=".9"/>
  <rect class="jrn-ff" style="--d:1.5s;--delay:.3s" x="289" y="213" width="4" height="6" fill="#fbbf24" opacity=".8"/>
  <rect x="0"   y="500" width="390" height="280" fill="#1e0e00"/>
  <rect x="0"   y="493" width="390" height="14"  fill="#2a1400"/>
  <rect x="0"   y="496" width="48"  height="12" fill="#221000" rx="1"/>
  <rect x="50"  y="496" width="42"  height="12" fill="#281200" rx="1"/>
  <rect x="94"  y="496" width="52"  height="12" fill="#221000" rx="1"/>
  <rect x="148" y="496" width="44"  height="12" fill="#281200" rx="1"/>
  <rect x="194" y="496" width="50"  height="12" fill="#221000" rx="1"/>
  <rect x="246" y="496" width="46"  height="12" fill="#281200" rx="1"/>
  <rect x="294" y="496" width="52"  height="12" fill="#221000" rx="1"/>
  <rect x="348" y="496" width="42"  height="12" fill="#281200" rx="1"/>
  <rect x="40"  y="460" width="6" height="38" fill="#2a1200"/>
  <rect class="jrn-ff" style="--d:1.3s;--delay:0s"   x="38"  y="448" width="10" height="14" fill="#f97316" opacity=".85"/>
  <rect class="jrn-ff" style="--d:1.6s;--delay:.15s" x="39"  y="443" width="8"  height="10" fill="#fbbf24" opacity=".75"/>
  <rect x="175" y="460" width="6" height="38" fill="#2a1200"/>
  <rect class="jrn-ff" style="--d:1.4s;--delay:.2s"  x="173" y="448" width="10" height="14" fill="#f97316" opacity=".85"/>
  <rect class="jrn-ff" style="--d:1.7s;--delay:.35s" x="174" y="443" width="8"  height="10" fill="#fbbf24" opacity=".75"/>
  <rect x="340" y="460" width="6" height="38" fill="#2a1200"/>
  <rect class="jrn-ff" style="--d:1.2s;--delay:.1s"  x="338" y="448" width="10" height="14" fill="#f97316" opacity=".85"/>
  <rect class="jrn-ff" style="--d:1.5s;--delay:.25s" x="339" y="443" width="8"  height="10" fill="#fbbf24" opacity=".75"/>
  </svg>`,

  // CH4 - EJDERHA DAĞI
  `<svg width="100%" height="100%" viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="780" fill="#1a0500"/>
  <rect width="390" height="280" fill="#220800"/>
  <g class="jrn-cloud-l" opacity=".35">
    <rect x="10"  y="30" width="100" height="22" fill="#2d0a00" rx="11"/>
    <rect x="0"   y="22" width="70"  height="24" fill="#2d0a00" rx="12"/>
    <rect x="55"  y="18" width="55"  height="20" fill="#2d0a00" rx="10"/>
  </g>
  <g class="jrn-cloud-r" opacity=".3">
    <rect x="230" y="25" width="90"  height="20" fill="#2d0a00" rx="10"/>
    <rect x="255" y="18" width="65"  height="22" fill="#2d0a00" rx="11"/>
    <rect x="220" y="22" width="55"  height="18" fill="#2d0a00" rx="9"/>
  </g>
  <rect class="jrn-star" style="--d:1.5s;--delay:0s"   x="30"  y="15" width="2" height="2" fill="#fca5a5"/>
  <rect class="jrn-star" style="--d:2.2s;--delay:.5s"  x="75"  y="32" width="2" height="2" fill="#f87171"/>
  <rect class="jrn-star" style="--d:1.8s;--delay:1.0s" x="130" y="12" width="2" height="2" fill="#fca5a5"/>
  <rect class="jrn-star" style="--d:2.6s;--delay:.3s"  x="185" y="28" width="2" height="2" fill="#f87171"/>
  <rect class="jrn-star" style="--d:2.9s;--delay:.8s"  x="298" y="35" width="2" height="2" fill="#f87171"/>
  <rect class="jrn-star" style="--d:1.7s;--delay:1.2s" x="352" y="18" width="2" height="2" fill="#fca5a5"/>
  <polygon points="195,40 60,280 330,280" fill="#3d0800"/>
  <polygon points="195,40 85,280 305,280" fill="#4a0e00"/>
  <polygon points="195,40 110,280 280,280" fill="#550f00"/>
  <ellipse cx="195" cy="48" rx="28" ry="14" fill="#8b1500"/>
  <ellipse cx="195" cy="48" rx="18" ry="9"  fill="#c2200a"/>
  <ellipse cx="195" cy="48" rx="10" ry="5"  fill="#ef4444"/>
  <polygon points="168,55 155,280 178,280" fill="#ef4444" opacity=".6"/>
  <polygon points="168,55 160,280 172,280" fill="#f97316" opacity=".5"/>
  <polygon points="222,55 212,280 235,280" fill="#ef4444" opacity=".6"/>
  <polygon points="222,55 218,280 230,280" fill="#f97316" opacity=".5"/>
  <ellipse class="jrn-ff" style="--d:2s;--delay:0s"    cx="195" cy="50" rx="22" ry="10" fill="#f97316" opacity=".4"/>
  <polygon points="0,250  40,165  80,230  120,170 160,215 200,200" fill="#2a0600"/>
  <polygon points="200,200 240,170 280,215 320,165 360,230 390,180 390,280 0,280" fill="#2a0600"/>
  <rect x="0"   y="440" width="390" height="340" fill="#2d0800"/>
  <rect x="0"   y="432" width="390" height="16"  fill="#3d0a00"/>
  <rect class="jrn-ff" style="--d:2.5s;--delay:0s"   x="15"  y="445" width="55" height="6" fill="#ef4444" opacity=".6" rx="3"/>
  <rect class="jrn-ff" style="--d:3.1s;--delay:.8s"  x="85"  y="450" width="40" height="5" fill="#f97316" opacity=".5" rx="3"/>
  <rect class="jrn-ff" style="--d:2.2s;--delay:.4s"  x="140" y="444" width="65" height="7" fill="#ef4444" opacity=".65" rx="3"/>
  <rect class="jrn-ff" style="--d:2.8s;--delay:1.2s" x="220" y="448" width="48" height="5" fill="#f97316" opacity=".5" rx="3"/>
  <rect class="jrn-ff" style="--d:2.0s;--delay:.6s"  x="282" y="443" width="58" height="7" fill="#ef4444" opacity=".6" rx="3"/>
  <rect class="jrn-ff" style="--d:3.4s;--delay:.2s"  x="348" y="450" width="42" height="5" fill="#f97316" opacity=".5" rx="3"/>
  <polygon points="0,440   0,400   35,435"  fill="#1e0500"/>
  <polygon points="390,435 390,395 355,430" fill="#1e0500"/>
  </svg>`,

  // CH5 - EFSANE KULE
  `<svg width="100%" height="100%" viewBox="0 0 390 780" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="780" fill="#03030f"/>
  <rect width="390" height="400" fill="#05050f"/>
  <rect class="jrn-star" style="--d:2.1s;--delay:0s"   x="12"  y="10" width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:3.2s;--delay:.4s"  x="32"  y="28" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:1.7s;--delay:.9s"  x="55"  y="8"  width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.8s;--delay:.2s"  x="78"  y="22" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:3.5s;--delay:1.3s" x="100" y="12" width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.3s;--delay:.7s"  x="122" y="35" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:1.9s;--delay:1.8s" x="148" y="6"  width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.6s;--delay:.5s"  x="172" y="26" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:3.1s;--delay:1.1s" x="195" y="14" width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.4s;--delay:.3s"  x="220" y="32" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:1.8s;--delay:2.0s" x="244" y="8"  width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.9s;--delay:.6s"  x="268" y="24" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:3.4s;--delay:1.5s" x="292" y="10" width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.2s;--delay:.8s"  x="315" y="36" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:1.6s;--delay:1.7s" x="338" y="14" width="2" height="2" fill="#fde68a"/>
  <rect class="jrn-star" style="--d:2.7s;--delay:.1s"  x="362" y="28" width="2" height="2" fill="#fbbf24"/>
  <rect class="jrn-star" style="--d:2.8s;--delay:.5s"  x="45"  y="38" width="3" height="3" fill="#fff7ed"/>
  <rect class="jrn-star" style="--d:3.2s;--delay:1.2s" x="138" y="30" width="3" height="3" fill="#fff7ed"/>
  <rect class="jrn-star" style="--d:2.1s;--delay:.9s"  x="232" y="42" width="3" height="3" fill="#fff7ed"/>
  <rect class="jrn-star" style="--d:3.5s;--delay:.1s"  x="325" y="32" width="3" height="3" fill="#fff7ed"/>
  <g class="jrn-cloud-l" opacity=".12">
    <rect x="0"   y="90"  width="130" height="30" fill="#fbbf24" rx="15"/>
    <rect x="20"  y="80"  width="90"  height="28" fill="#fbbf24" rx="14"/>
    <rect x="80"  y="88"  width="70"  height="24" fill="#fbbf24" rx="12"/>
  </g>
  <g class="jrn-cloud-r" opacity=".10">
    <rect x="200" y="100" width="110" height="28" fill="#fbbf24" rx="14"/>
    <rect x="230" y="90"  width="80"  height="26" fill="#fbbf24" rx="13"/>
    <rect x="195" y="96"  width="65"  height="22" fill="#fbbf24" rx="11"/>
  </g>
  <rect x="165" y="30"  width="60"  height="380" fill="#0a0a20"/>
  <rect x="155" y="100" width="80"  height="12"  fill="#0d0d28"/>
  <rect x="150" y="180" width="90"  height="12"  fill="#0d0d28"/>
  <rect x="145" y="260" width="100" height="12"  fill="#0d0d28"/>
  <rect x="140" y="340" width="110" height="14"  fill="#0d0d28"/>
  <rect x="160" y="22"  width="10"  height="14"  fill="#0a0a20"/>
  <rect x="174" y="22"  width="10"  height="14"  fill="#0a0a20"/>
  <rect x="188" y="22"  width="10"  height="14"  fill="#0a0a20"/>
  <rect x="202" y="22"  width="10"  height="14"  fill="#0a0a20"/>
  <rect x="216" y="22"  width="9"   height="14"  fill="#0a0a20"/>
  <rect class="jrn-ff" style="--d:2.2s;--delay:0s"   x="180" y="60"  width="12" height="16" fill="#fbbf24" opacity=".55" rx="2"/>
  <rect class="jrn-ff" style="--d:2.8s;--delay:.5s"  x="198" y="60"  width="12" height="16" fill="#fbbf24" opacity=".5"  rx="2"/>
  <rect class="jrn-ff" style="--d:3.1s;--delay:.3s"  x="176" y="130" width="14" height="18" fill="#fbbf24" opacity=".45" rx="2"/>
  <rect class="jrn-ff" style="--d:2.4s;--delay:.9s"  x="200" y="130" width="14" height="18" fill="#fbbf24" opacity=".5"  rx="2"/>
  <rect class="jrn-ff" style="--d:2.0s;--delay:.6s"  x="174" y="210" width="14" height="18" fill="#fbbf24" opacity=".4"  rx="2"/>
  <rect class="jrn-ff" style="--d:3.4s;--delay:1.2s" x="202" y="210" width="14" height="18" fill="#fbbf24" opacity=".45" rx="2"/>
  <rect x="20"  y="355" width="130" height="22" fill="#12122e" rx="11"/>
  <rect x="240" y="348" width="130" height="22" fill="#12122e" rx="11"/>
  <rect x="0"   y="480" width="110" height="24" fill="#0d0d22" rx="12"/>
  <rect x="270" y="475" width="120" height="24" fill="#0d0d22" rx="12"/>
  <rect x="0"   y="600" width="390" height="180" fill="#08081a"/>
  <rect x="0"   y="592" width="390" height="14"  fill="#0f0f2a"/>
  <rect x="0"   y="585" width="50"  height="16" fill="#0c0c24" rx="8"/>
  <rect x="45"  y="578" width="65"  height="18" fill="#0a0a1e" rx="9"/>
  <rect x="105" y="583" width="55"  height="16" fill="#0c0c24" rx="8"/>
  <rect x="155" y="576" width="70"  height="20" fill="#0a0a1e" rx="10"/>
  <rect x="220" y="582" width="58"  height="16" fill="#0c0c24" rx="8"/>
  <rect x="272" y="575" width="62"  height="20" fill="#0a0a1e" rx="10"/>
  <rect x="328" y="583" width="62"  height="16" fill="#0c0c24" rx="8"/>
  </svg>`
];

function renderJourneyMap() {
  const progress = getJourneyProgress();
  const currentCh = getCurrentChapter(progress);
  const chIdx = currentCh.id - 1;

  document.getElementById('journeyHeaderChapter').textContent = currentCh.icon + ' CHAPTER ' + currentCh.id;
  document.getElementById('journeyHeaderName').textContent = currentCh.name.toUpperCase();
  document.getElementById('journeyHeaderProgress').textContent = progress + '/100';
  document.getElementById('journeyBg').innerHTML = JOURNEY_BG_SVGS[chIdx];

  const THEMES = [
    { pathDone:'#4ade80', pathLocked:'#166534', grassA:'#4ade80', grassB:'#22c55e', grassC:'#166534', grassTop:'#a7f3d0', dirtA:'#92400e', dirtB:'#78350f',
      decos:[['tree-g','flower-p','tree-d'],['mush-r','leaf','tree-g'],['tree-d','flower-w','mush-r'],['tree-g','tree-d','flower-p'],['mush-r','tree-g','flower-w']] },
    { pathDone:'#a855f7', pathLocked:'#4c1d95', grassA:'#7c3aed', grassB:'#5b21b6', grassC:'#4c1d95', grassTop:'#c4b5fd', dirtA:'#374151', dirtB:'#1f2937',
      decos:[['crystal','bat','crystal'],['bat','mush-p','crystal'],['crystal','bat','mush-p'],['mush-p','crystal','bat'],['crystal','bat','mush-p']] },
    { pathDone:'#f97316', pathLocked:'#9a3412', grassA:'#fb923c', grassB:'#ea580c', grassC:'#9a3412', grassTop:'#fed7aa', dirtA:'#57534e', dirtB:'#44403c',
      decos:[['tower','sword','shield'],['shield','tower','sword'],['sword','shield','tower'],['tower','sword','shield'],['shield','tower','sword']] },
    { pathDone:'#ef4444', pathLocked:'#7f1d1d', grassA:'#f87171', grassB:'#dc2626', grassC:'#7f1d1d', grassTop:'#fca5a5', dirtA:'#78716c', dirtB:'#57534e',
      decos:[['lava','fire','rock'],['fire','skull','lava'],['rock','fire','skull'],['skull','lava','fire'],['lava','skull','fire']] },
    { pathDone:'#eab308', pathLocked:'#92400e', grassA:'#fbbf24', grassB:'#d97706', grassC:'#92400e', grassTop:'#fde68a', dirtA:'#3f3f46', dirtB:'#27272a',
      decos:[['star','lightning','gem'],['gem','star','lightning'],['lightning','gem','star'],['star','lightning','gem'],['gem','star','lightning']] },
  ];

  const DECO_HTML = {
    'tree-g':  `<div class="px-tree"><div class="px-tree-top" style="background:#16a34a;"></div><div class="px-tree-mid" style="background:#22c55e;"></div><div class="px-tree-trunk"></div></div>`,
    'tree-d':  `<div class="px-tree"><div class="px-tree-top" style="background:#14532d;"></div><div class="px-tree-mid" style="background:#166534;"></div><div class="px-tree-trunk" style="background:#5c3008;"></div></div>`,
    'flower-p':`<div class="px-deco-icon">🌸</div>`,
    'flower-w':`<div class="px-deco-icon">🌼</div>`,
    'leaf':    `<div class="px-deco-icon">🌿</div>`,
    'mush-r':  `<div class="px-mush"><div class="px-mush-cap" style="background:#ef4444;border-color:#b91c1c;"></div><div class="px-mush-stem"></div></div>`,
    'mush-p':  `<div class="px-mush"><div class="px-mush-cap" style="background:#a855f7;border-color:#7c3aed;"></div><div class="px-mush-stem"></div></div>`,
    'crystal': `<div class="px-deco-icon">💎</div>`,
    'bat':     `<div class="px-deco-icon">🦇</div>`,
    'tower':   `<div class="px-deco-icon">🏛️</div>`,
    'sword':   `<div class="px-deco-icon">⚔️</div>`,
    'shield':  `<div class="px-deco-icon">🛡️</div>`,
    'lava':    `<div class="px-deco-icon">🌋</div>`,
    'fire':    `<div class="px-deco-icon">🔥</div>`,
    'rock':    `<div class="px-deco-icon">🪨</div>`,
    'skull':   `<div class="px-deco-icon">💀</div>`,
    'star':    `<div class="px-deco-icon">⭐</div>`,
    'lightning':`<div class="px-deco-icon">⚡</div>`,
    'gem':     `<div class="px-deco-icon">💜</div>`,
  };

  const t = THEMES[chIdx];
  const chStart = chIdx * 20;
  const ISLANDS = 5, LVLS_PER = 4;
  const POSITIONS = ['center','right','left','right','left'];

  // Buton rengini chapter'a göre güncelle
  const backBtn = document.querySelector('.px-back-btn');
  if (backBtn) { backBtn.style.color = t.pathDone; backBtn.style.borderColor = t.pathDone; }
  document.getElementById('journeyHeaderChapter').style.color = t.pathDone;
  document.getElementById('journeyHeaderProgress').style.color = t.pathDone;

  function nodeState(num) {
    if (num <= progress) return 'done';
    if (num === progress + 1) return 'active';
    return 'locked';
  }

  function renderNode(num) {
    const state = nodeState(num);
    const level = JOURNEY_LEVELS[num - 1];
    const name = level ? level.name : '';
    if (state === 'done')
      return `<div class="px-node done" style="background:${t.pathDone};border-color:${t.pathLocked};box-shadow:3px 3px 0 ${t.pathLocked},inset 1px 1px 0 rgba(255,255,255,0.28);color:rgba(0,0,0,0.55);" title="${name}" onclick="showJourneyLevelInfo(${num})"><span style="font-size:14px">✓</span></div>`;
    if (state === 'active')
      return `<div class="px-node active" title="${name}" onclick="startJourneyLevel(${num})">${num}</div>`;
    return `<div class="px-node locked" title="Kilitli"><span>🔒</span></div>`;
  }

  function renderIsland(i) {
    const startNum = chStart + i * LVLS_PER + 1;
    const endNum   = startNum + LVLS_PER - 1;
    const pos = POSITIONS[i];
    const allDone   = endNum <= progress;
    const allLocked = startNum > progress + 1;
    const opacity   = allLocked ? (i > 2 ? '0.3' : '0.55') : '1';

    const nodes = Array.from({length: LVLS_PER}, (_, k) => renderNode(startNum + k)).join('');
    const decos = (t.decos[i] || ['leaf','leaf','leaf']).map(d => DECO_HTML[d] || '').join('');
    const stars = allDone ? `<div class="island-stars">⭐⭐⭐</div>` : '';
    const grassBg = allDone ? t.grassA : allLocked ? t.grassC : t.grassB;

    return `
      <div class="island-unit ${pos}" style="opacity:${opacity};${i===0?'margin-top:28px;':''}">
        <div class="island-pixel">
          ${stars}
          <div class="island-nodes">${nodes}</div>
          <div class="px-grass" style="background:${grassBg};border-top-color:${t.grassA};border-left-color:${t.grassB};border-right-color:${t.grassC};">
            <div class="px-grass-top" style="background:${t.grassTop};"></div>
            <div class="px-grass-checker"></div>
          </div>
          <div class="island-decos">${decos}</div>
          <div class="px-dirt-row">
            <div class="px-dirt-seg" style="background:${t.dirtA};"></div>
            <div class="px-dirt-seg" style="background:${t.dirtB};"></div>
            <div class="px-dirt-seg" style="background:${t.dirtA};"></div>
            <div class="px-dirt-seg" style="background:${t.dirtB};"></div>
          </div>
          <div class="px-dirt-bot" style="background:${t.dirtB};"></div>
          <div class="px-shadow"></div>
        </div>
        <div class="node-name">BÖLÜM ${startNum}–${endNum}</div>
      </div>`;
  }

  function renderPath(i, customColor, customOpacity) {
  const nextStart  = chStart + (i + 1) * LVLS_PER + 1;
  const pathActive = !customColor && nextStart <= progress + 2;
  const color      = customColor || (pathActive ? t.pathDone : t.pathLocked);
  const opacity    = customOpacity || (pathActive ? '0.65' : '0.25');
  const dash       = pathActive ? '8 4' : '5 7';
  const goRight    = POSITIONS[i+1] === 'right' || (POSITIONS[i] === 'left' && POSITIONS[i+1] === 'center');
  const dot        = pathActive ? `<rect x="${goRight?56:136}" y="6" width="8" height="8" fill="${color}" opacity="0.5"/>` : '';

  if (goRight) {
    return `<div class="px-path" style="justify-content:flex-end;padding-right:50px;">
      <svg width="200" height="56" viewBox="0 0 200 56" style="overflow:visible;display:block;">
        <path d="M40 10 L60 10 L60 46 L160 46" stroke="${color}" stroke-width="4" fill="none" stroke-dasharray="${dash}" stroke-linecap="square" opacity="${opacity}"/>
        ${dot}
      </svg></div>`;
  } else {
    return `<div class="px-path" style="justify-content:flex-start;padding-left:50px;">
      <svg width="200" height="56" viewBox="0 0 200 56" style="overflow:visible;display:block;">
        <path d="M160 10 L140 10 L140 46 L40 46" stroke="${color}" stroke-width="4" fill="none" stroke-dasharray="${dash}" stroke-linecap="square" opacity="${opacity}"/>
        ${dot}
      </svg></div>`;
  }
}

 // ── HTML build — tüm chapterlar ──
  let html = '';

  for (let ci = 0; ci < JOURNEY_CHAPTERS.length; ci++) {
    const ch   = JOURNEY_CHAPTERS[ci];
    const th   = THEMES[ci];
    const chStart2 = ci * 20;

    html += `
      <div class="ch-divider" style="margin-top:${ci===0?'18px':'0'};">
        <div class="ch-div-line" style="background:repeating-linear-gradient(90deg,${th.pathDone} 0px,${th.pathDone} 6px,transparent 6px,transparent 10px);opacity:0.45;"></div>
        <div class="ch-div-label" style="color:${th.pathDone};">✦ ${ch.name.toUpperCase()} ✦</div>
        <div class="ch-div-line" style="background:repeating-linear-gradient(90deg,${th.pathDone} 0px,${th.pathDone} 6px,transparent 6px,transparent 10px);opacity:0.45;"></div>
      </div>`;

    for (let i = 0; i < ISLANDS; i++) {
      const startNum = chStart2 + i * LVLS_PER + 1;
      const endNum   = startNum + LVLS_PER - 1;
      const pos      = POSITIONS[i];
      const allDone  = endNum <= progress;
      const allLocked = startNum > progress + 1;
      const opacity  = allLocked ? (i > 2 ? '0.3' : '0.55') : '1';

      const nodes = Array.from({length: LVLS_PER}, (_, k) => {
        const num = startNum + k;
        const state = num <= progress ? 'done' : num === progress + 1 ? 'active' : 'locked';
        const level = JOURNEY_LEVELS[num - 1];
        const name  = level ? level.name : '';
        if (state === 'done')
          return `<div class="px-node done" style="background:${th.pathDone};border-color:${th.pathLocked};box-shadow:3px 3px 0 ${th.pathLocked},inset 1px 1px 0 rgba(255,255,255,0.28);color:rgba(0,0,0,0.55);" title="${name}" onclick="showJourneyLevelInfo(${num})"><span style="font-size:14px">✓</span></div>`;
        if (state === 'active')
          return `<div class="px-node active" title="${name}" onclick="startJourneyLevel(${num})">${num}</div>`;
        return `<div class="px-node locked" title="${name}"><span>🔒</span></div>`;
      }).join('');

      const decos   = (th.decos[i] || ['leaf','leaf','leaf']).map(d => DECO_HTML[d] || '').join('');
      const stars   = allDone ? `<div class="island-stars">⭐⭐⭐</div>` : '';
      const grassBg = allDone ? th.grassA : allLocked ? th.grassC : th.grassB;

      html += `
        <div class="island-unit ${pos}" style="opacity:${opacity};${i===0?'margin-top:28px;':''}">
          <div class="island-pixel">
            ${stars}
            <div class="island-nodes">${nodes}</div>
            <div class="px-grass" style="background:${grassBg};border-top-color:${th.grassA};border-left-color:${th.grassB};border-right-color:${th.grassC};">
              <div class="px-grass-top" style="background:${th.grassTop};"></div>
              <div class="px-grass-checker"></div>
            </div>
            <div class="island-decos">${decos}</div>
            <div class="px-dirt-row">
              <div class="px-dirt-seg" style="background:${th.dirtA};"></div>
              <div class="px-dirt-seg" style="background:${th.dirtB};"></div>
              <div class="px-dirt-seg" style="background:${th.dirtA};"></div>
              <div class="px-dirt-seg" style="background:${th.dirtB};"></div>
            </div>
            <div class="px-dirt-bot" style="background:${th.dirtB};"></div>
            <div class="px-shadow"></div>
          </div>
          <div class="node-name">BÖLÜM ${startNum}–${endNum}</div>
        </div>`;

      if (i < ISLANDS - 1) {
        const nextStart2 = chStart2 + (i + 1) * LVLS_PER + 1;
        const pathActive = nextStart2 <= progress + 2;
        const color   = pathActive ? th.pathDone : th.pathLocked;
        const opacity2 = pathActive ? '0.65' : '0.25';
        const dash    = pathActive ? '8 4' : '5 7';
        const goRight = POSITIONS[i+1] === 'right' || (POSITIONS[i] === 'left' && POSITIONS[i+1] === 'center');
        if (goRight) {
          html += `<div class="px-path" style="justify-content:flex-end;padding-right:50px;">
            <svg width="200" height="56" viewBox="0 0 200 56" style="overflow:visible;display:block;">
              <path d="M40 10 L60 10 L60 46 L160 46" stroke="${color}" stroke-width="4" fill="none" stroke-dasharray="${dash}" stroke-linecap="square" opacity="${opacity2}"/>
            </svg></div>`;
        } else {
          html += `<div class="px-path" style="justify-content:flex-start;padding-left:50px;">
            <svg width="200" height="56" viewBox="0 0 200 56" style="overflow:visible;display:block;">
              <path d="M160 10 L140 10 L140 46 L40 46" stroke="${color}" stroke-width="4" fill="none" stroke-dasharray="${dash}" stroke-linecap="square" opacity="${opacity2}"/>
            </svg></div>`;
        }
      }
    }

    if (ci < JOURNEY_CHAPTERS.length - 1) {
      html += `<div style="height:32px;"></div>`;
    }
  }

  document.getElementById('journeyMapContent').innerHTML = html;

  // Aktif node'a scroll
  setTimeout(() => {
    const active = document.querySelector('.px-node.active');
    const mapArea = document.querySelector('.px-map-area');
    if (active && mapArea) {
      const top = active.offsetTop - 200;
      mapArea.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, 200);
}

function showJourneyLevelInfo(num) {
  const level = JOURNEY_LEVELS[num - 1];
  if (level) showToast('✓ ' + level.name + ' · Bölüm ' + num);
}

function startJourneyLevel(num) {
  const level = JOURNEY_LEVELS[num - 1];
  if (!level) return;
  window._activeJourneyLevel = num;
  hideJourneyScreen();
  document.getElementById('swipeDots').style.display = 'none';
  // startGame'i bypass et — unlock/kayıt kontrolü yok
  generatingGame = true;
  showToast('⏳ Bulmaca oluşturuluyor...');
  setTimeout(async () => {
    await _doStartGame(level.mode);
    generatingGame = false;
    // Başlık override
    const titleEl = document.getElementById('gameTitle');
    if (titleEl) titleEl.textContent = level.num + '. ' + level.name;
    const badge = document.getElementById('diffBadge');
    if (badge) badge.textContent = level.chapterIcon + ' ' + level.chapterName.toUpperCase();
  }, 60);
}

// updateJourneyHomeBtn'i sayfa açılışında çalıştır
document.addEventListener('DOMContentLoaded', () => {
  updateJourneyHomeBtn();
});
