# Sales Register — modular structure

The original `SalesRegister.tsx` has been split into focused files:

- `SalesRegister.tsx` — page state, API calls, save/load logic, and page layout.
- `Counter.tsx` — Fibra/Luz/Gas checkbox UI.
- `StatusPill.tsx` — reusable status badge.
- `ProgressImage.ts` — downloadable progress-image generation.
- `types.ts` — shared TypeScript types.
- `constants.ts` — plans and custom-target defaults/minimums.
- `utils.ts` — month helpers, item normalization, counts, sorting, and sequential checkbox selection.

## Checkbox behavior

Selecting box `4` now automatically selects boxes `1`, `2`, `3`, and `4`.

Saved boxes remain locked. If, for example, `1` and `2` are already saved and you click new box `4`, the UI adds `3` and `4` while leaving the saved boxes untouched.

If a saved box is rejected, it is also left untouched/locked; the sequential selection logic will not overwrite it.
