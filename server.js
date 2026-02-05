const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. 数据库配置 ---
// 部署时记得把这里换成 MongoDB Atlas 的地址
const MONGO_URI = "mongodb://127.0.0.1:27017/nexus_gold"; 
const SECRET = "NEXUS_GOLD_SECRET_KEY";

mongoose.connect(MONGO_URI).then(() => console.log("数据库已连接"));

// --- 2. 数据模型 ---
const UserSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // 'user' 或 'admin'
    profile: {
        name: { type: String, default: '新成员' },
        email: String, wechat: String, job: String,
        skills: String, education: String, motto: String,
        bio: String, updatedAt: { type: Date, default: Date.now }
    }
});
const User = mongoose.model('User', UserSchema);

// --- 3. 核心逻辑 ---

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        // 这里设置你的手机号为管理员，比如 '13812345678'
        const role = (phone === '你的手机号') ? 'admin' : 'user'; 
        const user = new User({ phone, password: hashed, role });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "号码已占用或系统错误" }); }
});

// 登录
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(400).json({ error: "账号或密码错误" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET);
    res.json({ token, role: user.role, name: user.profile.name });
});

// 管理员特权：查看所有用户数据
app.get('/api/admin/all', async (req, res) => {
    try {
        const token = req.headers.authorization;
        const decoded = jwt.verify(token, SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: "无权访问" });
        
        const allUsers = await User.find({}, 'phone profile role');
        res.json(allUsers);
    } catch (e) { res.status(401).json({ error: "认证失败" }); }
});

// 获取个人资料
app.get('/api/me', async (req, res) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id);
    res.json(user.profile);
});

// 修改个人资料
app.put('/api/me', async (req, res) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    await User.findByIdAndUpdate(decoded.id, { 'profile': req.body, 'profile.updatedAt': Date.now() });
    res.json({ success: true });
});

app.listen(3000, () => console.log('后端已在 3000 端口启动'));