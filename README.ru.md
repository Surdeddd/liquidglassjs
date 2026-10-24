# LiquidGlassJS

English: [README.md](./README.md)

Liquid Glass для всего веба — один движок, любой браузер, любой фреймворк.

[![CI](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml/badge.svg)](https://github.com/Surdeddd/liquidglassjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@surdeddd/liquidglass)](https://www.npmjs.com/package/@surdeddd/liquidglass)
[![size](https://img.shields.io/bundlephobia/minzip/@surdeddd/liquidglass)](https://bundlephobia.com/package/@surdeddd/liquidglass)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Surdeddd/liquidglassjs/blob/main/LICENSE)

Настоящая рефракция поверх живого DOM — не скриншот и не только Chromium. «Живая» spring-физика,
слияние метаболов в стиле iOS 26, адаптивный контраст и доступность из коробки.

**[Живое демо и playground →](https://liquidglassjs.vercel.app)** · [API reference](https://liquidglassjs.vercel.app/api/) · [npm](https://www.npmjs.com/package/@surdeddd/liquidglass)

[![LiquidGlassJS — real refraction over live DOM](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/hero.webp)](https://liquidglassjs.vercel.app)

## Зачем ещё одна библиотека liquid glass?

Каждая существующая реализация выбрала один способ рендеринга и застряла в нём. LiquidGlassJS
проверяет, что умеет браузер, и отправляет каждую поверхность на лучший из доступных бэкендов — под
единым API:

```text
@surdeddd/liquidglass
├─ physics        springs: press squash, release wobble, hover magnetism
├─ material       ior, frost, bevel, dispersion, specular, tint + presets
├─ a11y           backdrop tone sampling, reduced motion / transparency
├─ dom-sync       resize / intersection / scroll tracking
└─ backends
   ├─ css-svg         backdrop-filter + displacement maps   Chromium · live DOM
   ├─ svg-content     counter-positioned live copy          Safari + Firefox · live DOM
   ├─ webgl-scene     full GPU optics over owned scenes     explicit
   ├─ webgl-overlay   one shared canvas + page snapshot     metaball merging
   └─ css-fallback    graceful blur + tint                  everywhere
```

## Сравнение с аналогами

| | LiquidGlassJS | liquid-glass-react | liquidGL | samasante | liquid-dom |
| --- | --- | --- | --- | --- | --- |
| Рефракция живого DOM в Chromium | ✅ | ✅ | ❌ снапшот | ✅ | 🚧 за флагом |
| Рефракция живого DOM в Safari/Firefox | ✅ | ❌ плоский blur | ❌ снапшот | ✅ ручной режим | ❌ |
| Автоматический выбор уровня по возможностям браузера | ✅ | ❌ | ❌ | ❌ | ❌ |
| Система физики (press/wobble/hover) | ✅ | частично | ❌ | частично | ❌ |
| Слияние метаболов поверх вашей страницы | ✅ | ❌ | ❌ | ❌ | ❌ |
| Адаптивный контраст (авто-tint + хук тона) | ✅ | ❌ ручной флаг | ❌ | ❌ | ❌ |
| prefers-reduced-motion / transparency | ✅ | ❌ | ❌ | ❌ | ❌ |
| Фреймворки | vanilla · element · react 18+19 · vue 3 · svelte | только react 19 | vanilla | react | react 19 |
| Зависимости ядра | 0 | — | 0 | — | — |

Возможности конкурентов — по состоянию на июль 2026; методика и источники — в
[docs/research/competitive-landscape.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/research/competitive-landscape.md).
У движка нет runtime-зависимостей; опциональный уровень со снапшотом включает вендорную копию
`html-to-image` в лениво подгружаемый чанк — авторство указано в `THIRD-PARTY-NOTICES.md`.

## Требования

| | Поддерживается |
| --- | --- |
| React | `>=18 <20` |
| Vue | `^3.4` |
| Svelte | `4` или `5` |
| Node (только для тулчейна) | `>=20.19` |
| Chromium | 76+ для blur-fallback; уровню `css-svg` дополнительно нужен `backdrop-filter: url()`, GL-уровням — WebGL2 |
| Safari | любая версия, где `CSS.supports('filter', 'url(#lg)')` возвращает true — уровень content определяется по фиче, а не по версии |
| Firefox | тот же тест на фичу; `backdrop-filter: url()` там не реализован, поэтому Firefox никогда не выбирает `css-svg` |

Всё, что не прошло эти проверки, попадает на `css-fallback` — это blur и tint, но никогда не
сломанная поверхность. Подробности по движкам и матрица fidelity —
в [docs/browser-support.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md).

## Как это выглядит

| [Spring-физика](https://liquidglassjs.vercel.app/#physics) | [Слияние метаболов + tab bar](https://liquidglassjs.vercel.app/#metaballs) |
| --- | --- |
| ![Press squash, wobbly release, magnetic hover](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/physics.webp) | ![Lenses melting together over the live page](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/metaballs.webp) |

| [iOS showcase](https://liquidglassjs.vercel.app/#ios) | [Playground с экспортом конфига](https://liquidglassjs.vercel.app/#playground) |
| --- | --- |
| ![Lock screen, control center and tab bar rebuilt from library primitives](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/ios.webp) | ![Material sliders that export an attach() config](https://raw.githubusercontent.com/Surdeddd/liquidglassjs/main/docs/media/readme/playground.webp) |

## Один пакет

| Entry | Что получаете |
| --- | --- |
| [`@surdeddd/liquidglass`](https://www.npmjs.com/package/@surdeddd/liquidglass) | Фреймворк-независимый движок — `attach()`, ноль зависимостей |
| `@surdeddd/liquidglass/element` | Web-компонент `<liquid-glass>`, работает в любом фреймворке |
| `@surdeddd/liquidglass/react` | Компонент и хуки для React 18 и 19 |
| `@surdeddd/liquidglass/vue` | Компонент для Vue 3 + директива `v-liquid-glass` |
| `@surdeddd/liquidglass/svelte` | Svelte action |

React, Vue и Svelte — опциональные peer-зависимости: ставьте только тот фреймворк, которым уже
пользуетесь.

## Быстрый старт

```sh
npm i @surdeddd/liquidglass
```

Без сборки — один script-тег с CDN:

CDN-сборка включает web-компонент и регистрирует `<liquid-glass>` при загрузке, так что script-тега
достаточно для всей настройки. Версию можно убрать, чтобы всегда получать последнюю — на свой
страх и риск.

```html
<liquid-glass preset="frosted">Hello</liquid-glass>
<div data-liquid-glass-auto='{"preset":"clear"}'>glass</div>

<script src="https://unpkg.com/@surdeddd/liquidglass@0.10.0/dist/liquidglass.global.js"></script>
<script>
  LiquidGlass.autoAttach()
</script>
```

```ts
import { attach } from '@surdeddd/liquidglass'

const panel = document.querySelector<HTMLElement>('.panel')
if (panel) {
  const glass = attach(panel, {
    preset: 'frosted',
    ior: 1.5,
    dispersion: 0.3,
    motionLight: true,
    physics: { wobble: 0.8 }
  })

  glass.on('tonechange', tone => console.log('backdrop is', tone))
  glass.set({ preset: 'clear' })
  glass.destroy()
}
```

```html
<script type="module">
  import { define } from '@surdeddd/liquidglass/element'
  define()
</script>

<liquid-glass preset="frosted" merge="dock">Hello</liquid-glass>
```

```tsx
import { LiquidGlass } from '@surdeddd/liquidglass/react'

<LiquidGlass as="nav" preset="clear" dispersion={0.3}>…</LiquidGlass>
```

```vue
<script setup>
import { LiquidGlass, vLiquidGlass } from '@surdeddd/liquidglass/vue'
</script>

<template>
  <LiquidGlass preset="frosted" :options="{ dispersion: 0.3 }">…</LiquidGlass>
  <div v-liquid-glass="{ preset: 'clear' }">…</div>
</template>
```

```svelte
<script>
  import { liquidGlass, glass } from '@surdeddd/liquidglass/svelte'
</script>

<div use:liquidGlass={{ preset: 'frosted' }}>…</div>

<!-- svelte 5 attachment -->
<div {@attach glass({ preset: 'frosted' })}>…</div>
```

Директива Vue регистрируется локально — достаточно импортировать `vLiquidGlass` в `<script setup>`;
если нужна глобальная регистрация, используйте `app.directive('liquid-glass', vLiquidGlass)`.

У каждого entry есть своё руководство: как опции ложатся на идиомы конкретного фреймворка, как
выйти обратно к handle движка, серверный рендеринг и очистка:
[React](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/react.md) ·
[Vue](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/vue.md) ·
[Svelte](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/svelte.md) ·
[web-компонент](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/web-component.md).

В Safari и Firefox движок преломляет выбранный элемент, а не всю страницу. Он берёт ближайшего
предка, у которого есть собственный фон; если нужен конкретный элемент, передайте `backdrop` — это
ещё и дешевле, потому что именно этот элемент клонируется в слой рефракции.

```ts
attach(panel, { backdrop: '.hero-art' })
```

## Опции

Все опции необязательны и меняются во время работы через `set()`. Числовые значения ограничиваются
(clamp) указанным диапазоном; всё нечисловое или бесконечное заменяется значением по умолчанию. Там,
где preset меняет значение, колонка Default выглядит как `clear / frosted / tinted` — `clear`
применяется, если preset не передан.

| Option | Type | Default | Range | Notes |
| --- | --- | --- | --- | --- |
| `preset` | `'clear' \| 'frosted' \| 'tinted'` | `'clear'` | — | Отправная точка для всех материальных значений ниже |
| `blur` | number | 1.2 / 1.5 / 8 | 0–100 | Размытие фона в px — одинаковой силы на всех уровнях, включая WebGL |
| `saturation` | number | 1 / 5.5 / 1 | 0–8 | Множитель насыщенности фона; `frosted` нужен запас, чтобы сохранить цвет сквозь frost |
| `brightness` | number | 1.121 / 0.936 / 1 | 0–3 | Множитель яркости фона |
| `tint` | string | `#ffffff`, `#7c5cff` для `tinted` | hex или `rgb()` | Задайте явно, чтобы отключить адаптивный tint |
| `tintOpacity` | number | 0.0765 / 0.86 / 0.96 | 0–1 | Альфа tint |
| `refraction` | number | 0.5 | 0–1 | Сила изгиба у края; 0.5 — значение, измеренное на рендерере Apple |
| `ior` | number | 1.5 | 1–2.5 | Показатель преломления; при 1 ничего не искажается |
| `magnify` | number | 0 | 0–0.1 | Увеличение всего тела — у стекла Apple его нет |
| `thickness` | number \| `'auto'` | `'auto'` | 0–100 | Высота купола для `lighting: true`; на изгиб больше не влияет |
| `bevelWidth` | number \| `'auto'` | `'auto'` | 0–200 | Ширина полосы края; `auto` — 20 px, сужается до 0.7 половины стороны на контролах меньше 60 px |
| `bevelDepth` | number | 0.6 | 0–1 | Насколько близко к краю удерживается изгиб; чем выше, тем плотнее |
| `dispersion` | number | 0 | 0–1 | Хроматическое расщепление у края — только уровни Chromium и WebGL |
| `specular` | number | 0.8 / 0.8 / 0.1 | 0–1 | Сила однопиксельного блика на краю вдоль оси света; 0 убирает его |
| `shadow` | number | 0 / 0.35 / 0.35 | 0–1 | Отбрасываемая тень под стеклом — мягкая ambient-тень по размеру элемента плюс контактная линия; 0 убирает её. Рисуется на всех уровнях |
| `frost` | number | 0 / 0.09 / 0 | 0–1 | Доля света, рассеянного внутри стекла |
| `radius` | number \| `'auto'` | `'auto'` | ≥ 0 | `auto` берёт border-radius элемента |
| `shape` | `'rounded' \| 'squircle'` | `'rounded'` | — | Squircle ещё и обрезает хост |
| `backend` | `BackendId \| 'auto'` | `'auto'` | — | Учитывается, только если уровень поддерживается |
| `backdrop` | `Element \| string \| null` | `null` | — | Источник рефракции для `svg-content` |
| `sceneImage` | string \| null | `null` | — | Текстура для `webgl-scene` |
| `physics` | boolean \| `{ press, hover, wobble }` | `true` — `press` и `hover` включены, `wobble` 0.6 | `wobble` 0–1 | Полностью отключается при reduced motion; `hover` сам выключается на грубых (coarse) указателях, если не передать его явно |
| `merge` | string \| null | `null` | — | Имя группы метаболов; нужен `webgl-overlay`, в группе не больше 8 линз |
| `mergeStrength` | number | 30 | px, без clamp | Расстояние, на котором члены группы сливаются; `<liquid-glass-group spacing>` выставляет 40 |
| `adaptive` | boolean | `true` | — | Сэмплирование тона фона; `frosted` следует заявленному на странице `color-scheme` и темнеет до «дыма» над тёмным окружением |
| `motionLight` | boolean | `false` | — | Управлять бликом фаски по ориентации устройства |
| `quality` | `{ mapSide: number, caPasses: 1 \| 3, maxDpr: number }` | уровень устройства | — | Переопределение профиля качества для отдельной поверхности; накладывается поверх `configure()` |

Группа `merge` ограничена 8 линзами — это размер массива фигур в шейдере. Девятый и последующие
члены группы целиком выпадают из overlay-прохода: blur, tint и тень у них остаются, а рефракции и
слияния нет, и ничего не логируется. Длинный dock разбейте на вторую группу `merge`.

## Runtime и события

```ts
const glass = attach(el, { preset: 'frosted' })

glass.on('backendchange', id => console.log('now rendering with', id))
glass.on('tonechange', tone => root.classList.toggle('on-light', tone === 'light'))
glass.on('press', point => console.log('pressed at', point.x, point.y))
glass.on('release', () => {})
glass.on('degrade', id => console.log('fps watchdog dropped to', id))

glass.options.preset
```

Каждый payload типизирован по событию: `backendchange` и `degrade` отдают `BackendId`, `tonechange` —
`'light' | 'dark' | null`, `press` — точку относительно левого верхнего угла самого элемента, а не
viewport, `release` — `null`. `handle.options` показывает итоговую (resolved) конфигурацию, а каждая
подписка возвращает собственную функцию отписки.

Web-компонент дублирует те же события в DOM как composed CustomEvent'ы `liquid-glass:*`, так что
слушать их можно и на странице без handle:

```js
document.addEventListener('liquid-glass:tonechange', event => console.log(event.detail))
```

**Одно стекло на элемент.** `attach()` на элементе, у которого оно уже есть, возвращает тот же
handle и применяет новые опции — это attach-or-update, а не вторая поверхность. `destroy()` и
`detach()` убирают стекло для всех, поэтому два независимых владельца одного узла делят общее время
жизни; если нужны раздельные — дайте им разные элементы. Двойной вызов `destroy()` безопасен, а
устаревший handle не снесёт поверхность, прикреплённую уже после него.

Помимо handle:

| API | Что делает |
| --- | --- |
| `autoAttach(root?)` | Прикрепляет стекло ко всем элементам `[data-liquid-glass-auto]` и продолжает следить за новыми. Возвращает функцию остановки; без DOM ничего не делает |
| `configure({ mapSide, caPasses, maxDpr, snapshotThrottleMs, overlayZIndex })` | Переопределяет профиль качества, выбранный по уровню устройства |
| `resetQuality()` | Сбрасывает все переопределения, включая `caPasses: 1`, который записывает fps watchdog |
| `deviceTier()` / `getQuality()` | Показывает, что движок решил для этого устройства |
| `probeCapabilities()` | Снимок возможностей, на котором строится выбор бэкенда |
| `mountScrollEdge(el, { position = 'top', size = 96, strength = 12 })` | Прогрессивный blur-край для плавающих баров; возвращает handle, у которого `destroy()` нужно вызвать самостоятельно |
| `morphGlass(from, to, { stiffness = 320, damping = 26 })` | Передаёт геометрию одного контрола другому на spring; возвращает promise, который резолвится, когда spring успокоится |
| `getInstance(el)` / `detach(el)` | Достать или снять поверхность, handle которой вы не сохранили |
| `VERSION` | Строка версии, с которой собрана эта сборка |

Итоговое состояние выставляется и на самом элементе, так что его видно в devtools:
`data-liquid-glass` (preset), `data-liquid-glass-backend`, `data-liquid-glass-tone`,
`data-liquid-glass-pressed`, `data-liquid-glass-degraded`. Элемент в процессе морфинга дополнительно
несёт `data-liquid-glass-morphing` на всё время работы spring.

### Что забирает себе `attach()`

Движок рисует через inline-стили вашего элемента, поэтому часть свойств на время жизни стекла
перестаёт вам принадлежать. Всё, что вы задали inline, запоминается при монтировании и
восстанавливается через `destroy()`, но пока поверхность прикреплена, значение движка имеет
приоритет. `backdrop-filter` ниже означает и версию с префиксом, и версию без префикса, а `border-radius`
перезаписывается, только когда `radius` — число или squircle его требует; при `radius: 'auto'`
движок, наоборот, читает ваш.

| Tier | Inline-свойства, которыми он владеет |
| --- | --- |
| `css-svg` | `backdrop-filter`, `background`, `border-radius`, `box-shadow`, `clip-path` |
| `svg-content` | то же, плюс `isolation` и `position` |
| `webgl-overlay` | `backdrop-filter`, `background`, `border-radius`, `box-shadow`, `position`, `z-index` |
| `webgl-scene` | `background`, `border-radius`, `isolation`, `position` — единственный уровень без отбрасываемой тени |
| `css-fallback` | `background`, `backdrop-filter`, `border-radius`, `box-shadow`, `clip-path` |

Из этого следуют два момента, которые стоит учесть заранее. Ваши собственные `background` и
`box-shadow` заменяются — теперь поверхность это стекло, а `shadow: 0` — способ попросить убрать
отбрасываемую тень. И хост с вычисленным `position: static` становится `relative`, что меняет
содержащий блок для его абсолютно позиционированных потомков; блик фаски и press-свечение делают это на
любом уровне, так как оба монтируют слой внутрь хоста. Разделение, которое работает: layout
(размер, margin, padding и `border-radius`, который читает `radius: 'auto'`) задавайте на хосте, а
отрисовку оставьте движку.

## Главное

- **Настоящая оптика линзы** — выпуклый squircle-купол, преломляющий по закону Снелла (`ior`, по умолчанию 1.5): оптически плоская середина с лёгким увеличением всего тела (`magnify`) и весь изгиб, сосредоточенный в полосе у края, которая следует вашему радиусу скругления — ровно как в iOS 26.
- **Хроматическая аберрация на краю** — `dispersion` расщепляет R/G/B вдоль края на путях Chromium и WebGL ([матрица fidelity](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md#fidelity-matrix)).
- **Живая specular-фаска** — двухтоновый блик на краю, который следует за указателем (или за наклоном устройства при `motionLight: true`), а не нарисованный градиент.
- **Многоуровневый рендеринг** — проверка возможностей выбирает лучший бэкенд для каждого браузера; fidelity растёт по мере появления новых API в браузерах, а ваш код не меняется.
- **Метаболы** — оберните линзы в `<liquid-glass-group spacing="48">` (или используйте общий `merge`), и они сольются друг с другом через SDF-шейдер smooth-min, как в GlassEffectContainer. До 8 линз в группе.
- **Scroll edge** — `mountScrollEdge(document.body, { position: 'top' })` плавно растворяет контент под плавающими барами, как scroll edge effect в iOS.
- **Морфинг** — `morphGlass(from, to)` передаёт геометрию одного контрола другому на spring, аналог перехода glassEffectID.
- **Живая физика** — система масса–пружина–демпфер даёт желейный squash, «дрожащий» release и магнитный hover на любом бэкенде; в простое засыпает.
- **Адаптивный контраст** — стекло сэмплирует яркость фона и подстраивается так же, как материал Apple: тёмный «дым» над тёмным контентом, белый frost над светлым. Выставляет `data-liquid-glass-tone` и готовый цвет `--lg-on-glass` для вашего текста.
- **Доступность по умолчанию** — reduced motion и reduced transparency учитываются на лету; каждый внедряемый слой помечен aria-hidden. Reduced transparency наблюдаем со страницы только в Chromium 118+, так что непрозрачный fallback — бонус, а не способ обеспечить контраст.
- **Быстро — и мы это честно измеряем** — десять линз при непрерывном скролле стартуют в середине 30-х fps с dispersion на полном качестве и устаканиваются около 100, когда fps watchdog убирает лишние проходы; везде render-on-demand, и ничто не держит frame loop живым, пока страница неподвижна. Цифры из входящего в репозиторий bench, а не на глаз.

## Решение проблем

**В Safari или Firefox плоский blur.** Эти движки преломляют клонированный источник, а не живой
фон. Движок откатывается на ближайшего предка с фоном — если все предки прозрачные, клонировать
нечего. Передайте `backdrop` явно.

**`merge` ничего не делает.** Слияние метаболов существует только на `webgl-overlay`. При
`backend: 'auto'` движок теперь переключается на него, если задана группа `merge` и доступен WebGL2;
если WebGL2 нет, группа отбрасывается, и движок логирует это один раз. `<liquid-glass-group>`
выставляет бэкенд для своих детей.

**Строгий CSP блокирует worker.** Карты линз генерируются в worker'е, создаваемом из `Blob` URL,
поэтому разрешите `worker-src blob:`. Без этого библиотека молча генерирует карты в основном
потоке — тот же результат, но больше работы в main thread.

**Next.js / Nuxt / SvelteKit.** Каждый entry без проблем импортируется на сервере, а `attach()` —
клиентский вызов; запускайте его из effect. `autoAttach()` безопасно вызывать где угодно — без DOM он
возвращает inert-функцию остановки.

**React Server Components.** `@surdeddd/liquidglass/react` поставляется без баннера `"use client"`,
поэтому импорт из серверного компонента падает. Поставьте `'use client'` в начало своего файла — того,
что импортирует `LiquidGlass`, `useLiquidGlass` или `useLiquidGlassHandle`, — либо подключайте через
`dynamic(() => import('./glass'), { ssr: false })`. `pnpm ssr` лишь доказывает, что entry
импортируются в голом Node; границу RSC он не проверяет.

**Сливаются только некоторые линзы.** В группе `merge` помещается 8. Девятый и последующие члены
выпадают из overlay-прохода — blur, tint и тень остаются, рефракция и слияние нет, и ничего не
логируется. Остальное вынесите во вторую группу.

**Изображения пропадают внутри группы метаболов.** Уровень `webgl-overlay` растеризует страницу в
текстуру, поэтому cross-origin изображения без CORS-заголовков и webfont'ы, которые нельзя
встроить, в снапшот не попадают.

**Reduced transparency или Windows High Contrast.** Поверхность переключается на непрозрачный
материал (рефракция и dispersion выключены, tint усилен). Это сделано намеренно и подхватывает
настройку ОС на лету.

**Текст поверх стекла не читается.** `adaptive` сэмплирует фон и подбирает под него материал по
умолчанию — «дым» над тёмным, frost над светлым, — но не может определить яркость над растровым
изображением в качестве фона. Используйте `color: var(--lg-on-glass)`, событие `tonechange` или
атрибут `data-liquid-glass-tone`, чтобы стилизовать текст самостоятельно, либо задайте `tint` явно.

Другие симптомы и более глубокий разбор — в
[docs/troubleshooting.md](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/troubleshooting.md)
— порядок наложения под группой merge, две директивы CSP, гидрация и как вернуть тир после
понижения watchdog'ом.

## Стабильность

Pre-1.0. Минорный релиз может содержать breaking change, и в release notes об этом сказано.

Публичный API — это то, что экспортируют `@surdeddd/liquidglass` и его entry `/element`, `/react`,
`/vue` и `/svelte`. Внутри него:

| | |
| --- | --- |
| Стабильно в рамках minor | `attach`, `detach`, `getInstance`, `autoAttach`, форма `LiquidGlassHandle`, пять имён событий и их payload'ы, имена опций из таблицы выше, атрибуты `data-liquid-glass*`, набор атрибутов `<liquid-glass>` |
| Может меняться в minor | Результат рендеринга — оптика, значения по умолчанию, во что разворачивается preset. Какой бэкенд выбирает `auto` на конкретном движке. Диапазоны clamp. Всё, что улучшает новый API браузера |
| Вообще не публично | Всё, что экспортируется для демо и тестов — `GlRenderer`, `sdfSuperellipse`, `setLuminanceGrid`, `MAX_SHAPES`, объекты `backends/*`. Могут меняться и в patch |

Пять пакетов воркспейса (`-core`, `-element`, `-react`, `-vue`, `-svelte`) — приватные входы сборки,
версионируются синхронно с публикуемым пакетом; устанавливается только `@surdeddd/liquidglass`.
История релизов — [packages/liquidglass/CHANGELOG.md](https://github.com/Surdeddd/liquidglassjs/blob/main/packages/liquidglass/CHANGELOG.md).

## Разработка

```sh
pnpm install
pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm coverage && pnpm ssr && pnpm size
pnpm e2e
```

Это тот же список, что гоняет CI, в том же порядке. `pnpm build` идёт первым, потому что адаптеры
фреймворков получают движок через его собранный вывод, поэтому их тесты работают с
`packages/core/dist`, а не с `src`.

Для fps-бенчмарка демо должно быть поднято на порту 4173 — именно этот адрес открывает `pnpm bench`;
просто `vite` отдаёт 5173, и bench там ничего не найдёт:

```sh
pnpm --filter demo exec vite --port 4173 --strictPort   # one shell
pnpm bench                                              # another; exits non-zero below 55 fps
```

`BENCH_URL` переопределяет адрес: `BENCH_URL=http://localhost:5173/bench.html pnpm bench`, если демо
уже запущено на порту vite по умолчанию. `pnpm bench` работает headless; цифры ниже получены через
`node scripts/fps-bench.mjs --headed`.

Bench выдаёт два числа, потому что одно вводило бы в заблуждение. Десять линз при скролле в headed
Chromium на машине серии M стартуют в **середине 30-х** — каждая линза делает три прохода
displacement ради хроматической дисперсии — и устаканиваются **около 100 fps**, когда fps watchdog
решает, что страница не тянет их, и сбрасывает до одного. Та же страница без стекла выдаёт ~118 fps,
так что цена — это линзы, и большую её часть съедает dispersion.

В headless результат заметно ниже по обоим числам: он рендерит через SwiftShader — программный
растеризатор, так что это особенность software-рендеринга, а не регрессия.

Лендинг и playground лежат в `apps/docs`, тестовый стенд — в `apps/demo`, исследовательские заметки —
в [docs/research](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/research/competitive-landscape.md).

## Документация

[docs/](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/README.md) — индекс: для чего
каждый документ и в каком порядке их читать.

| | |
| --- | --- |
| [React](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/react.md) · [Vue](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/vue.md) · [Svelte](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/svelte.md) · [Web component](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/web-component.md) | По руководству на каждый entry: опции как идиомы, выход к handle, SSR, очистка, составной пример |
| [Recipes](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/recipes.md) | Готовые компоненты: nav bar, тактильная карточка, «тающий» tab bar, morph, линза поверх собственной графики |
| [Accessibility](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/accessibility.md) | Что делает движок, что остаётся за вами и как проверить и то и другое |
| [Troubleshooting](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/troubleshooting.md) | От симптома: плоские линзы, группы merge, порядок наложения, CSP, гидрация, застрявший watchdog |
| [Performance](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/performance.md) | Сколько стоит каждая поверхность, какая ручка на что влияет, как ведёт себя fps watchdog |
| [Browser support](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/browser-support.md) | Поведение по движкам, матрица fidelity по бэкендам, минимальные версии |
| [Architecture](https://github.com/Surdeddd/liquidglassjs/blob/main/docs/architecture.md) | Карта модулей, направление зависимостей, как выбираются уровни |
| [API reference](https://liquidglassjs.vercel.app/api/) | Генерируется из публичных точек входа |

## License

MIT
