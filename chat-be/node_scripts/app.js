const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  async function handleLLMStream(prompt) {
    const pythonProcess = spawn("python3", [
      path.join(__dirname, "..", "python_scripts", "llm_stream.py"),
      prompt,
    ]);

    pythonProcess.stdout.on("data", (data) => {
      const jsonData = JSON.parse(data.toString().trim());

      if (jsonData.type === "stream") {
        // Send streaming chunks to WebSocket client
        ws.send(
          JSON.stringify({
            type: "stream",
            data: jsonData.data,
          })
        );
      }
    });
  }

  ws.on("message", (message) => {
    handleLLMStream(message.toString());
  });
});
