import type { Challenge, PromptCategory } from "@/lib/types";

export type PracticeCategorySlug =
  | "talk-about-yourself"
  | "think-on-the-spot"
  | "explain-an-idea"
  | "social-situations"
  | "interview-practice";

export type PracticeCategory = {
  copy: string;
  label: PromptCategory;
  slug: PracticeCategorySlug;
};

export const practiceCategories: PracticeCategory[] = [
  {
    slug: "talk-about-yourself",
    label: "Talk About Yourself",
    copy: "Share thoughts, stories, and opinions more naturally.",
  },
  {
    slug: "think-on-the-spot",
    label: "Think On The Spot",
    copy: "Answer random prompts without overthinking.",
  },
  {
    slug: "explain-an-idea",
    label: "Explain An Idea",
    copy: "Make everyday ideas clear and interesting.",
  },
  {
    slug: "social-situations",
    label: "Social Situations",
    copy: "Build confidence for conversations and small talk.",
  },
  {
    slug: "interview-practice",
    label: "Interview Practice",
    copy: "Prepare clear answers for jobs and internships.",
  },
];

type PromptSeed = {
  difficulty?: Challenge["difficulty"];
  id: string;
  prompt: string;
  tags?: string[];
  type?: Challenge["type"];
};

function createChallenge(
  category: PromptCategory,
  seed: PromptSeed,
): Challenge {
  return {
    id: seed.id,
    type: seed.type ?? "random_topic",
    category,
    title: category,
    prompt: seed.prompt,
    prepTimeSeconds: 30,
    responseTimeSeconds: 60,
    difficulty: seed.difficulty ?? "Beginner",
    tags: [category, ...(seed.tags ?? []), "60 sec"],
  };
}

const onboardingChallenges: Challenge[] = [
  {
    id: "onboarding-speaking-natural",
    type: "random_topic",
    category: "Talk About Yourself",
    title: "First quick rep",
    prompt: "What is something you enjoy talking about?",
    prepTimeSeconds: 15,
    responseTimeSeconds: 30,
    difficulty: "Beginner",
    tags: ["Onboarding", "Speaking more naturally", "30 sec"],
  },
  {
    id: "onboarding-thinking-spot",
    type: "random_topic",
    category: "Think On The Spot",
    title: "First quick rep",
    prompt: "What would you do with an extra free hour today?",
    prepTimeSeconds: 15,
    responseTimeSeconds: 30,
    difficulty: "Beginner",
    tags: ["Onboarding", "Thinking on the spot", "30 sec"],
  },
  {
    id: "onboarding-explain-idea",
    type: "random_topic",
    category: "Explain An Idea",
    title: "First quick rep",
    prompt: "Explain one app, game, or tool you like using.",
    prepTimeSeconds: 15,
    responseTimeSeconds: 30,
    difficulty: "Beginner",
    tags: ["Onboarding", "Explaining ideas clearly", "30 sec"],
  },
  {
    id: "onboarding-social-situations",
    type: "random_topic",
    category: "Social Situations",
    title: "First quick rep",
    prompt: "What is a simple way to start a conversation with someone new?",
    prepTimeSeconds: 15,
    responseTimeSeconds: 30,
    difficulty: "Beginner",
    tags: ["Onboarding", "Social situations", "30 sec"],
  },
  {
    id: "onboarding-interview-practice",
    type: "interview",
    category: "Interview Practice",
    title: "First quick rep",
    prompt: "Tell me one thing you are good at.",
    prepTimeSeconds: 15,
    responseTimeSeconds: 30,
    difficulty: "Beginner",
    tags: ["Onboarding", "Interview practice", "30 sec"],
  },
];

const dailyChallengePrompts: Array<PromptSeed & { category: PromptCategory }> = [
  {
    id: "daily-changed-mind",
    category: "Talk About Yourself",
    prompt: "What is something you changed your mind about?",
    tags: ["Daily challenge", "Self-expression"],
  },
  {
    id: "daily-comfortable-place",
    category: "Talk About Yourself",
    prompt: "Describe a place where you feel comfortable.",
    tags: ["Daily challenge", "Storytelling"],
  },
  {
    id: "daily-improve-day",
    category: "Think On The Spot",
    prompt: "What is one small thing that can improve someone's day?",
    tags: ["Daily challenge", "Quick thinking"],
  },
  {
    id: "daily-enjoyed-recently",
    category: "Talk About Yourself",
    prompt: "Talk about something you enjoyed recently.",
    tags: ["Daily challenge", "Everyday speaking"],
  },
  {
    id: "daily-habit-build",
    category: "Talk About Yourself",
    prompt: "What is a habit you would like to build?",
    tags: ["Daily challenge", "Growth"],
  },
  {
    id: "daily-underrated",
    category: "Explain An Idea",
    prompt: "Explain something you think is underrated.",
    tags: ["Daily challenge", "Clarity"],
  },
  {
    id: "daily-easy-conversation",
    category: "Explain An Idea",
    prompt: "What makes a conversation easy to enjoy?",
    tags: ["Daily challenge", "Social confidence"],
  },
  {
    id: "daily-looking-forward",
    category: "Talk About Yourself",
    prompt: "Describe something you are looking forward to.",
    tags: ["Daily challenge", "Confidence"],
  },
  {
    id: "daily-getting-better",
    category: "Talk About Yourself",
    prompt: "What is one thing you are getting better at?",
    tags: ["Daily challenge", "Growth"],
  },
  {
    id: "daily-simple-decision",
    category: "Think On The Spot",
    prompt: "Talk about a simple decision you made today.",
    tags: ["Daily challenge", "Everyday speaking"],
  },
  {
    id: "daily-good-weekend",
    category: "Think On The Spot",
    prompt: "What makes a good weekend?",
    tags: ["Daily challenge", "Opinion"],
  },
  {
    id: "daily-relax",
    category: "Talk About Yourself",
    prompt: "What is one thing you do to relax?",
    tags: ["Daily challenge", "Daily life"],
  },
  {
    id: "daily-mood-boost",
    category: "Talk About Yourself",
    prompt: "What is a simple thing that improves your mood?",
    tags: ["Daily challenge", "Daily life"],
  },
  {
    id: "daily-welcoming-room",
    category: "Think On The Spot",
    prompt: "What makes a room feel welcoming?",
    tags: ["Daily challenge", "Quick thinking"],
  },
  {
    id: "daily-why-music",
    category: "Explain An Idea",
    prompt: "Talk about a song or sound that changes your mood.",
    tags: ["Daily challenge", "Clarity"],
  },
  {
    id: "daily-free-hour",
    category: "Think On The Spot",
    prompt: "What would you do with an extra free hour today?",
    tags: ["Daily challenge", "Quick thinking"],
  },
  {
    id: "daily-app-tool",
    category: "Explain An Idea",
    prompt: "Explain one app, game, or tool you like using.",
    tags: ["Daily challenge", "Everyday speaking"],
  },
  {
    id: "daily-good-listener",
    category: "Social Situations",
    prompt: "What makes someone a good listener?",
    tags: ["Daily challenge", "Social confidence"],
  },
  {
    id: "daily-keep-conversation-going",
    category: "Social Situations",
    prompt: "What would you say to keep a conversation going?",
    tags: ["Daily challenge", "Conversation"],
  },
  {
    id: "daily-small-talk",
    category: "Social Situations",
    prompt: "What is a simple way to start small talk?",
    tags: ["Daily challenge", "Social confidence"],
  },
  {
    id: "daily-favourite-part-day",
    category: "Talk About Yourself",
    prompt: "What was your favourite part of the day so far?",
    tags: ["Daily challenge", "Everyday speaking"],
  },
  {
    id: "daily-useful-advice",
    category: "Explain An Idea",
    prompt: "Describe a piece of advice that is easy to remember.",
    tags: ["Daily challenge", "Clarity"],
  },
  {
    id: "daily-share-recommendation",
    category: "Talk About Yourself",
    prompt: "Talk about something you would recommend to a friend.",
    tags: ["Daily challenge", "Recommendation"],
  },
  {
    id: "daily-kind-message",
    category: "Social Situations",
    prompt: "What is a kind message someone might appreciate hearing?",
    tags: ["Daily challenge", "Social confidence"],
  },
  {
    id: "daily-new-thing",
    category: "Think On The Spot",
    prompt: "What is something new you would like to try?",
    tags: ["Daily challenge", "Quick thinking"],
  },
];

const talkAboutYourselfPrompts: PromptSeed[] = [
  {
    id: "talk-small-moment-today",
    prompt: "What is a small moment from today you could describe?",
    tags: ["Self-expression"],
  },
  {
    id: "talk-proud-recently",
    prompt: "What is one thing you are proud of recently?",
    tags: ["Confidence"],
  },
  {
    id: "talk-comfortable-place",
    prompt: "Describe a place where you feel comfortable.",
    tags: ["Storytelling"],
  },
  {
    id: "talk-changed-mind",
    prompt: "What is something you have changed your mind about?",
    tags: ["Self-expression"],
  },
  {
    id: "talk-helpful-habit",
    prompt: "What is a small habit that helps your day?",
    tags: ["Daily life"],
  },
  {
    id: "talk-childhood-like",
    prompt: "What is something you liked as a child?",
    tags: ["Storytelling"],
  },
  {
    id: "talk-skill-improve",
    prompt: "What is a skill you would like to improve?",
    tags: ["Growth"],
  },
  {
    id: "talk-looking-forward",
    prompt: "What is something you are looking forward to?",
    tags: ["Confidence"],
  },
  {
    id: "talk-media-enjoy",
    prompt: "What is a song, film, or game you enjoy and why?",
    tags: ["Opinion"],
  },
  {
    id: "talk-relax",
    prompt: "What is one thing you do to relax?",
    tags: ["Daily life"],
  },
  {
    id: "talk-learned-hard-way",
    prompt: "What is something you learned from trying something new?",
    tags: ["Storytelling"],
  },
  {
    id: "talk-food-recommend",
    prompt: "What is a food you could recommend to someone?",
    tags: ["Recommendation"],
  },
  {
    id: "talk-visit-again",
    prompt: "What is a place you would like to visit again?",
    tags: ["Storytelling"],
  },
  {
    id: "talk-motivated",
    prompt: "What is something that makes you feel motivated?",
    tags: ["Confidence"],
  },
  {
    id: "talk-better-now",
    prompt: "What is one thing you are better at now than before?",
    tags: ["Growth"],
  },
  {
    id: "talk-routine-build",
    prompt: "What is a routine you would like to build?",
    tags: ["Daily life"],
  },
  {
    id: "talk-friends-appreciate",
    prompt: "What is something you appreciate about your friends?",
    tags: ["Relationships"],
  },
  {
    id: "talk-mood-boost",
    prompt: "What is a simple thing that improves your mood?",
    tags: ["Daily life"],
  },
  {
    id: "talk-topic-hours",
    prompt: "What is one topic you could talk about for hours?",
    tags: ["Self-expression"],
  },
  {
    id: "talk-wish-known",
    prompt: "What is something you would like people to know about you?",
    tags: ["Confidence"],
  },
];

const thinkOnTheSpotPrompts: PromptSeed[] = [
  {
    id: "spot-pause-day",
    prompt: "If you could pause one part of your day, what would it be?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-early-or-prepared",
    prompt: "Would you rather always be early or always be prepared?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-public-transport",
    prompt: "What would make waiting in a queue less boring?",
    tags: ["Ideas"],
  },
  {
    id: "spot-instant-skill",
    prompt: "If you could instantly learn one skill, what would it be?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-shared-spaces",
    prompt: "What is one small rule that makes shared spaces nicer?",
    tags: ["Opinion"],
  },
  {
    id: "spot-picnic-bring",
    prompt: "What would you bring to a picnic and why?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-day-theme",
    prompt: "If your day had a theme, what would it be?",
    tags: ["Creative"],
  },
  {
    id: "spot-good-weekend",
    prompt: "What makes a good weekend?",
    tags: ["Opinion"],
  },
  {
    id: "spot-small-big-difference",
    prompt: "What is something small that can make a big difference?",
    tags: ["Ideas"],
  },
  {
    id: "spot-teach-five-minutes",
    prompt: "If you had to teach a class for five minutes, what would you teach?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-phone-died",
    prompt: "What would you do if your phone battery died for a day?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-everyday-invention",
    prompt: "What is one invention you use all the time?",
    tags: ["Ideas"],
  },
  {
    id: "spot-time-or-energy",
    prompt: "Would you rather have more time or more energy?",
    tags: ["Opinion"],
  },
  {
    id: "spot-welcoming-room",
    prompt: "What makes a room feel welcoming?",
    tags: ["Ideas"],
  },
  {
    id: "spot-overcomplicate",
    prompt: "What is something simple that people sometimes make too complicated?",
    tags: ["Opinion"],
  },
  {
    id: "spot-change-mornings",
    prompt: "What would you change about mornings?",
    tags: ["Quick thinking"],
  },
  {
    id: "spot-useful-bag",
    prompt: "What is a useful thing to keep in your bag?",
    tags: ["Daily life"],
  },
  {
    id: "spot-easy-talk-to",
    prompt: "What makes someone easy to talk to?",
    tags: ["Social confidence"],
  },
  {
    id: "spot-trend-understand",
    prompt: "What is something popular that you find interesting?",
    tags: ["Opinion"],
  },
  {
    id: "spot-free-afternoon",
    prompt: "What would you do on a completely free afternoon?",
    tags: ["Quick thinking"],
  },
];

const explainAnIdeaPrompts: PromptSeed[] = [
  {
    id: "idea-favourite-hobby",
    prompt: "Talk someone through how your favourite hobby works.",
    tags: ["Clarity"],
  },
  {
    id: "idea-sleep-matters",
    prompt: "Describe why a good night of sleep can change someone’s day.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-conversation",
    prompt: "Describe what makes a conversation enjoyable.",
    tags: ["Social confidence"],
  },
  {
    id: "idea-habit",
    prompt: "Talk through a habit you think more people should try.",
    tags: ["Clarity"],
  },
  {
    id: "idea-organise-day",
    prompt: "Talk someone through how you organise your day.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-music-mood",
    prompt: "Describe how music can affect someone’s mood.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-good-team",
    prompt: "Describe what helps a team work well together.",
    tags: ["Clarity"],
  },
  {
    id: "idea-routines",
    prompt: "Talk about why routines can feel useful.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-first-impressions",
    prompt: "Describe why first impressions can shape a conversation.",
    tags: ["Social confidence"],
  },
  {
    id: "idea-good-teacher",
    prompt: "Describe what makes someone easy to learn from.",
    tags: ["Clarity"],
  },
  {
    id: "idea-breaks-productivity",
    prompt: "Talk through how taking a short break can help someone focus.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-story-interesting",
    prompt: "Describe what makes a story interesting to listen to.",
    tags: ["Clarity"],
  },
  {
    id: "idea-start-exercising",
    prompt: "Talk someone through a gentle way to start exercising.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-confidence-practice",
    prompt: "Describe how confidence can grow through small practice reps.",
    tags: ["Confidence"],
  },
  {
    id: "idea-listening-important",
    prompt: "Describe what good listening looks like in a conversation.",
    tags: ["Social confidence"],
  },
  {
    id: "idea-busy-day",
    prompt: "Talk someone through how to prepare for a busy day.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-new-difficult",
    prompt: "Describe why trying something new can feel difficult at first.",
    tags: ["Confidence"],
  },
  {
    id: "idea-easy-understand",
    prompt: "Describe the difference between a clear explanation and a confusing one.",
    tags: ["Clarity"],
  },
  {
    id: "idea-learning-new",
    prompt: "Talk about why learning something new can feel rewarding.",
    tags: ["Everyday speaking"],
  },
  {
    id: "idea-advice-helpful",
    prompt: "Describe what makes advice easy to use.",
    tags: ["Clarity"],
  },
];

const socialSituationsPrompts: PromptSeed[] = [
  {
    id: "social-after-introduction",
    prompt: "What could you say after introducing yourself to someone new?",
    tags: ["Introductions"],
  },
  {
    id: "social-new-event",
    prompt: "How would you introduce yourself at a new event?",
    tags: ["Introductions"],
  },
  {
    id: "social-keep-going",
    prompt: "What would you say to keep a conversation going?",
    tags: ["Conversation"],
  },
  {
    id: "social-invite-plan",
    prompt: "How would you invite someone to join a plan?",
    tags: ["Social confidence"],
  },
  {
    id: "social-weekend-response",
    prompt: "How would you respond if someone asked, \"How was your weekend?\"",
    tags: ["Small talk"],
  },
  {
    id: "social-ask-interests",
    prompt: "How would you ask someone about their interests?",
    tags: ["Conversation"],
  },
  {
    id: "social-join-group",
    prompt: "What could you say when joining a group conversation?",
    tags: ["Social confidence"],
  },
  {
    id: "social-leave-politely",
    prompt: "How would you politely leave a conversation?",
    tags: ["Conversation"],
  },
  {
    id: "social-compliment",
    prompt: "How would you compliment someone without overthinking it?",
    tags: ["Social confidence"],
  },
  {
    id: "social-reconnect",
    prompt: "What would you say to reconnect with someone you have not seen recently?",
    tags: ["Conversation"],
  },
  {
    id: "social-before-class",
    prompt: "How would you make small talk before a class or meeting?",
    tags: ["Small talk"],
  },
  {
    id: "social-study-together",
    prompt: "How would you ask someone if they want to study or work together?",
    tags: ["Conversation"],
  },
  {
    id: "social-awkward-silence",
    prompt: "What would you say if there was an awkward silence?",
    tags: ["Small talk"],
  },
  {
    id: "social-introduce-two-people",
    prompt: "How would you introduce two people to each other?",
    tags: ["Introductions"],
  },
  {
    id: "social-good-news",
    prompt: "How would you respond when someone shares good news?",
    tags: ["Conversation"],
  },
  {
    id: "social-stressed-person",
    prompt: "How would you respond when someone seems stressed?",
    tags: ["Social confidence"],
  },
  {
    id: "social-friend-of-friend",
    prompt: "What would you say when meeting a friend of a friend?",
    tags: ["Introductions"],
  },
  {
    id: "social-follow-up",
    prompt: "How would you ask a follow-up question in a conversation?",
    tags: ["Conversation"],
  },
  {
    id: "social-suggest-plan",
    prompt: "How would you suggest a plan without sounding pushy?",
    tags: ["Social confidence"],
  },
  {
    id: "social-end-warmly",
    prompt: "How would you end a conversation warmly?",
    tags: ["Conversation"],
  },
];

