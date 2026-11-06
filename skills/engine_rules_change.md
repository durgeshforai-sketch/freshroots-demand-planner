# Skill: Changing an engine rule or threshold safely

**Purpose:** change Raghav's rules without silently changing past behaviour or breaking the spec examples.

## Steps
1. Write down the change and who approved it (Raghav for rules, Deepa for kill-metric thresholds).
2. Change the value **only** in `src/config/engine.ts`. No magic numbers in `src/lib/engine/*`.
3. Bump `engineConfig.version` (semver: patch for threshold tweaks, minor for new rules).
4. If the logic changes (not just a number), edit `src/lib/engine/evaluate.ts` and add or adjust a test in `src/lib/engine/engine.test.ts`.
5. `npm test`. The four spec examples (Ex1–Ex4) must still pass. If a change *intentionally* breaks one, update `docs/BUILD_SPEC.md` first and record why in HANDOFF.md.
6. `npm run data:dry-run` before and after. Diff the flag counts and explain every change.
7. Commit on `dev` (`feat(engine): …`), open a PR to `main`, and let CI pass.
8. Each Run stores `configSnapshot`, so old runs stay explainable.

## Guardrails that must not be removed
- EXCEPTION means no automatic quantity.
- A HALTED run saves no recommendations.
- APPROVE is refused on an EXCEPTION.

## Example prompts
- "Raghav wants the perishable max cover at 5 weeks. Make the change safely and show the dry-run diff."
- "Make the festival window 6 weeks instead of 4 and explain which SKUs change flag."
- "Add a rule: pause orders for SKUs marked discontinued. Include tests."
