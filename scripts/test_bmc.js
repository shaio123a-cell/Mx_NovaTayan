const fs = require('fs');
const path = require('path');
(async ()=>{
  try {
    const { validateSpecYaml } = require('../packages/shared-xform/xform_validation');
    const { transform } = require('../packages/shared-xform/xform_engine');

    const specYaml = `version: 1
name: employees_minimal_json
input:
  type: json
  root: $.employees[]
output:
  type: json
mappings:
  - name: employee_id
    expr: id
    type: number
  - name: city
    expr: city
defaults:
  on_missing: error
`;

    const sampleInput = {
      "employees": [
        {"id":101,"name":"Jordan Smith","age":29,"city":"New York","work_address":"750 7th Ave, New York, NY 10019"},
        {"id":102,"name":"Sarah Chen","age":34,"city":"San Francisco","work_address":"1 Market St, San Francisco, CA 94105"}
      ]
    };

    const validation = validateSpecYaml(specYaml);
    console.log('validation ok:', validation.ok);
    if (!validation.ok) console.log('errors:', validation.errors);
    const spec = validation.spec;

    const inputText = JSON.stringify(sampleInput);
    const res = await transform(spec, inputText, {}, { previewLimit: 50 });
    console.log('transform result:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('ERROR', e);
  }
})();
