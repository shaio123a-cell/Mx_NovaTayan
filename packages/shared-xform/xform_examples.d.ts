export declare const employeesJson = "{\n  \"employees\": [\n    { \"id\": 101, \"name\": \"Alice Smith\", \"city\": \"New York\", \"age\": 29 },\n    { \"id\": 102, \"name\": \"Bob Jones\", \"city\": \"Boston\", \"age\": 31 },\n    { \"id\": 103, \"name\": \"Marcus Miller\", \"city\": \"Chicago\", \"age\": 34 },\n    { \"id\": 104, \"name\": \"Sara Lee\", \"city\": \"Chicago\", \"age\": 27 }\n  ]\n}";
export declare const specJsonToCsvWithVars = "\nversion: 1\nname: employees_to_csv_with_vars\ninput:\n  type: json\n  root: $.employees[]\noutput:\n  type: csv\n  options:\n    header: true\nmappings:\n  - name: id\n    expr: id\n    type: number\n  - name: name\n    expr: name\n  - name: city\n    expr: city\nfilters:\n  - expr: age >= {{min_age}}\n  - expr: city == {{target_city}}\ndefaults:\n  on_missing: null\nparameters:\n  - name: min_age\n    type: number\n    required: true\n  - name: target_city\n    type: string\n    required: true\n";
export declare const varsExample: {
    min_age: number;
    target_city: string;
};
