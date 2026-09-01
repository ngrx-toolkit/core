---
title: withFeatureFactory()
---

```typescript
// DEPRECATED
import { withFeatureFactory } from '@ngrx-toolkit/core';

// Use this instead
import { withFeature } from '@ngrx/signals';
```

The `withFeatureFactory()` function allows passing properties, methods, or signals from a SignalStore to a feature. It is an advanced feature, primarily targeted for library authors for SignalStore features.

:::warning

## Deprecation

Use `import { withFeature } from '@ngrx/signals'` instead.

[`withFeature`](https://ngrx.io/guide/signals/signal-store/custom-store-features#connecting-a-custom-feature-with-the-store) is the successor of the toolkit's `withFeatureFactory`.

- Available starting in `ngrx/signals` 19.1
- NgRx PR: ["feat(signals): add `withFeature` #4739"](https://github.com/ngrx/platform/pull/4739)
- NgRx [documentation section](https://ngrx.io/guide/signals/signal-store/custom-store-features#connecting-a-custom-feature-with-the-store) on `withFeature`

In the future, `withFeatureFactory` will likely be removed, provided a right migration path is prepared. Watch out for PRs, and see [the PR that deprecates `withFeatureFactory` for the initial plan for handling the removal](https://github.com/ngrx-toolkit/core/pull/167#pullrequestreview-2735443379).
:::
