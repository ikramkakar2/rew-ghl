const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const REW_API_KEY = "a13bef704dd30a0dca1e1b6deb4ed1eae8acfead51ed3505ff4cbe7f67f3a99a";
const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjlEVUp6ekloYUJtZXo5SjdKRU9iIiwidmVyc2lvbiI6MSwiaWF0IjoxNzM4NDcwMjIyNjEwLCJzdWIiOiJQbHhjbkM3SlBZZzBxSVV5cjJBWiJ9.QgjVpuuzsuiG2cPs57MAOl68pnsCRHOXe7CvB_8NAEY";

const REW_API_BASE = "https://crm.realestatewebmasters.com/api/v1";
const GHL_API_BASE = "https://rest.gohighlevel.com/v1";

async function findREWContactByEmail(email) {
  const res = await axios.get(`${REW_API_BASE}/leads`, {
    params: { email },
    headers: { Authorization: `Bearer ${REW_API_KEY}` }
  });
  return res.data?.data?.[0] || null;
}

async function createREWLead({ name, email, phone }) {
  const res = await axios.post(`${REW_API_BASE}/leads`, {
    first_name: name.split(" ")[0] || "",
    last_name: name.split(" ")[1] || "",
    email,
    phone
  }, {
    headers: {
      Authorization: `Bearer ${REW_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.data;
}

async function findGHLContactByEmail(email) {
  const res = await axios.get(`${GHL_API_BASE}/contacts/`, {
    params: { email },
    headers: { Authorization: `Bearer ${GHL_API_KEY}` }
  });
  return res.data?.contacts?.[0] || null;
}

async function createGHLContact({ name, email, phone }) {
  const res = await axios.post(`${GHL_API_BASE}/contacts/`, {
    name,
    email,
    phone,
    source: "Website Popup"
  }, {
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.data;
}

app.post("/send-to-crm", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    let rewContact = await findREWContactByEmail(email);
    if (!rewContact) rewContact = await createREWLead({ name, email, phone });

    let ghlContact = await findGHLContactByEmail(email);
    if (!ghlContact) ghlContact = await createGHLContact({ name, email, phone });

    res.json({
      message: "Lead processed successfully",
      rew: rewContact,
      ghl: ghlContact
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


