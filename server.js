// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------
// CONFIG
// -----------------------
const GHL_API_KEY = process.env.GHL_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY";
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

// Replace with your actual GHL tag ID
const REW_NEW_SIGNUP_TAG_ID = "YOUR_TAG_ID"; 

// -----------------------
// GHL FUNCTIONS
// -----------------------

// Search contact by email
async function findGHLContactByEmail(email) {
  try {
    const res = await axios.get(`${GHL_API_BASE}/contacts/search`, {
      params: { query: email },
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
    });
    return res.data?.contacts?.[0] || null;
  } catch (err) {
    console.error("Error finding GHL contact:", err.response?.data || err.message);
    throw new Error("Failed to search GHL");
  }
}

// Create new contact
async function createGHLContact({ name, email, phone }) {
  try {
    const res = await axios.post(
      `${GHL_API_BASE}/contacts/`,
      {
        name,
        email,
        phone,
        source: "Website Popup",
      },
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data.contact || res.data;
  } catch (err) {
    console.error("Error creating GHL contact:", err.response?.data || err.message);
    throw new Error("Failed to create GHL contact");
  }
}

// Add a tag to a contact
async function addTagToContact(contactId, tagId) {
  try {
    await axios.put(
      `${GHL_API_BASE}/contacts/${contactId}/tags/${tagId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Tag ${tagId} added to contact ${contactId}`);
  } catch (err) {
    console.error("Error adding tag:", err.response?.data || err.message);
    throw new Error("Failed to add tag");
  }
}

// -----------------------
// API ENDPOINT
// -----------------------
app.post("/send-to-crm", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // 1. Check if contact exists in GHL
    let ghlContact = await findGHLContactByEmail(email);

    // 2. If not found → create & tag
    if (!ghlContact) {
      ghlContact = await createGHLContact({ name, email, phone });

      if (REW_NEW_SIGNUP_TAG_ID && ghlContact?.id) {
        await addTagToContact(ghlContact.id, REW_NEW_SIGNUP_TAG_ID);
      }
    }

    res.json({
      message: "Lead processed successfully",
      ghl: ghlContact,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------
// START SERVER
// -----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
