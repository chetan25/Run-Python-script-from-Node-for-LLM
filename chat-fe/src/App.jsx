/* eslint-disable no-unsafe-optional-chaining */
import { useState } from "react";
import { flushSync } from "react-dom";

const LLMStreamConsumer = () => {
  const [prompt, setPrompt] = useState("");
  const [streamData, setStreamData] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const handleStream = async () => {
    setStreamData([]);
    setError(null);
    setIsStreaming(true);
    const backendUrl = "http://localhost:5000";
    try {
      const response = await fetch(`${backendUrl}/stream-llm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      //       // Assuming the backend sends a ReadableStream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        lines.forEach((line, index) => {
          if (line.startsWith("data:")) {
            try {
              const jsonData = JSON.parse(line.replace("data: ", "").trim());
              if (jsonData.char) {
                console.log(jsonData.char);
                // Add the new character to the existing text
                // Force React to re-render to reflect changes
                setTimeout(() => {
                  flushSync(() =>
                    setStreamData((prev) => prev + jsonData.char)
                  ); // Ensures immediate update
                }, index * 200); // Simulate delay for typing effect
              } else {
                setIsStreaming(false);
              }
            } catch (err) {
              console.error("Error parsing chunk:", err);
            }
          }
        });
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setError("An error occurred while streaming data.");
      setIsStreaming(false);
    }
  };

  return (
    <div className="p-10 flex  items-center w-dvw h-dvh flex-col">
      <h1>Stream LLM respone via POST with Node + Python</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt"
        rows="4"
        cols="150"
      />
      <br />
      <button onClick={handleStream} disabled={isStreaming}>
        {isStreaming ? "Streaming..." : "Start Stream"}
      </button>
      <div className="text-wrap flex justify-start w-full">
        <h2>Stream Output:</h2>
        <p className="text-wrap text-xl">{streamData}</p>
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default LLMStreamConsumer;
