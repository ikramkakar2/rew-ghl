// server.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY"; // 👈 Replace with full GHL key
const REW_API_KEY = "6700a798bc487f45e470fa17a497e7d9f472a7591e0e4a13b54a64ebcdbd8bce"; // 👈 Your REW API key

// ✅ Create contact in GoHighLevel when user enters email
app.post("/send-to-ghl", async (req, res) => {
  const { email, name = "", phone = "" } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const ghlRes = await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/",
      {
        email,
        name,
        phone,
        tags: ["REW Website Visitor", "New Signup"],
        customField: "source=REW",
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({ success: true, ghlContact: ghlRes.data });
  } catch (err) {
    console.error("GHL Create Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to create contact in GHL" });
  }
});

// ✅ Automatically tag user when they visit pages
app.post("/send-behavior-tag", async (req, res) => {
  const { email, tag } = req.body;

  if (!email || !tag) return res.status(400).json({ error: "Email and tag are required" });

  try {
    await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/update",
      {
        email,
        tags: [tag], // Tag like '/blog', '/listing/123', etc.
        customField: `lastVisited=${tag}`,
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Tagged ${email} with: ${tag}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Tagging Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send tag to GHL" });
  }
});

// ✅ Webhook listener for GHL to sync status to REW
app.post("/ghl-webhook", async (req, res) => {
  const { email, tags } = req.body;

  if (!email || !tags) return res.status(400).json({ error: "Missing email or tags" });

  if (tags.includes("Closed")) {
    try {
      // Simulate REW update
      await axios.post("https://your-rew-api.com/update-status", {
        email,
        status: "Closed",
        apiKey: REW_API_KEY,
      });

      console.log(`🔁 Synced 'Closed' status for ${email}`);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("REW Sync Error:", err.response?.data || err.message);
      return res.status(500).json({ error: "Failed to sync to REW" });
    }
  }

  return res.status(200).json({ message: "Webhook received but no action needed" });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
