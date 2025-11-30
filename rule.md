// lib/skillSchema.ts

export const skillCategories = [
"javascript",
"typescript",
"react",
"nextjs",
"state-management",
"server-state",
"performance",
"ui-ux",
"css",
"testing",
"build-infra",
] as const;

export type Category = typeof skillCategories[number];

// 각 category에 해당하는 기본 topic list
export const skillTopics: Record<Category, string[]> = {
javascript: [
"event-loop",
"callstack",
"closure",
"hoisting",
"prototype",
"async",
"promise",
"this-binding",
"scope-chain",
"memory-leak",
],

typescript: [
"interface",
"type-alias",
"generics",
"utility-types",
"mapped-types",
"discriminated-union",
"keyof",
"extends-constraints",
"inference",
"declaration-merging",
],

react: [
"component-lifecycle",
"hooks",
"memoization",
"context",
"error-boundary",
"suspense",
"hydration",
"key-mechanism",
"controlled",
"uncontrolled",
],

nextjs: [
"ssg",
"ssr",
"server-components",
"client-components",
"streaming",
"routing",
"middleware",
"edge-runtime",
"fetch-caching",
"hydration-mismatch",
],

"state-management": [
"store-architecture",
"selector-pattern",
"atomic-state",
"derived-state",
"side-effects",
"immutable-pattern",
"global-vs-local-store",
"performance-issue",
],

"server-state": [
"staleTime",
"cacheTime",
"queryKey",
"hydration",
"optimistic-update",
"infinite-query",
"mutation-flow",
"retry-backoff",
"prefetching",
"initialData",
],

performance: [
"rerender-causes",
"memoization",
"code-splitting",
"lazy-loading",
"throttle",
"debounce",
"concurrent-feature",
"profiling",
"expensive-op",
"web-vitals",
],

"ui-ux": [
"design-tokens",
"accessibility",
"semantic-html",
"feedback-pattern",
"skeleton",
"layout-composition",
"form-patterns",
"input-handling",
"list-virtualization",
],

css: [
"flex",
"grid",
"responsive",
"typography",
"custom-utilities",
"pseudo-element",
"variants",
"animations",
"theming",
"spacing-scale",
],

testing: [
"unit-test",
"integration-test",
"e2e-test",
"mocking",
"snapshot-test",
"test-pyramid",
"msw",
"regression-test",
],

"build-infra": [
"bundler",
"tree-shaking",
"code-splitting",
"build-optimization",
"ci",
"caching",
"static-assets",
"environment-config",
],
};
