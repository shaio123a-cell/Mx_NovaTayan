// xform_examples.ts
// Example specs and input for dev/demo

export const employeesJson = `{
  "employees": [
    { "id": 101, "name": "Alice Smith", "city": "New York", "age": 29 },
    { "id": 102, "name": "Bob Jones", "city": "Boston", "age": 31 },
    { "id": 103, "name": "Marcus Miller", "city": "Chicago", "age": 34 },
    { "id": 104, "name": "Sara Lee", "city": "Chicago", "age": 27 }
  ]
}`;

export const specJsonToCsvWithVars = `
version: 1
name: employees_to_csv_with_vars
input:
  type: json
  root: $.employees[]
output:
  type: csv
  options:
    header: true
mappings:
  - name: id
    expr: id
    type: number
  - name: name
    expr: name
  - name: city
    expr: city
filters:
  - expr: age >= {{min_age}}
  - expr: city == {{target_city}}
defaults:
  on_missing: null
parameters:
  - name: min_age
    type: number
    required: true
  - name: target_city
    type: string
    required: true
`;

export const varsExample = { min_age: 30, target_city: "Chicago" };
