const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Serve frontend files
app.use(express.static(path.join(__dirname)));

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "attached_assets", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});