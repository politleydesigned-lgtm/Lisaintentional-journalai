import { Question, Mission, SparkChallenge } from './types';

export const QUESTIONS: Question[] = [
  {
    id: 1,
    category: "Communication",
    text: "Last meaningful conversation (non-logistics)?",
    choices: [
      { text: "Within 48 hours", scores: { communication: 5, vision: 2 } },
      { text: "Within the week", scores: { communication: 2, vision: 1 } },
      { text: "I can't remember", scores: { communication: 0, vision: 0 } }
    ]
  },
  {
    id: 2,
    category: "Intimacy",
    text: "Daily physical connection (hugs, touch)?",
    choices: [
      { text: "Frequent and vital", scores: { intimacy: 5, trust: 4 } },
      { text: "Comfortable but rare", scores: { intimacy: 2, trust: 2 } },
      { text: "Feels like an obligation", scores: { intimacy: 0, trust: 0 } }
    ]
  },
  {
    id: 3,
    category: "Trust",
    text: "How do you navigate heated moments?",
    choices: [
      { text: "We listen and resolve", scores: { communication: 5, trust: 5 } },
      { text: "We ignore until it fades", scores: { communication: 2, trust: 1 } },
      { text: "It's a cold war for days", scores: { communication: 0, trust: 0 } }
    ]
  },
  {
    id: 4,
    category: "Fun",
    text: "Dedicated 'us' time (dates/fun)?",
    choices: [
      { text: "Weekly non-negotiable", scores: { fun: 5, vision: 4 } },
      { text: "Monthly at best", scores: { fun: 2, vision: 1 } },
      { text: "Special occasions only", scores: { fun: 0, vision: 0 } }
    ]
  },
  {
    id: 5,
    category: "Vision",
    text: "Looking ahead 5 years, is there a plan?",
    choices: [
      { text: "Growing closer together", scores: { vision: 5, trust: 4 } },
      { text: "Hoping for the best", scores: { vision: 2, trust: 2 } },
      { text: "I'm worried about us", scores: { vision: 0, trust: 0 } }
    ]
  },
  {
    id: 6,
    category: "Communication",
    text: "How often do you feel truly 'heard' by your partner?",
    choices: [
      { text: "Almost always", scores: { communication: 5, trust: 3 } },
      { text: "Sometimes, if I push", scores: { communication: 2, trust: 1 } },
      { text: "Rarely or never", scores: { communication: 0, trust: 0 } }
    ]
  },
  {
    id: 7,
    category: "Intimacy",
    text: "How would you describe your sexual connection lately?",
    choices: [
      { text: "Vibrant and exploratory", scores: { intimacy: 5, fun: 3 } },
      { text: "Predictable but okay", scores: { intimacy: 3, fun: 1 } },
      { text: "Non-existent or stressful", scores: { intimacy: 0, fun: 0 } }
    ]
  },
  {
    id: 8,
    category: "Trust",
    text: "Do you feel safe sharing your deepest fears?",
    choices: [
      { text: "Completely safe", scores: { trust: 5, intimacy: 3 } },
      { text: "I filter quite a bit", scores: { trust: 2, intimacy: 1 } },
      { text: "I keep them to myself", scores: { trust: 0, intimacy: 0 } }
    ]
  },
  {
    id: 9,
    category: "Fun",
    text: "When was the last time you laughed together until it hurt?",
    choices: [
      { text: "This past week", scores: { fun: 5, communication: 2 } },
      { text: "A few months ago", scores: { fun: 2, communication: 1 } },
      { text: "I honestly can't recall", scores: { fun: 0, communication: 0 } }
    ]
  },
  {
    id: 10,
    category: "Vision",
    text: "Do you still feel like you're on the same 'team'?",
    choices: [
      { text: "Unshakeable alliance", scores: { vision: 5, trust: 5 } },
      { text: "Mostly, but we drift", scores: { vision: 3, trust: 2 } },
      { text: "It feels like me vs. them", scores: { vision: 0, trust: 0 } }
    ]
  }
];

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "The 10-Second Anchor",
    description: "Hold a hug for exactly 10 seconds today. No talking. No distractions. Just feel the rhythm of your partner's breath against yours.",
    auraTip: "This isn't just a hug; it's a recalibration of your nervous systems. Oxytocin needs time to bloom."
  },
  {
    id: 2,
    title: "The Unseen Gratitude",
    description: "Identify one small, invisible labor your partner performs. Acknowledge it specifically. 'I noticed you handled the coffee/mail/dishes, and it made my morning easier.'",
    auraTip: "Resentment grows in the gaps where gratitude is assumed but never spoken."
  },
  {
    id: 3,
    title: "The Curiosity Window",
    description: "Ask one question that starts with 'What is one thing you're currently...' (dreaming about/worried about/excited for). Listen without solving.",
    auraTip: "We often stop being curious about the person we know best. Re-open the window."
  },
  {
    id: 4,
    title: "The Digital Sunset",
    description: "From 8 PM until sleep, put both phones in a drawer. Sit in the same room. The silence is where the connection lives.",
    auraTip: "The greatest thief of intimacy is the glow of a six-inch screen."
  },
  {
    id: 5,
    title: "The Shared Soundtrack",
    description: "Play a song that reminds you of when you first met. Don't explain why—just let it play while you're both in the room.",
    auraTip: "Music is a direct line to emotional memory. Let the past remind you of your 'why'."
  }
];

