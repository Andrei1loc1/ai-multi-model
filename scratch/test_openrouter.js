
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function getEnvValue(key) {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
}

async function testModel(modelId, modelSlug) {
    const key = getEnvValue('OPENROUTER_API_KEY_1');
    if (!key) {
        console.error("Missing OPENROUTER_API_KEY_1 in .env.local");
        return;
    }
    console.log(`Testing model ${modelId} (${modelSlug})...`);
    
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: modelSlug,
                messages: [{ role: "user", content: "Hello, say test." }]
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`,
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Test App"
                }
            }
        );
        console.log(`✅ ${modelId} Success:`, response.data.choices[0].message.content);
    } catch (error) {
        console.error(`❌ ${modelId} failed:`, error.response?.data || error.message);
    }
}

async function run() {
    await testModel("qwen3-coder-free", "qwen/qwen3-coder:free");
    await testModel("minimax-m2.5-free", "minimax/minimax-m2.5:free");
    await testModel("nemotron-3-super-free", "nvidia/nemotron-4-340b-instruct:free");
}

run();
