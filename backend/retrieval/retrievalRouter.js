export async function retrievalRouter(query) {
  const q = query.toLowerCase();
  
  const academicKeywords = [
    "paper", "arxiv", "research", "study", "studies", "evaluation of", 
    "clinical", "medical", "empirical", "methodology", "dataset", 
    "neural network", "transformer", "quantum", "physics", "algorithm", 
    "mechanism", "optimization", "topology", "manifold", "protein", 
    "genome", "disease", "treatment", "theorem", "proof", "math", 
    "mathematical", "science", "scientific", "advancement", "novel",
    "architecture", "model", "parameter", "hyperparameter", "autoencoder", 
    "reinforcement learning", "supervised", "unsupervised", "embedding",
    "cognitive", "heuristics", "computational", "experiments", "relevance"
  ];
  
  const generalKeywords = [
    "weather", "news", "price", "stock", "buy", "product", "vs", "review", 
    "how to install", "sports", "score", "today", "yesterday", "current events", 
    "best laptop", "flights", "restaurant", "recipe", "movie", "lyrics", 
    "how do i fix", "tutorial", "guide", "install", "download", "reddit", 
    "shop", "deal", "coupon", "game", "celebrity", "gossip", "local"
  ];

  let academicScore = 0;
  let generalScore = 0;

  for (const word of academicKeywords) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(q)) {
      academicScore++;
    }
  }

  for (const word of generalKeywords) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(q)) {
      generalScore++;
    }
  }

  if (academicScore >= 2 && generalScore === 0) {
    return "academic";
  }
  if (generalScore >= 2 && academicScore === 0) {
    return "general";
  }
  if (academicScore >= 1 && generalScore === 0) {
    return "academic";
  }
  
  return "hybrid";
}
