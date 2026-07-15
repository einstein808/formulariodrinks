// Run this to check which Gemini models are available for your API key
// Usage: node scripts/check-gemini-models.mjs

const API_KEY = process.env.GEMINI_API_KEY || process.argv[2];

if (!API_KEY || API_KEY === 'cole_sua_chave_aqui') {
  console.error('❌ Forneça a API Key: node scripts/check-gemini-models.mjs SUA_KEY_AQUI');
  process.exit(1);
}

async function listModels(apiVersion) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return { apiVersion, data, ok: res.ok };
}

console.log('🔍 Verificando modelos disponíveis...\n');

const [v1result, v1betaResult] = await Promise.all([
  listModels('v1'),
  listModels('v1beta')
]);

for (const { apiVersion, data, ok } of [v1result, v1betaResult]) {
  console.log(`\n📋 API Version: ${apiVersion}`);
  if (!ok) {
    console.log('  ❌ Erro:', JSON.stringify(data.error?.message));
    continue;
  }
  const models = data.models || [];
  const generateContent = models.filter(m =>
    m.supportedGenerationMethods?.includes('generateContent')
  );
  console.log(`  ✅ ${generateContent.length} modelos suportam generateContent:`);
  generateContent.forEach(m => {
    console.log(`     - ${m.name}  (display: ${m.displayName})`);
  });
}
