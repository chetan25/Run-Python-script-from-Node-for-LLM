const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const cors = require("cors");
require("dotenv").config({ path: "../../.env" });
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enable CORS for the frontend origin
app.options("*", cors());
app.use(
  cors({
    origin: "*", // Update to the actual frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow specific methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
  })
);
app.use(express.json());

// Streaming LLM Route
app.post("/stream-llm", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Extract prompt from request body
  const { prompt } = req.body;
  if (!prompt) {
    // Immediately return error if no prompt is provided
    res.status(400).write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Prompt is required",
      })}\n\n`
    );
    res.end();
    return;
  }
  console.log("Received prompt:", prompt);
  // Spawn Python process
  const pythonProcess = spawn(
    "python3",
    [path.join(__dirname, "..", "python_scripts", "agent.py"), prompt],
    {
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      },
    }
  );

  let isStreamOpen = true;

  pythonProcess.stdout.on("data", (data) => {
    if (!isStreamOpen) return;

    try {
      const cleanData = data
        .toString()
        .trim()
        .split("\n")
        .filter((line) => {
          try {
            // Only parse valid JSON lines
            JSON.parse(line);
            return true;
          } catch {
            return false;
          }
        });

      cleanData.forEach((jsonString) => {
        const jsonData = JSON.parse(jsonString);

        switch (jsonData.type) {
          case "stream":
            console.log(jsonData.data);
            res.write(`data: ${JSON.stringify({ char: jsonData.data })}\n\n`);
            // res.write(`data: ${jsonData.data}\n\n`);
            break;
          case "end":
            // Handle completion
            res.write(`data: ${JSON.stringify({ type: "end" })}\n\n`);
            // res.write(`data: ${jsonData.data}\n\n`);
            res.end(); // End the SSE connection
            isStreamOpen = false;
            break;
          case "error":
            // Handle errors
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                message: jsonData.data,
              })}\n\n`
            );
            res.end(); // End the SSE connection
            isStreamOpen = false;
            break;
        }
      });
    } catch (error) {
      console.error("Parsing error:", error);
      if (isStreamOpen) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: "Parsing failed",
          })}\n\n`
        );
        res.end();
        isStreamOpen = false;
      }
    }
  });

  // Handle Python stderr
  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python stderr: ${data}`);
    if (isStreamOpen) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: data.toString().trim(),
        })}\n\n`
      );
      res.end();
      isStreamOpen = false;
    }
  });

  // Handle Python process exit
  pythonProcess.on("close", (code) => {
    console.log(`Python process exited with code ${code}`);
    if (isStreamOpen) {
      if (code !== 0) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: `Process exited with code ${code}`,
          })}\n\n`
        );
      }
      res.end();
      isStreamOpen = false;
    }
  });

  pythonProcess.on("exit", (code, signal) => {
    console.log(`Python process exited with code ${code} and signal ${signal}`);
  });

  // Handle client disconnect
  //   req.on("close", () => {
  //     if (!isStreamOpen) {
  //       console.log("Client disconnected, killing Python process");
  //       pythonProcess.kill();
  //       isStreamOpen = false;
  //     } else {
  //       console.log("Client already disconnected or stream closed.");
  //     }
  //   });
});

app.post("/test-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let count = 0;

  const interval = setInterval(() => {
    count++;
    res.write(
      `data: ${JSON.stringify({
        type: "stream",
        message: `Message ${count}`,
      })}\n\n`
    );

    if (count >= 5) {
      res.write(`data: ${JSON.stringify({ type: "end" })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  //   req.on("close", () => {
  //     console.log("Client disconnected");
  //     clearInterval(interval);
  //   });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  app.close(() => {
    console.log("Process terminated");
  });
});
