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
const streamGeminiSSE = async (prompt, res, apiKey, temperature = 0.7) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
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
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini Stream Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate content' })}\n\n`);
    res.end();
  }
};

// ── AI Course Summarizer (Study Notes) - STREAMING ───────────
router.post('/ai/generate-notes', async (req, res, next) => {
  try {
    const { courseId, topic } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    const course = await CourseModel.findById(courseId).select('title description learningOutcomes');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let prompt = '';
    if (topic && topic.trim() !== '') {
      prompt = `Act as an expert instructor. The student has requested specific study notes on the topic: "${topic.trim()}" within the context of the course titled "${course.title}".
Course Description: ${course.description}

Please provide detailed, well-structured, and highly effective study notes focused entirely on this topic. Format the response strictly in Markdown. Use clear headings, bullet points, and code snippets if applicable. Do NOT output anything other than the markdown text.`;
    } else {
      prompt = `Act as an expert instructor. Create highly effective study notes for a course titled "${course.title}".
Description: ${course.description}
Learning Outcomes: ${course.learningOutcomes.join(', ')}

Format the response strictly in Markdown with these sections:
1. **Course Overview**: A crisp 2-sentence summary.
2. **Key Concepts**: Bullet points of main topics.
3. **Important Takeaways**: Why this matters.
Do NOT output anything other than the markdown text.`;
    }

    await streamGeminiSSE(prompt, res, apiKey, 0.5);
  } catch (err) {
    console.error('AI Notes Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AI Personalized Roadmap - STREAMING ──────────────────────
router.post('/ai/generate-roadmap', async (req, res, next) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ message: 'Goal is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    // UPDATE: Enforced double line breaks (blank lines) and changed steps to H3 (###)
    const prompt = `Act as a career counselor and technical mentor. Create a learning roadmap for a student whose goal is: "${goal}".
Format your response EXACTLY in this strict Markdown structure. 
CRITICAL: You MUST leave a blank empty line between EVERY single element (the heading, duration, description, and tip) so the frontend Markdown parser renders them correctly.

# Roadmap: Your Learning Path

(A very short 1-2 sentence intro)

### Step 1: [Title]

⏱️ **Duration:** [Time]

[Short concise description of what to do]

> 💡 **Pro Tip:** [Actionable tip]

### Step 2: [Title]

⏱️ **Duration:** [Time]

[Short concise description of what to do]

> 💡 **Pro Tip:** [Actionable tip]

Continue this pattern for exactly 4 to 6 actionable milestones. Do not include summary or concluding paragraphs. Keep it clean and highly structured.`;

    await streamGeminiSSE(prompt, res, apiKey, 0.7);
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