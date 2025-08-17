import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-...' 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

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
  
  // If OpenAI is not configured or disabled, return mock response
  if (!openai || !useOpenAI) {
    return generateMockResponse(userPrompt, personality)
  }
  
  try {
    const systemPrompt = `You are ${personality.name}, a ${personality.role} with expertise in ${personality.expertise.join(', ')}.
Your communication style is ${personality.style}.
Respond to restaurant/venue requests with a specific recommendation in 1-2 sentences.
Format: [Restaurant Name] - [Brief compelling description]
Be unique and don't repeat what others might suggest.`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.8, // Add variety between agents
    })
    
    return completion.choices[0]?.message?.content || generateMockResponse(userPrompt, personality)
  } catch (error) {
    console.error('OpenAI error:', error)
    return generateMockResponse(userPrompt, personality)
  }
}

function generateMockResponse(userPrompt: string, personality: AgentPersonality): string {
  const mockResponses: Record<string, string[]> = {
    "Local Expert": [
      "Freemans on Chrystie - Hidden speakeasy down an alley with amazing cocktails and rustic American fare",
      "Russ & Daughters - Century-old appetizing shop with the best lox and bagels in the city"
    ],
    "Foodie": [
      "Contra - Michelin-starred tasting menu with natural wines at surprisingly reasonable prices",
      "Dirty French - Elevated bistro fare with escargot and duck confit worth writing home about"
    ],
    "Budget Hunter": [
      "Joe's Pizza on Carmine - Classic NYC slice that won't break the bank but delivers on flavor",
      "Xi'an Famous Foods - Hand-pulled noodles and Chinese street food under $15"
    ],
    "Romantic": [
      "Beauty & Essex - Enter through a pawn shop into a glamorous space perfect for special occasions",
      "The Jane - Stunning venue in a former ballroom with soaring ceilings and intimate corners"
    ],
    "Trendsetter": [
      "Cote - Korean steakhouse with a Michelin star and the hottest reservation in town",
      "Carbone - Instagram-famous Italian-American with tableside Caesar and spicy rigatoni"
    ],
    "Classic Connoisseur": [
      "Balthazar - Timeless French bistro that feels like Paris in SoHo",
      "Gramercy Tavern - Danny Meyer's flagship with impeccable service and seasonal American cuisine"
    ],
    "Adventure Seeker": [
      "Please Don't Tell - Secret bar through a phone booth in a hot dog shop",
      "Noodle Pudding - Brooklyn Italian with no sign, cash only, and incredible osso buco"
    ],
    "Health Conscious": [
      "Sacred Chow - Plant-based kosher with creative vegan takes on comfort food",
      "The Butcher's Daughter - Vegetable slaughterhouse with fresh juices and grain bowls"
    ]
  }
  
  const responses = mockResponses[personality.name] || ["Generic recommendation based on your request"]
  return responses[Math.floor(Math.random() * responses.length)]
}

export function getAgentPersonality(agentIndex: number): AgentPersonality {
  return agentPersonalities[agentIndex % agentPersonalities.length]
}