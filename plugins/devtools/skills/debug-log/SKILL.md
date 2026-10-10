---
name: debug-log
description: Insert [DEBUG] prefixed log statements for tracing and diagnosing issues during development
allowed-tools: Read, Edit, Glob, Grep
---

# Debug Log Skill

Inserts `[DEBUG]` prefixed log statements into the current codebase to help trace and diagnose issues during a debugging session.

## Log Format by Language

### JavaScript / TypeScript

```js
console.log("[DEBUG] <description>", JSON.stringify(<data>, null, 2));
```

- Always use `JSON.stringify(<data>, null, 2)` so that objects, arrays, and nested structures are fully visible
- For multiple values, use separate `JSON.stringify` calls per argument

### Python

```python
print(f"[DEBUG] <description>: {<data>}")
```

### Java

```java
System.out.println("[DEBUG] <description>: " + <data>);
```

## Rules

- Every log statement MUST start with the `[DEBUG]` prefix
- Include a short description of what is being logged (e.g., variable name, function name, checkpoint label)
- Place logs at points most useful for tracing the issue (function entry, before/after key operations, conditional branches)
- Do not remove or modify existing code logic — only add log statements
- Do not add imports unless required by the log statement
