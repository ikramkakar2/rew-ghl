const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // No need for body-parser anymore

// Securely pull API keys
const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY";
const REW_API_KEY = "6700a798bc487f45e470fa17a497e7d9f472a7591e0e4a13b54a64ebcdbd8bce";

// 🔹 Create or update contact in GHL
app.post("/send-to-ghl", async (req, res) => {
  const { email, name = "", phone = "" } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const response = await axios.post(
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

    res.status(200).json({ success: true, ghlContact: response.data });
  } catch (err) {
    console.error("❌ GHL Create Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send to GHL" });
  }
});

app.post("/track", async (req, res) => {
  const { email, action = "Visited", details = "" } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 🔍 Step 1: Check if user exists
    const check = await axios.get(
      `https://rest.gohighlevel.com/v1/contacts/?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const exists = check.data.contacts?.length > 0;

    // 🧭 Step 2: If not exists, send response to redirect
    if (!exists) {
      return res.status(200).json({ redirect: true, url: "https://yourdomain.com/register" });
    }

    // 🧠 Step 3: Send tracking data to GHL
    await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/update",
      {
        email,
        tags: [action],
        customField: `lastAction=${details}`,
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Tracked: ${email} - ${action}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Tracking Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Tracking failed" });
  }
});


// 🔹 Webhook from GHL → Sync to REW
app.post("/ghl-webhook", async (req, res) => {
  const { email, tags } = req.body;

  if (!email || !tags) return res.status(400).json({ error: "Missing email or tags" });

  if (tags.includes("Closed")) {
    try {
      await axios.post("http://localhost:3000/update-rew", {
        email,
        status: "Closed",
        apiKey: REW_API_KEY,
      });

      console.log(`🔁 Synced 'Closed' for ${email}`);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ REW Sync Error:", err.response?.data || err.message);
      res.status(500).json({ error: "Failed to sync with REW" });
    }
  } else {
    res.status(200).json({ message: "No sync needed" });
  }
});

// 🔹 Simulated REW update endpoint
app.post("/update-rew", (req, res) => {
  const { email, status } = req.body;

  console.log(`✅ Simulating REW update: ${email} → ${status}`);
  res.status(200).json({ success: true });
});

// 🔹 Check if user exists in GHL
app.post("/check-user", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const response = await axios.get(
      `https://rest.gohighlevel.com/v1/contacts/?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const exists = response.data.contacts?.length > 0;
    res.status(200).json({ exists });
  } catch (err) {
    console.error("❌ Check User Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to check user in GHL" });
  }
});

// 🔹 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
