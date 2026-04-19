const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Task Model
const taskSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  priority:  { type: String, default: "low" },
  dueAt:     { type: Date, default: null },
  completed: { type: Boolean, default: false },
  completedLate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// Routes
app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  let dueAt = null;
  if (req.body.dueAt) {
    const d = new Date(req.body.dueAt);
    if (!isNaN(d.getTime())) dueAt = d;
  }
  const task = new Task({ title: req.body.title, priority: req.body.priority, dueAt });
  await task.save();
  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const existing = await Task.findById(req.params.id);
  if (!existing) return res.status(404).json(null);
  const completed = req.body.completed;
  const update = { completed };
  if (completed && !existing.completed && existing.dueAt) {
    update.completedLate = new Date(existing.dueAt).getTime() < Date.now();
  } else if (!completed) {
    update.completedLate = false;
  }
  const task = await Task.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" });
  res.json(task);
});

// Must be before `/:id` so "clear-all" is not parsed as an id
app.delete('/api/tasks/clear-all', async (req, res) => {
  await Task.deleteMany({});
  res.json({ message: 'All tasks removed' });
});

app.delete('/api/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);