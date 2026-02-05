
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 7860; 
const JWT_SECRET = 'nexus_gold_ultra_secret_2024';
const MONGO_URI = 'mongodb+srv://admin:zk070607@cluster0.sloyvlc.mongodb.net/?appName=Cluster0';

app.use(cors());
app.use(express.json());

// 静态文件托管
app.use(express.static(path.join(__dirname)));

// MongoDB 连接
mongoose.connect(MONGO_URI)
  .then(() => console.log("--- Nexus Database Connected ---"))
  .catch(err => console.error("Database connection error:", err));

// 数据模型
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

const RecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: String, 
  title: String,
  content: String,
  category: String,
  createdAt: { type: Date, default: Date.now }
});
const Record = mongoose.model('Record', RecordSchema);

// 鉴权中间件
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "未授权" });
    if (token === 'demo_token') {
        req.user = { _id: 'guest', role: 'user', phone: 'DEMO' };
        return next();
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (e) { res.status(401).send(); }
};

// API 路由
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, username, password } = req.body;
    const role = (phone === '19892919069') ? 'admin' : 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ phone, username, password: hashedPassword, role });
    await user.save();
    res.json({ message: "success" });
  } catch (e) { res.status(400).json({ message: "注册失败" }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ $or: [{ phone: identifier }, { username: identifier }] });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, phone: user.phone, username: user.username, role: user.role } });
  } else {
    res.status(400).json({ message: "凭证无效" });
  }
});

app.get('/api/records', auth, async (req, res) => {
  if (req.user._id === 'guest') return res.json([{ _id: '1', title: '预览模式', content: '登录后可保存真实数据', category: '灵感笔记', createdAt: new Date() }]);
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  const records = await Record.find(filter).sort({ createdAt: -1 });
  res.json(records);
});

app.post('/api/records', auth, async (req, res) => {
  if (req.user._id === 'guest') return res.status(403).json({ message: "请登录后操作" });
  const record = new Record({ ...req.body, userId: req.user._id, phone: req.user.phone });
  await record.save();
  res.json(record);
});

app.delete('/api/records/:id', auth, async (req, res) => {
    if (req.user._id === 'guest') return res.status(403).json({ message: "请登录后操作" });
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    await Record.findOneAndDelete(query);
    res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`Nexus OS is online at port ${PORT}`));
