import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY
console.log(`🔑 OpenAI initialization: key exists=${!!apiKey}, key length=${apiKey?.length}, starts with sk-=${apiKey?.startsWith('sk-')}`)

const openai = apiKey && apiKey !== 'sk-...' 
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null

console.log(`🤖 OpenAI client initialized: ${!!openai}`)

export interface AgentPersonality {
  name: string
  role: string
  style: string
  expertise: string[]
}

const agentPersonalities: AgentPersonality[] = [
  {
    name: "Local Expert",
    role: "neighborhood specialist",
    style: "knowledgeable and detailed",
    expertise: ["hidden gems", "local favorites", "authentic experiences"]
  },
  {
    name: "Foodie",
    role: "culinary enthusiast",
    style: "passionate about flavors and dining experiences",
    expertise: ["cuisine types", "chef backgrounds", "wine pairings"]
  },
  {
    name: "Budget Hunter",
    role: "value optimizer",
    style: "practical and resourceful",
    expertise: ["deals", "happy hours", "quality on a budget"]
  },
  {
    name: "Romantic",
    role: "date night specialist",
    style: "thoughtful and atmospheric",
    expertise: ["ambiance", "intimate settings", "special occasions"]
  },
  {
    name: "Trendsetter",
    role: "scene curator",
    style: "hip and current",
    expertise: ["new openings", "instagram-worthy spots", "what's hot"]
  },
  {
    name: "Classic Connoisseur",
    role: "traditionalist",
    style: "refined and timeless",
    expertise: ["established venues", "classic dishes", "proven quality"]
  },
  {
    name: "Adventure Seeker",
    role: "experience hunter",
    style: "bold and experimental",
    expertise: ["unique concepts", "fusion cuisine", "unexpected finds"]
  },
  {
    name: "Health Conscious",
    role: "wellness advocate",
    style: "mindful and balanced",
    expertise: ["organic options", "dietary restrictions", "healthy choices"]
  }
]

export async function generateAgentResponse(
  userPrompt: string,
  agentIndex: number,
  useOpenAI: boolean = true
): Promise<string> {
  const personality = agentPersonalities[agentIndex % agentPersonalities.length]
  
  console.log(`🤖 generateAgentResponse called:`, {
    userPrompt,
    agentIndex,
    useOpenAI,
    personality: personality.name,
    hasOpenAI: !!openai
  })
  
  // If OpenAI is not configured or disabled, return mock response
  if (!openai || !useOpenAI) {
    console.log(`⚠️ Using mock response (OpenAI ${!openai ? 'not configured' : 'disabled'})`)
    return generateMockResponse(userPrompt, personality)
  }
  
  try {
    // Dynamic system prompt that adapts to the user's actual request
    const systemPrompt = `You are ${personality.name}, a ${personality.role}.
Your communication style is ${personality.style}.
The user is asking for: "${userPrompt}"

Provide a specific, helpful recommendation that directly addresses their request.
Include the actual name of a place, service, or product with a brief compelling description.
Be unique and creative. Each agent should offer different perspectives.
Keep your response to 1-2 sentences maximum.`

    console.log(`📤 Calling OpenAI with prompt:`, systemPrompt.substring(0, 200) + '...')
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Based on my request above, what's your best recommendation?` }
      ],
      max_tokens: 100,
      temperature: 0.8 + (agentIndex * 0.05), // Vary temperature per agent for diversity
    })
    
    const response = completion.choices[0]?.message?.content
    console.log(`✅ OpenAI response for ${personality.name}: "${response}"`)
    
    return response || generateMockResponse(userPrompt, personality)
  } catch (error) {
    console.error('🔴 OpenAI error:', error)
    console.log('🔄 Falling back to mock response')
    return generateMockResponse(userPrompt, personality)
  }
}

function generateMockResponse(userPrompt: string, personality: AgentPersonality): string {
  console.log(`⚠️ MOCK RESPONSE CALLED for ${personality.name} - This should not happen if OpenAI is enabled!`)
  // Generate a generic response based on the personality type when OpenAI is not available
  const responses = [
    `As a ${personality.role}, I recommend exploring options that match your request for: ${userPrompt.substring(0, 50)}...`,
    `${personality.name} suggests checking out highly-rated options for your needs`,
    `Based on my expertise in ${personality.expertise[0]}, I'd recommend researching top-rated choices`
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

export function getAgentPersonality(agentIndex: number): AgentPersonality {
  return agentPersonalities[agentIndex % agentPersonalities.length]
}