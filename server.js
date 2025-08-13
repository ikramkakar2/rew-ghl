const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

const REW_API_KEY = "a13bef704dd30a0dca1e1b6deb4ed1eae8acfead51ed3505ff4cbe7f67f3a99a";
const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY";

const REW_API_BASE = "https://crm.realestatewebmasters.com/api/v1";
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

const app = express();
app.use(cors());
app.use(express.json());

async function findREWContactByEmail(email) {
  const res = await fetch(`${REW_API_BASE}/leads?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${REW_API_KEY}` }
  });
  if (!res.ok) throw new Error(`REW Search error: ${res.statusText}`);
  const data = await res.json();
  return data.data && data.data.length > 0 ? data.data[0] : null;
}

async function createREWLead({ name, email, phone }) {
  const res = await fetch(`${REW_API_BASE}/leads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REW_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      first_name: name.split(" ")[0] || "",
      last_name: name.split(" ")[1] || "",
      email,
      phone
    })
  });

  if (!res.ok) {
    const errData = await res.text();
    throw new Error(`REW Create error: ${errData}`);
  }

  return await res.json();
}

async function findGHLContactByEmail(email) {
  const res = await fetch(`${GHL_API_BASE}/contacts?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${GHL_API_KEY}` }
  });
  if (!res.ok) throw new Error(`GHL Search error: ${res.statusText}`);
  const data = await res.json();
  return data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
}

async function createGHLContact({ name, email, phone }) {
  const res = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      phone,
      source: "Website Popup"
    })
  });

  if (!res.ok) {
    const errData = await res.text();
    throw new Error(`GHL Create error: ${errData}`);
  }

  return await res.json();
}

app.post("/send-to-crm", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let rewContact = await findREWContactByEmail(email);
    if (!rewContact) {
      rewContact = await createREWLead({ name, email, phone });
    }

    let ghlContact = await findGHLContactByEmail(email);
    if (!ghlContact) {
      ghlContact = await createGHLContact({ name, email, phone });
    }

    res.json({
      message: "Lead processed successfully",
      rew: rewContact,
      ghl: ghlContact
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
