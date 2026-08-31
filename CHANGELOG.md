# 22.0.0 (2026-08-31)

### 🚀 Features

- **devtools:** add `Action`.as parameter of `updateState` ([aceb534](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/aceb534))

### 🩹 Fixes

- narrow `NamedMutationMethods` to just fn signature ([#305](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/305))
- **mutations:** allow defining the response type ([#309](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/309), [#310](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/310))
- **with-resource:** preserve hasValue narrowing ([#315](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/315))

### ❤️ Thank You

- Michael Small @michael-small
- Oleh Biblyi @OlegSuncrown
- Rainer Hahnekamp @rainerhahnekamp
- Serhii Siryk @sqrter

## 19.1.0 (2025-02-12)

### 🚀 Features

- add `withImmutableState` ([8203d33](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/8203d33))
- add `withFeatureFactory()` ([aead6f8](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/aead6f8))
- add `withConditional()` ([bef1528](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/bef1528))

### 🩹 Fixes

- improve tree shaking for with-pagination ([ad09e31](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/ad09e31))
- **devtools:** fix existing name error in SSR ([b638698](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/b638698))
- **redux:** don't override methods of innerStore ([#132](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/132))

### ❤️ Thank You

- Murat Sari
- Rainer Hahnekamp @rainerhahnekamp

## 19.0.2 (2025-01-14)

### 🚀 Features

- **redux:** add possibility to extract elements to separate files ([ef7ba1f](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/ef7ba1f))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 19.0.1 (2025-01-09)

### 🚀 Features

- withDevTools disabled in prod, and tree-shaking docs ([4c2baa9](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/4c2baa9))
- withDevTools disabled in prod, and tree-shaking docs - docs utility function update ([ada5f26](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/ada5f26))
- Add support for clear undo redo stack. ([#106](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/106))
- upgrade to NgRx 19 ([f257624](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/f257624))
- **devtools:** add `withMapper` feature ([97c0031](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/97c0031))
- **devtools:** add `withGlitchTracking` feature ([fc972d5](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/fc972d5))
- **signals:** add `withReset()` feature to SignalStore ([90a64b3](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/90a64b3))

### 🩹 Fixes

- **devtools:** do not throw if devtools are unavailable ([8c471a1](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/8c471a1))
- **docs:** fix failed markdown ([f6430c6](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/f6430c6))

### ❤️ Thank You

- Lukáš Šefčík @LukasSefcik
- marcindz88
- Michal Štrajt @mikeshtro
- Rainer Hahnekamp @rainerhahnekamp

# 19.0.0 (2025-01-08)

### 🚀 Features

- withDevTools disabled in prod, and tree-shaking docs ([4c2baa9](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/4c2baa9))
- withDevTools disabled in prod, and tree-shaking docs - docs utility function update ([ada5f26](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/ada5f26))
- Add support for clear undo redo stack. ([#106](https://github.com/rainerhahnekamp/ngrx-toolkit/pull/106))
- upgrade to NgRx 19 ([f257624](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/f257624))
- **devtools:** add `withMapper` feature ([97c0031](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/97c0031))
- **signals:** add `withReset()` feature to SignalStore ([90a64b3](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/90a64b3))

### ❤️ Thank You

- Lukáš Šefčík @LukasSefcik
- marcindz88
- Michal Štrajt @mikeshtro
- Rainer Hahnekamp @rainerhahnekamp

## 18.1.0 (2024-10-15)

### 🚀 Features

- upgrade to NgRx 18.1 ([30073b9](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/30073b9))

### ❤️ Thank You

- Rainer Hahnekamp

## 18.0.3 (2024-08-18)

### 🚀 Features

- update to NgRx Signals 18 Release ([3d61dd2](https://github.com/angular-architects/ngrx-toolkit/commit/3d61dd2))
- add undo-redo skip and keys options, docs and unit tests ([e9d9634](https://github.com/angular-architects/ngrx-toolkit/commit/e9d9634))
- add secondary entry point for redux connector ([48f9d95](https://github.com/angular-architects/ngrx-toolkit/commit/48f9d95))

### 🩹 Fixes

- switch to yarn because of failing ci ([bd8cb25](https://github.com/angular-architects/ngrx-toolkit/commit/bd8cb25))

### ❤️ Thank You

- marcindz88
- Rainer Hahnekamp @rainerhahnekamp

# 18.0.0 (2024-07-30)

### 🚀 Features

- update to NgRx Signals 18 Release ([3d61dd2](https://github.com/angular-architects/ngrx-toolkit/commit/3d61dd2))

### 🩹 Fixes

- switch to yarn because of failing ci ([bd8cb25](https://github.com/angular-architects/ngrx-toolkit/commit/bd8cb25))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 18.0.0-rc.2.0 (2024-07-10)

### 🚀 Features

- update to ngrx 18 and refactorings ([80ccc52](https://github.com/angular-architects/ngrx-toolkit/commit/80ccc52))
- **pagination:** Add pagination sample using mat-paginator ([d583ebe](https://github.com/angular-architects/ngrx-toolkit/commit/d583ebe))

### 🩹 Fixes

- close unterminated code block in `libs/ngrx-toolkit/README.md` ([3e8e17b](https://github.com/angular-architects/ngrx-toolkit/commit/3e8e17b))
- **undo-redo:** prevent duplicated entries on undo stack ([e360ee6](https://github.com/angular-architects/ngrx-toolkit/commit/e360ee6))
- **undo-redo:** prevent duplicated entries on undo stack ([b4f68af](https://github.com/angular-architects/ngrx-toolkit/commit/b4f68af))

### ❤️ Thank You

- Manfred Steyer
- michael-small @michael-small
- Murat Sari
- Rainer Hahnekamp @rainerhahnekamp

## 0.4.0 (2024-06-07)

### 🚀 Features

- Add local pagination feature ([#56](https://github.com/angular-architects/ngrx-toolkit/pull/56))

### ❤️ Thank You

- Murat Sari

## 0.3.1 (2024-05-27)

### 🩹 Fixes

- lazy load routes to get under the build budget ([729c84d](https://github.com/angular-architects/ngrx-toolkit/commit/729c84d))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 0.3.0 (2024-04-20)

### 🚀 Features

- **devtools:** rename `patchState` to `updateState` ([4343720](https://github.com/angular-architects/ngrx-toolkit/commit/4343720))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 0.2.0 (2024-04-20)

### 🚀 Features

- add MIT licence ([1c5ef89](https://github.com/angular-architects/ngrx-toolkit/commit/1c5ef89))

### 🩹 Fixes

- nx release with correct publish directory ([9c0f94f](https://github.com/angular-architects/ngrx-toolkit/commit/9c0f94f))
- **redux:** multiple effects can subscribe to the same action ([12d0077](https://github.com/angular-architects/ngrx-toolkit/commit/12d0077))
- **redux:** remove parameter from `noPayload` action functions ([0e83882](https://github.com/angular-architects/ngrx-toolkit/commit/0e83882))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 0.1.1 (2024-04-20)

### 🩹 Fixes

- nx release with correct publish directory ([9c0f94f](https://github.com/angular-architects/ngrx-toolkit/commit/9c0f94f))
- **redux:** multiple effects can subscribe to the same action ([12d0077](https://github.com/angular-architects/ngrx-toolkit/commit/12d0077))
- **redux:** remove parameter from `noPayload` action functions ([0e83882](https://github.com/angular-architects/ngrx-toolkit/commit/0e83882))

### ❤️ Thank You

- Rainer Hahnekamp @rainerhahnekamp

## 0.1.0 (2024-03-02)

### 🚀 Features

- prototype of with-redux ([22157c9](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/22157c9))
- devtools integration, demo app ([4b219b4](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/4b219b4))
- add dataservice feature ([c6334de](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/c6334de))
- add storage sync ([ef46f75](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/ef46f75))
- update to nx 18 ([111a389](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/111a389))
- **redux:** add private/public feature ([284da58](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/284da58))
- **redux:** type-safe mvp ([aee6def](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/aee6def))
- **redux:** introduce `withRedux` extension ([c5fa930](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/c5fa930))

### 🩹 Fixes

- linting ([3528c2e](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/3528c2e))
- **devtools:** ssr mode ([0fa5e67](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/0fa5e67))
- **redux:** fix `never` type in reducer ([164585b](https://github.com/rainerhahnekamp/ngrx-toolkit/commit/164585b))

### ❤️ Thank You

- Basti Hoffmann @bohoffi
- Anders Finserås Graneng @andersfgraneng
- Derrick Brown @ricochetbrown
- Manfred Steyer @manfredsteyer
- mikezks @mikezks
- Rainer Hahnekamp @rainerhahnekamp
