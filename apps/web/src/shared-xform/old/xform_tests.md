# xform_tests.md

## 1. Spec validation
- Unknown keys rejected; required fields enforced.

## 2. JSON → CSV with variables
- Input: employeesJson
- Spec: specJsonToCsvWithVars
- Vars: { min_age: 30, target_city: "Chicago" }
- Output:
  ```csv
  id,name,city
  103,Marcus Miller,Chicago
  ```

## 3. JSON minimal transform
- Returns array of 4 objects with expected fields.

## 4. Token extract
- Output: raw token in text output; missing token raises error if on_missing=error.

## 5. XPath variable interpolation
- Quotes inside values uses concat() safely.

## 6. Type coercion
- "30" → 30; invalid numeric input throws.

## 7. CSV escaping
- Commas, quotes, newlines; delimiter override to semicolon.

## 8. Expression length caps and timeouts
- Enforced with graceful errors.

## 9. NDJSON streaming path (phase 2)
- Variables in filters runs without OOM.
