const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(require("cors")());
app.use(express.json());

mongoose.connect(process.env.MONGO_URL);

// ===== МОДЕЛИ =====
const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    portfolio: [
        {
            crypto: String,
            amount: Number,
            buyPrice: Number
        }
    ]
});

const User = mongoose.model("User", UserSchema);

const SECRET = "SECRET_KEY";

// ===== РЕГИСТРАЦИЯ =====
app.post("/register", async (req, res) => {
    const { email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hash });
    await user.save();

    res.json({ message: "User created" });
});

// ===== ЛОГИН =====
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, SECRET);

    res.json({ token });
});

// ===== МИДЛВАР =====
function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.id;
        next();
    } catch {
        res.sendStatus(403);
    }
}

// ===== ДОБАВИТЬ В ПОРТФЕЛЬ =====
app.post("/portfolio", auth, async (req, res) => {
    const { crypto, amount, buyPrice } = req.body;

    const user = await User.findById(req.userId);

    user.portfolio.push({ crypto, amount, buyPrice });
    await user.save();

    res.json(user.portfolio);
});

// ===== ПОЛУЧИТЬ ПОРТФЕЛЬ =====
app.get("/portfolio", auth, async (req, res) => {
    const user = await User.findById(req.userId);
    res.json(user.portfolio);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("Server started on " + PORT));