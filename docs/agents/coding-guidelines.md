# Agent Coding Guidelines

Core behavioral guidelines to prevent common LLM coding pitfalls.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask before implementing.
- If multiple interpretations exist, present them rather than picking one silently.
- Push back when warranted if a simpler, cleaner approach exists.
- If something is unclear or ambiguous, stop and ask for clarification.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- Build only what was requested (no extra speculative features).
- Avoid unnecessary abstractions or wrapper layers for single-use code.
- Avoid unrequested "configurability" or complex flexibility.
- If a simpler 50-line standard library solution works, do not write a 200-line custom abstraction.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Do not modify, reformat, or "refactor" adjacent code or comments that are orthogonal to the task.
- Match the existing codebase conventions and styling.
- If you discover unrelated dead code or bugs, report them instead of silently modifying them.

## 4. Goal-Driven Execution
**Define success criteria and verify with tests.**
- Establish clear, verifiable success criteria before starting.
- Implement tests or feedback loops to prove correctness.
- Verify changes before concluding the task.
