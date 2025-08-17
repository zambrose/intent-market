require('dotenv').config();

async function testOpenAI() {
  console.log('Testing OpenAI connection...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey?.length);
  console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
  
  if (!apiKey || apiKey === 'sk-...') {
    console.error('❌ OpenAI API key not configured');
    return;
  }
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    
    console.log('✅ OpenAI client created');
    
    // Test with a simple completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant. Respond in one sentence." },
        { role: "user", content: "What's a good restaurant in Miami?" }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });
    
    console.log('✅ OpenAI response:', completion.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ OpenAI error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOpenAI();