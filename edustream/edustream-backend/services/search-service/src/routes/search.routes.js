import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import Fuse from 'fuse.js';
import { GoogleGenAI } from '@google/genai';
import CourseModel from '../../../course-service/src/models/Course.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';
import redisClient, { getCache, setCache } from '../../../../shared/utils/cache.js';

const router = express.Router();

// ── Fault Tolerance: Exponential Backoff Wrapper ────────────────
// LLM APIs are notorious for 429 (Too Many Requests) or 503 errors.
// This wrapper automatically retries failed calls before giving up,
// ensuring a seamless experience for students during traffic spikes.
const withRetry = async (fn, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 || err.status >= 500) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`AI API failed (${err.status}). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
};

// ── Search Courses ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { q, category, level, minPrice, maxPrice, sort = 'relevance', page = 1, limit = 12 } = req.query;

    const filter = { status: 'published' };

    // Full-text search
    if (q) {
      filter.$text = { $search: q };

      // ── Search Analytics (Trending Searches) ────────────────
      // Every time a user searches for a term, increment its score in a Redis Sorted Set.
      // This is exactly how Amazon/Udemy build their "Trending Searches" dropdowns.
      if (redisClient) {
        redisClient.zincrby('search:trending', 1, q.toLowerCase().trim()).catch(() => { });
      }
    }
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Sort options
    let sortObj = {};
    if (sort === 'relevance' && q) sortObj = { score: { $meta: 'textScore' } };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'popular') sortObj = { enrolledCount: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'price-asc') sortObj = { price: 1 };
    else if (sort === 'price-desc') sortObj = { price: -1 };

    const skip = (page - 1) * limit;
    const projection = q ? { score: { $meta: 'textScore' } } : {};

    const [courses, total] = await Promise.all([
      CourseModel.find(filter, projection).sort(sortObj).skip(skip).limit(Number(limit)),
      CourseModel.countDocuments(filter),
    ]);

    return successResponse(res, HTTP_STATUS.OK, 'Search results', {
      courses, query: q || '',
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// ── Get Trending Searches ──────────────────────────────────────
// Returns the top 5 most searched terms globally (from Redis)
router.get('/trending', async (req, res, next) => {
  try {
    if (!redisClient) {
      return successResponse(res, HTTP_STATUS.OK, 'Trending searches', []);
    }

    // ZREVRANGE returns elements ordered from highest to lowest score
    const trending = await redisClient.zrevrange('search:trending', 0, 4);
    return successResponse(res, HTTP_STATUS.OK, 'Trending searches fetched', trending);
  } catch (err) { next(err); }
});

// ── AI Chatbot Endpoint ───────────────────────────────────────
router.post('/ai/chat', async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured in backend' });
    }

    const systemInstruction = "You are EduBot, an AI assistant for the 'EduStream' e-learning platform. Be helpful, concise, and friendly. Answer questions about courses, web development, coding, UI/UX, and platform features (like wishlist, dark mode, certificates). Do not answer completely unrelated questions. Keep responses under 4 sentences.";

    // SDK Initialization
    const ai = new GoogleGenAI({ apiKey });

    // Format messages for SDK
    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I am EduBot.' }] },
      ...messages.map(msg => ({
        role: msg.sender === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    ];

    // Enterprise-grade call with retries
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { maxOutputTokens: 250, temperature: 0.7 }
    }));

    const responseText = response.text || "I didn't quite get that.";

    return successResponse(res, HTTP_STATUS.OK, 'AI Response', { text: responseText });
  } catch (err) {
    console.error('AI Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate AI response' });
  }
});

// ── AI Quiz Generator ─────────────────────────────────────────
router.post('/ai/generate-quiz', async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    // ── AI Cache: Save Money & Time ───────────────────────────
    // If 100 students ask for the same quiz, we only hit the Gemini API once.
    const cacheKey = `ai:quiz:${courseId}`;
    const cachedQuiz = await getCache(cacheKey);
    if (cachedQuiz) {
      return successResponse(res, HTTP_STATUS.OK, 'Quiz generated (Cached)', { quiz: cachedQuiz });
    }

    const course = await CourseModel.findById(courseId).select('title description requirements');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const prompt = `Generate a 10-question multiple-choice quiz for a course titled "${course.title}". 
