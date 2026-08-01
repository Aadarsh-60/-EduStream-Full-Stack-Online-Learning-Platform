import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import CourseModel from '../../../course-service/src/models/Course.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

const router = express.Router();

// ── Search Courses ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { q, category, level, minPrice, maxPrice, sort = 'relevance', page = 1, limit = 12 } = req.query;

    const filter = { status: 'published' };

    // Full-text search
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;
    if (level)    filter.level    = level;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Sort options
    let sortObj = {};
    if (sort === 'relevance' && q) sortObj = { score: { $meta: 'textScore' } };
    else if (sort === 'newest')    sortObj = { createdAt: -1 };
    else if (sort === 'popular')   sortObj = { enrolledCount: -1 };
    else if (sort === 'rating')    sortObj = { rating: -1 };
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
    
    // Format messages for Gemini REST API
    const contents = [
      { role: 'user', parts: [{ text: systemInstruction }] },
      { role: 'model', parts: [{ text: 'Understood. I am EduBot.' }] },
      ...messages.map(msg => ({
        role: msg.sender === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    ];

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { contents, generationConfig: { maxOutputTokens: 250, temperature: 0.7 } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't quite get that.";

    return successResponse(res, HTTP_STATUS.OK, 'AI Response', { text: responseText });
  } catch (err) {
    console.error('AI Error:', err.response?.data || err.message);
    const msg = err.response?.data?.error?.message || err.message;
    return res.status(500).json({ success: false, message: msg });
  }
});

// ── AI Quiz Generator ─────────────────────────────────────────
router.post('/ai/generate-quiz', async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'GEMINI_API_KEY is not configured' });

    const course = await CourseModel.findById(courseId).select('title description requirements');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const prompt = `Generate a 10-question multiple-choice quiz for a course titled "${course.title}". 
Description: ${course.description}
Requirements: ${course.requirements.join(', ')}

Return ONLY a valid JSON array of objects. Do NOT include markdown formatting like \`\`\`json or \`\`\`. 
Each object must have this exact structure:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string of the correct option"
}`;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { contents, generationConfig: { temperature: 0.2 } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    let responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Clean up potential markdown blocks if Gemini includes them despite instructions
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const quizData = JSON.parse(responseText);

    return successResponse(res, HTTP_STATUS.OK, 'Quiz generated', { quiz: quizData });
  } catch (err) {
    console.error('AI Quiz Error:', err.response?.data || err.message);
    const msg = err.response?.data?.error?.message || err.message;
    return res.status(500).json({ success: false, message: msg });
  }
});

// ── Get Categories ─────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await CourseModel.distinct('category', { status: 'published' });
    return successResponse(res, HTTP_STATUS.OK, 'Categories fetched', categories);
  } catch (err) { next(err); }
});

// ── Autocomplete ───────────────────────────────────────────────
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return successResponse(res, HTTP_STATUS.OK, 'Suggestions', []);

    const courses = await CourseModel
      .find({ title: { $regex: q, $options: 'i' }, status: 'published' })
      .select('title category')
      .limit(8);

    return successResponse(res, HTTP_STATUS.OK, 'Suggestions', courses.map((c) => ({
      id: c._id, title: c.title, category: c.category,
    })));
  } catch (err) { next(err); }
});

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'search-service' }));

export default router;
