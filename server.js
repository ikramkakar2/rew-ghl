const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY"; // 👈 Replace with full GHL key
const REW_API_KEY = "6700a798bc487f45e470fa17a497e7d9f472a7591e0e4a13b54a64ebcdbd8bce"; // 👈 Your REW API key

// ✅ Create Lead in GHL when user signs up or enters email
app.post("/send-to-ghl", async (req, res) => {
  const { email, name, phone } = req.body;

  try {
    const ghlRes = await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/",
      {
        email,
        name,
        phone,
        tags: ["REW Website Visitor", "New Signup"],
        customField: "source=REW"
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
    console.error("GHL Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to send to GHL" });
  }
});

// ✅ Track User Behavior from frontend
app.post("/track", async (req, res) => {
  const { email, action, details } = req.body;

  if (!email || !action) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Update contact in GHL with new tag and custom field
    await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/update",
      {
        email,
        tags: [action], // e.g., "Viewed Property", "Favorited Listing"
        customField: `lastAction=${details}`, // or use a GHL field ID for better mapping
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Tracked: ${action} - ${details}`);
    return res.status(200).json({ success: true, message: "Action tracked in GHL" });
  } catch (err) {
    console.error("Tracking Error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to track behavior in GHL" });
  }
});

// ✅ GHL → REW Sync (Webhook from GHL)
app.post("/ghl-webhook", async (req, res) => {
  const { email, tags } = req.body;

  if (tags && tags.includes("Closed")) {
    try {
      // Simulate update in REW
      await axios.post("http://localhost:3000/update-rew", {
        email,
        status: "Closed",
      });

      return res.status(200).json({ success: true, message: "Synced Closed status to REW" });
    } catch (err) {
      return res.status(500).json({ error: "Failed to sync with REW" });
    }
  }

  return res.status(200).json({ message: "Webhook received" });
});

// ✅ Simulated REW update endpoint
app.post("/update-rew", (req, res) => {
  const { email, status } = req.body;

  console.log(`🔁 Syncing GHL status '${status}' to REW for ${email}`);
  // Simulate saving to REW. You’d use REW API here.
  return res.status(200).json({ success: true });
});

// ✅ Run server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
