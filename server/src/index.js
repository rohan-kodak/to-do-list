import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createToken, hashPassword, readToken, verifyPassword } from './security.js';

dotenv.config();
const app = express();
app.use(cors({ origin: ['http://127.0.0.1:5180', 'http://localhost:5180'] }));
app.use(express.json({ limit: '1mb' }));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 32 },
  usernameKey: { type: String, required: true, unique: true, select: false },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const todoSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  dueDate: { type: Date, default: null },
  completed: { type: Boolean, default: false }
}, { timestamps: true });
const Todo = mongoose.model('Todo', todoSchema);

function publicUser(user) { return { id: String(user._id), username: user.username, email: user.email }; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function issueAuth(user) { return { token: createToken(user._id), user: publicUser(user) }; }

async function requireAuth(req, res, next) {
  const auth = req.get('authorization') || '';
  const userId = auth.startsWith('Bearer ') ? readToken(auth.slice(7)) : null;
  if (!userId) return res.status(401).json({ message: 'Session sampali. Punha login kara.' });
  try {
    const user = await User.findById(userId).select('username email');
    if (!user) return res.status(401).json({ message: 'Account sapadla nahi. Punha login kara.' });
    req.user = user;
    next();
  } catch (error) { next(error); }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().replace(/\s+/g, ' ');
    const usernameKey = username.toLocaleLowerCase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (username.length < 2 || username.length > 32) return res.status(400).json({ message: 'Username must contain 2 to 32 characters.' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain 8 to 128 characters.' });
    const oldUserCount = await User.countDocuments();
    const user = await User.create({ username, usernameKey, email, passwordHash: await hashPassword(password) });
    // Keep legacy single-user tasks when the first account is created after the app upgrade.
    if (oldUserCount === 0) await Todo.updateMany({ $or: [{ ownerId: { $exists: false } }, { ownerId: null }] }, { $set: { ownerId: user._id } });
    res.status(201).json(issueAuth(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That email or username is already in use.' });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json(issueAuth(user));
  } catch (error) { next(error); }
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/todos', requireAuth, async (req, res, next) => {
  try { res.json(await Todo.find({ ownerId: req.user._id }).sort({ createdAt: -1 })); } catch (error) { next(error); }
});
app.post('/api/todos', requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Task title is required.' });
    const todo = await Todo.create({ ownerId: req.user._id, title, description: req.body.description || '', dueDate: req.body.dueDate || null });
    res.status(201).json(todo);
  } catch (error) { next(error); }
});
app.patch('/api/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.title === 'string') {
      updates.title = req.body.title.trim();
      if (!updates.title) return res.status(400).json({ message: 'Task title cannot be empty.' });
    }
    if (typeof req.body.description === 'string') updates.description = req.body.description.trim();
    if (Object.hasOwn(req.body, 'dueDate')) updates.dueDate = req.body.dueDate || null;
    if (typeof req.body.completed === 'boolean') updates.completed = req.body.completed;
    const todo = await Todo.findOneAndUpdate({ _id: req.params.id, ownerId: req.user._id }, updates, { new: true, runValidators: true });
    if (!todo) return res.status(404).json({ message: 'Task not found.' });
    res.json(todo);
  } catch (error) { next(error); }
});
app.delete('/api/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!todo) return res.status(404).json({ message: 'Task not found.' });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid task ID.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the task details.' });
  console.error(error);
  res.status(500).json({ message: 'Server error. MongoDB connection tapasa.' });
});

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rohan_todo_app';
async function connectAndStart() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log('Connected to MongoDB.');
    app.listen(port, '127.0.0.1', () => console.log(`To-Do API running at http://127.0.0.1:${port}`));
  } catch (error) {
    console.error(`MongoDB is not reachable at ${mongoUri}. Start the MongoDB service or set MONGODB_URI in server/.env.`);
    console.error(`Retrying in 5 seconds (${error.message})`);
    setTimeout(connectAndStart, 5000);
  }
}
connectAndStart();