const interviewPracticePrompts: PromptSeed[] = [
  {
    id: "interview-tell-me-about-yourself",
    prompt: "Tell me about yourself.",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-role-interest",
    prompt: "Why are you interested in this role?",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-strength",
    prompt: "What is one strength you bring?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-solved-problem",
    prompt: "Tell me about a time you solved a problem.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-worked-team",
    prompt: "Tell me about a time you worked in a team.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-learned-quickly",
    prompt: "Tell me about a time you learned something quickly.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-proud-project",
    prompt: "What is a project or task you are proud of?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-choose-you",
    prompt: "What would you bring to a team?",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-work-environment",
    prompt: "What kind of work environment helps you do your best?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-received-feedback",
    prompt: "Tell me about a time you received feedback.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-improving",
    prompt: "What is something you are working to improve?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-stay-organised",
    prompt: "Describe a time you had to stay organised.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-handled-pressure",
    prompt: "Tell me about a time you handled pressure.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-motivates-you",
    prompt: "What motivates you?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-next-role-learn",
    prompt: "What would you like to learn in your next role?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-explained-something",
    prompt: "Describe a time you explained something to someone.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-challenge-faced",
    prompt: "Tell me about a challenge you faced and what you did.",
    type: "interview",
    difficulty: "Intermediate",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-good-teammate",
    prompt: "What makes you a good teammate?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-prepare-important",
    prompt: "How do you prepare for something important?",
    type: "interview",
    tags: ["Secondary mode"],
  },
  {
    id: "interview-questions-for-us",
    prompt: "Do you have any questions for us?",
    type: "interview",
    tags: ["Secondary mode"],
  },
];

export const dailyChallenges: Challenge[] = dailyChallengePrompts.map(
  ({ category, ...seed }) => createChallenge(category, seed),
);

export const mockChallenges: Challenge[] = [
  ...onboardingChallenges,
  ...talkAboutYourselfPrompts.map((seed) =>
    createChallenge("Talk About Yourself", seed),
  ),
  ...thinkOnTheSpotPrompts.map((seed) =>
    createChallenge("Think On The Spot", seed),
  ),
  ...explainAnIdeaPrompts.map((seed) =>
    createChallenge("Explain An Idea", seed),
  ),
  ...socialSituationsPrompts.map((seed) =>
    createChallenge("Social Situations", seed),
  ),
  ...interviewPracticePrompts.map((seed) =>
    createChallenge("Interview Practice", seed),
  ),
];

function isOnboardingChallenge(challenge: Challenge) {
  return challenge.tags.includes("Onboarding");
}

export function getCategoryBySlug(slug: string | undefined) {
  return (
    practiceCategories.find((category) => category.slug === slug) ??
    practiceCategories[1]
  );
}

export function getChallengesByCategory(slug: string | undefined) {
  const category = getCategoryBySlug(slug);
  return mockChallenges.filter(
    (challenge) =>
      challenge.category === category.label && !isOnboardingChallenge(challenge),
  );
}

export function getRandomChallenge(categorySlug?: string) {
  const pool = categorySlug
    ? getChallengesByCategory(categorySlug)
    : mockChallenges.filter((challenge) => !isOnboardingChallenge(challenge));
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? mockChallenges[0];
}

export function getChallengeById(id: string | undefined) {
  return (
    [...dailyChallenges, ...mockChallenges].find(
      (challenge) => challenge.id === id,
    ) ?? mockChallenges[0]
  );
}
