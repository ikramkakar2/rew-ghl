// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Your GHL API Key
const GHL_API_KEY = "YOUR_GHL_API_KEY_HERE";
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

// -----------------------
// Find contact in GHL by email
// -----------------------
async function findGHLContactByEmail(email) {
  try {
    const res = await axios.get(`${GHL_API_BASE}/contacts/`, {
      params: { email },
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });
    return res.data?.contacts?.[0] || null;
  } catch (err) {
    console.error("Error finding GHL contact:", err.response?.data || err.message);
    throw new Error("Failed to search GHL");
  }
}

// -----------------------
// Create contact in GHL with tag
// -----------------------
async function createGHLContact({ name, email, phone }) {
  try {
    const res = await axios.post(`${GHL_API_BASE}/contacts/`, {
      name,
      email,
      phone,
      source: "Website Popup",
      tags: ["REW New Sign Up"] // <--- Tag added here
    }, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    return res.data;
  } catch (err) {
    console.error("Error creating GHL contact:", err.response?.data || err.message);
    throw new Error("Failed to create GHL contact");
  }
}

// -----------------------
// API Endpoint
// -----------------------
app.post("/send-to-crm", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let ghlContact = await findGHLContactByEmail(email);
    if (!ghlContact) {
      ghlContact = await createGHLContact({ name, email, phone });
    }

    res.json({
      message: "Lead processed successfully",
      ghl: ghlContact
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------
// Start Server
// -----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