Description: ${course.description}
Requirements: ${course.requirements.join(', ')}

Return a JSON array of objects.
Each object must have this exact structure:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string of the correct option"
}`;

    const ai = new GoogleGenAI({ apiKey });

    // ── Structured Output (JSON Mode) ─────────────────────────
    // Instead of Regex hacking, we FORCE the model to return JSON
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: "application/json" }
    }));

    const quizData = JSON.parse(response.text);

    // Cache the AI output for 24 hours
    await setCache(cacheKey, quizData, 24 * 60 * 60);

    return successResponse(res, HTTP_STATUS.OK, 'Quiz generated', { quiz: quizData });
  } catch (err) {
    console.error('AI Quiz Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate quiz' });
  }
});

// ── Helper for Gemini SSE Streaming ────────────────────────────
const streamGeminiSSE = async (prompt, res, apiKey, temperature = 0.5) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // The official SDK natively handles SSE parsing and reconnects!
    const stream = await withRetry(() => ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature }
    }));

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini Stream Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Failed to generate content' })}\n\n`);
    res.end();
  }
};

// ── AI Course Summarizer (Study Notes) - STREAMING & STRUCTURED ─
router.post('/ai/generate-notes', async (req, res, next) => {
  try {
    const { courseId, topic } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    const course = await CourseModel.findById(courseId).select('title description learningOutcomes');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const topicFocus = topic && topic.trim() !== '' ? topic.trim() : 'Comprehensive Course Curriculum';

    const prompt = `You are a distinguished university professor and principal staff software engineer. Create elite, high-yield, and beautifully structured study notes in GitHub-flavored Markdown.

Course: "${course.title}"
Topic Focus: "${topicFocus}"
Course Description: ${course.description}
Key Objectives: ${course.learningOutcomes?.join(', ') || 'Core concepts and practical execution'}

CRITICAL FORMATTING INSTRUCTIONS:
- Structure the response with clear hierarchical Markdown headers (#, ##, ###).
- Always leave an empty blank line between every heading, paragraph, list item, and code block.
- Format all code with proper markdown language tags (e.g. \`\`\`javascript, \`\`\`python).
- Use tables, callouts (> 💡), and bold keywords for maximum readability.
- Do NOT output preamble or meta text. Start immediately with the Markdown title.

Use this EXACT structured architecture:

# 📚 Study Notes: ${topicFocus}
*Course: ${course.title}*

> 💡 **Executive Summary:** [2-3 sentences providing an intuitive high-level explanation of this subject, its architectural purpose, and why it matters in real-world software engineering.]

---

## 🎯 Key Learning Objectives
- [x] **Core Understanding:** [Master foundational concepts and underlying execution model]
- [x] **Practical Skill:** [Apply clean, maintainable patterns in real projects]
- [x] **Performance & Quality:** [Identify performance gotchas and engineering trade-offs]

---

## 🧠 Core Architecture & Deep-Dive Concepts

### 1. Conceptual Foundation & Mental Model
[Detailed, clear explanation using intuitive analogies. Highlight vital keywords in **bold**.]

### 2. Inner Mechanics & Execution Flow
[Explain step-by-step how the internals operate. If relevant, include a clean ASCII architecture diagram or workflow representation.]

### 3. Key Terminology & Definitions
* **[Term 1]:** [Crisp definition]
* **[Term 2]:** [Crisp definition]
* **[Term 3]:** [Crisp definition]

---

## 💻 Production-Ready Code Implementation
Provide a realistic, cleanly commented, and robust code example demonstrating the best-practice pattern.

\`\`\`javascript
// [Describe what this example accomplishes]
// Production-grade implementation with explanatory comments
\`\`\`

---

## ⚠️ Common Pitfalls & Anti-Patterns
| ❌ Anti-Pattern / Mistake | ⚠️ Impact | ✅ Best Practice Solution |
|---|---|---|
| [Common mistake 1] | [Why this causes bugs or memory leaks] | [The idiomatic, correct solution] |
| [Common mistake 2] | [Why this causes bugs or slow execution] | [The idiomatic, correct solution] |

---

## 📝 High-Yield Revision Cheat-Sheet
* ⚡ **Cardinal Rule:** [The #1 rule to remember when implementing this]
* ⚡ **Execution Formula:** [Step 1 ➔ Step 2 ➔ Step 3]
* ⚡ **Pro Tip:** [Senior engineer tip for interviews or production scale]

---

## ❓ Knowledge Check (Self-Assessment)
1. **Question 1:** [Thought-provoking concept question to test comprehension]
   * *Hint/Answer:* [Concise hint or answer]
2. **Question 2:** [Practical engineering decision question]
   * *Hint/Answer:* [Concise hint or answer]`;

    await streamGeminiSSE(prompt, res, apiKey, 0.4);
  } catch (err) {
    console.error('AI Notes Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AI Personalized Roadmap - STREAMING & STRUCTURED ─────────
router.post('/ai/generate-roadmap', async (req, res, next) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ message: 'Goal is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    const prompt = `You are a Silicon Valley engineering director and technical career mentor. Create an ultra-practical, structured, step-by-step learning roadmap in GitHub-flavored Markdown for a student whose goal is: "${goal.trim()}".

CRITICAL FORMATTING INSTRUCTIONS:
- Structure the response with clear hierarchical Markdown headers (#, ##, ###).
- Always leave an empty blank line between every heading, table, list item, and blockquote for clean Markdown parsing.
- Use clean icons, badges in backticks (\`React\`, \`Node.js\`), and actionable milestones.
- Do NOT output chat preamble. Start immediately with the Markdown title.

Use this EXACT structured architecture:

# 🗺️ Master Learning Roadmap: ${goal.trim()}

> 🎯 **Career Mission:** [A punchy 2-sentence mission statement summarizing the role, core value proposition, and career trajectory.]

| ⏱️ Estimated Timeline | 📊 Target Difficulty | 💼 Target Job Roles |
|---|---|---|
| [e.g. 4 - 6 Months (10-12 hrs/week)] | [Beginner ➔ Full-Stack Ready] | [List 2-3 specific real-world job titles] |

---

## 📋 Foundational Prerequisites
* What students should know or set up before diving into Phase 1 (e.g. Basic computer skills, terminal, VS Code, Git).

---

## 🛣️ Phased Learning Milestones

### 📍 Phase 1: [Milestone Title - Fundamentals & Tooling]
* ⏱️ **Duration:** [e.g. 3 Weeks]
* 🎯 **Core Learning Focus:**
  * [Focus item 1]
  * [Focus item 2]
  * [Focus item 3]
* 🛠️ **Tech & Tools to Master:** \`[Tool 1]\`, \`[Tool 2]\`, \`[Tool 3]\`
* 💻 **Hands-On Portfolio Project:**
  * **[Project Title]:** [Detailed 2-sentence description of a concrete project to build]
* 💡 **Mentor's Pro Tip:** [Actionable insider tip on how to practice or avoid getting stuck]

### 📍 Phase 2: [Milestone Title - Core Architecture & Implementation]
* ⏱️ **Duration:** [e.g. 4 Weeks]
* 🎯 **Core Learning Focus:**
  * [Focus item 1]
  * [Focus item 2]
  * [Focus item 3]
* 🛠️ **Tech & Tools to Master:** \`[Tool 1]\`, \`[Tool 2]\`, \`[Tool 3]\`
* 💻 **Hands-On Portfolio Project:**
  * **[Project Title]:** [Detailed 2-sentence description of a concrete project to build]
* 💡 **Mentor's Pro Tip:** [Actionable insider tip]

### 📍 Phase 3: [Milestone Title - Backend, APIs & Data Modeling]
* ⏱️ **Duration:** [e.g. 4 Weeks]
* 🎯 **Core Learning Focus:**
  * [Focus item 1]
  * [Focus item 2]
  * [Focus item 3]
* 🛠️ **Tech & Tools to Master:** \`[Tool 1]\`, \`[Tool 2]\`, \`[Tool 3]\`
* 💻 **Hands-On Portfolio Project:**
  * **[Project Title]:** [Detailed 2-sentence description of a concrete project to build]
* 💡 **Mentor's Pro Tip:** [Actionable insider tip]

### 📍 Phase 4: [Milestone Title - Testing, Cloud Deployment & Scaling]
* ⏱️ **Duration:** [e.g. 3 Weeks]
* 🎯 **Core Learning Focus:**
  * [Focus item 1]
  * [Focus item 2]
  * [Focus item 3]
* 🛠️ **Tech & Tools to Master:** \`[Tool 1]\`, \`[Tool 2]\`, \`[Tool 3]\`
* 💻 **Hands-On Portfolio Project:**
  * **[Project Title]:** [Detailed 2-sentence description of a concrete project to build]
* 💡 **Mentor's Pro Tip:** [Actionable insider tip]

---

## 🏆 Capstone Portfolio Project
* **Project Name:** [A flagship, comprehensive full-stack capstone project name]
* **Architecture:** [Summary of frontend, backend, database, and auth stack]
* **Resume Pitch:** [How to pitch this project in interviews to demonstrate hireability]

---

## 📚 Top Recommended Free Resources
* 🔗 **Official Documentation:** [Primary docs to reference]
* 🔗 **Practice Platforms:** [Interactive practice sites or open-source repositories]`;

    await streamGeminiSSE(prompt, res, apiKey, 0.5);
  } catch (err) {
    console.error('AI Roadmap Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get Categories (Cached) ────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const cacheKey = 'search:categories';
    const cached = await getCache(cacheKey);
    if (cached) return successResponse(res, HTTP_STATUS.OK, 'Categories fetched (cached)', cached);

    const categories = await CourseModel.distinct('category', { status: 'published' });

    await setCache(cacheKey, categories, 24 * 60 * 60); // Cache for 24h
    return successResponse(res, HTTP_STATUS.OK, 'Categories fetched', categories);
  } catch (err) { next(err); }
});

// ── Autocomplete (Smart Hybrid: Fuse.js + Redis) ───────────────
// Fixes the "Keystroke Crusher" and handles typos gracefully!
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return successResponse(res, HTTP_STATUS.OK, 'Suggestions', []);

    // 1. Fetch all course titles from Redis (or DB if cache miss)
    const cacheKey = 'search:all_courses_lite';
    let allCourses = await getCache(cacheKey);

    if (!allCourses) {
      const courses = await CourseModel.find({ status: 'published' }).select('title category');
      allCourses = courses.map(c => ({ id: c._id, title: c.title, category: c.category }));
      await setCache(cacheKey, allCourses, 5 * 60); // Cache for 5 minutes
    }

    // 2. Perform in-memory fuzzy search using Fuse.js
    // This handles typos (e.g., "jvascript" -> "javascript") instantly without hitting MongoDB!
    const fuse = new Fuse(allCourses, {
      keys: ['title', 'category'],
      threshold: 0.3, // 0.0 is perfect match, 1.0 is match anything
      includeScore: true,
    });

    const results = fuse.search(q).slice(0, 8).map(result => result.item);

    return successResponse(res, HTTP_STATUS.OK, 'Suggestions', results);
  } catch (err) { next(err); }
});

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'search-service' }));

export default router;