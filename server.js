const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Securely pull API keys
const GHL_API_KEY = "your-ght-api-key-here"; // Make sure to replace with your actual GHL API key
const REW_API_KEY = "your-rew-api-key-here"; // Make sure to replace with your REW API key

// Function to check if the request comes from the allowed domain (sucrerealty.com)
function validateDomain(req) {
  const origin = req.get("Origin");
  return origin && origin.includes("https://www.sucrerealty.com/");
}

// 🔹 Create or update contact in GHL
app.post("/send-to-ghl", async (req, res) => {
  if (!validateDomain(req)) {
    return res.status(403).json({ error: "Invalid domain" });
  }

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

// 🔹 Track user behavior (page visits, etc.)
app.post("/track", async (req, res) => {
  if (!validateDomain(req)) {
    return res.status(403).json({ error: "Invalid domain" });
  }

  const { email, action, details = "" } = req.body;

  if (!email || !action) return res.status(400).json({ error: "Missing required fields" });

  try {
    // Add the custom tag to the existing tags (including REW Website Visitor and New Signup)
    const tagsToSend = [action, "REW Website Visitor", "New Signup"];
    if (details) {
      tagsToSend.push(details); // If there's more specific details (like a URL or page action), add them to tags.
    }

    // Sending the tags to GHL API
    await axios.post(
      "https://rest.gohighlevel.com/v1/contacts/update",
      {
        email,
        tags: tagsToSend, // Send the tags array
        customField: `lastAction=${details}`,
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Tracked: ${email} - Tags: ${tagsToSend.join(', ')}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Tracking Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to track behavior in GHL" });
  }
});

// 🔹 Webhook from GHL → Sync to REW
app.post("/ghl-webhook", async (req, res) => {
  if (!validateDomain(req)) {
    return res.status(403).json({ error: "Invalid domain" });
  }

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
  if (!validateDomain(req)) {
    return res.status(403).json({ error: "Invalid domain" });
  }

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
