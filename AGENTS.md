# Development guidelines

This repository is an open-source example. Clarity is part of the product: code should feel calm, obvious, and pleasant to read.

- Build the smallest correct solution. Every line, abstraction, state value, effect, component, file, and dependency must earn its place.
- Give each function and component one clear responsibility, small explicit inputs, and linear flow. If it must understand nested or partially defined data outside its concern, fix the boundary or data model instead.
- Prefer one source of truth and derive everything else. If the UI needs synchronization, repeated guards, or defensive branches, simplify the architecture first.
- Prefer native platform and framework primitives. Add helpers, wrappers, or dependencies only when they make the whole system simpler.
