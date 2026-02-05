const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://admin:zk070607@cluster0.sloyvlc.mongodb.net/?appName=Cluster0"; 
const SECRET = "NEXUS_GOLD_SECRET_999";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Cloud DB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

const UserSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    profile: {
        name: { type: String, default: '新成员' },
        job: String, email: String, wechat: String, bio: String,
        updatedAt: { type: Date, default: Date.now }
    }
});
const User = mongoose.model('User', UserSchema);

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const role = (phone === '19892919069') ? 'admin' : 'user'; 
        const user = new User({ phone, password: hashed, role });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "号码已占用或格式错误" }); }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ error: "账号或密码错误" });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, SECRET);
        res.json({ token, role: user.role, name: user.profile.name });
    } catch (e) { res.status(500).json({ error: "服务器内部错误" }); }
});

app.get('/api/me', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send();
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id);
    res.json(user.profile);
});

app.get('/api/admin/all', async (req, res) => {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: "权限不足" });
    const allUsers = await User.find({}, 'phone profile role');
    res.json(allUsers);
});

// 根目录，用来检测服务器活没活着
app.get('/', (req, res) => res.send("Nexus Server Active"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Listening on ${PORT}`));