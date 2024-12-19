const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: "../.env" });

function streamLLMResponse(prompt) {
  return new Promise((resolve, reject) => {
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

    // Create a write stream to send chunks to client
    const responseChunks = [];

    pythonProcess.stdout.on("data", (data) => {
      try {
        // Trim and clean the data before parsing
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

        // Parse each valid JSON line
        cleanData.forEach((jsonString) => {
          const jsonData = JSON.parse(jsonString);

          switch (jsonData.type) {
            case "stream":
              console.log(jsonData.data);
              break;
            case "end":
              // Handle completion
              break;
            case "error":
              // Handle errors
              break;
          }
        });
      } catch (error) {
        console.error("Parsing error:", error, "Raw data:", data.toString());
      }
    });
    // Handle any errors
    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      reject(new Error(data.toString()));
    });

    // Handle process exit
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Example usage
async function main() {
  try {
    const response = await streamLLMResponse("Tell me a short story about AI.");
    console.log("Full Response:", response);
  } catch (error) {
    console.error("LLM Stream Error:", error);
  }
}

main();