export const SPARK_CHALLENGES: SparkChallenge[] = [
  {
    id: 1,
    title: "The 30-Second Slow Dance",
    description: "Put on a slow song in the kitchen. No special occasion needed. Just dance for 30 seconds. Lead her gently.",
    tip: "Physical proximity without a 'goal' lowers defenses and builds playfulness. It's about the lead, not the steps.",
    icon: "Heart",
    points: 250,
    level: 'Easy'
  },
  {
    id: 2,
    title: "The Mystery Compliment",
    description: "Send a text right now mentioning one physical attribute you've always loved about them. Be specific and sincere.",
    tip: "Men often forget that verbal desire is just as important as physical action. Words are the foreplay of the mind.",
    icon: "MessageCircle",
    points: 150,
    level: 'Easy'
  },
  {
    id: 3,
    title: "The 'Yes' Night",
    description: "For the next 2 hours, you say 'yes' to any reasonable request they have. No grumbling. Total compliance.",
    tip: "Surrendering control for a short window creates a safe space for them to lead. It's a power move in disguise.",
    icon: "Sparkles",
    points: 500,
    level: 'Medium'
  },
  {
    id: 4,
    title: "The Eye Contact Challenge",
    description: "Sit across from each other. Look into each other's eyes for 2 minutes without talking. No phones, no distractions.",
    tip: "It feels awkward because it's vulnerable. Vulnerability is the precursor to heat. Hold the gaze.",
    icon: "Smile",
    points: 300,
    level: 'Medium'
  },
  {
    id: 5,
    title: "The Surprise Draft",
    description: "Plan a date for next week. Don't ask for input. Just tell them the time and what to wear. Take full charge.",
    tip: "Taking the mental load of planning is a massive turn-on. Decision-making is a form of leadership she'll appreciate.",
    icon: "Compass",
    points: 400,
    level: 'Bold'
  }
];

export const SPARK_TIPS = [
  {
    title: "The 3-Second Rule",
    text: "When you walk into a room where your partner is, make eye contact for 3 seconds before saying anything. It signals presence."
  },
  {
    title: "Micro-Dates",
    text: "A 15-minute walk without phones is more valuable than a 3-hour movie where you don't speak."
  },
  {
    title: "The 'Bid' Response",
    text: "When they point something out (a bird, a news story), turn towards them. Acknowledge it. These are 'bids' for connection."
  }
];
