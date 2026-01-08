
const axios = require('axios');

async function test() {
    try {
        console.log('Testing create task...');
        const res = await axios.post('http://localhost:3000/api/tasks', {
            name: "Test Task " + Date.now(),
            method: "GET",
            url: "https://httpbin.org/get",
            workerGroup: "should-be-ignored", // This should now be stripped safely
            tags: ["test"]
        });
        console.log('✅ Task created successfully:', res.status, res.data.id);
    } catch (e) {
        if (e.response) {
            console.error('❌ Failed:', e.response.status, JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('❌ Failed:', e.message);
        }
    }
}

test();
