---
Title: Run Python script from Node for LLM.
Excerpt: Simple example to run a python script that talks to LLM via node server.
Tech: "Node, Python, Langchain, OpenAI"
---

# Run Python script from Node for LLM

Wanted to explore if I could re-use the agents written in Python via Node server in our FE application. Came across few options: - `python-shell` - A npm library that lets you run python script in node environment. - `PyScript` - Its a open source platform for Python in the browser, with this we can run python script directly in browser. - `child_process` - The other way is spawning child process in node to run the python server.

In this repo I have taken the 3rd approach.

## Folders

The repo has 2 folders: - `chat-fe` - Holds the React UI that talks to the node server - `chat-be` - Holds the script for node and python server.

## Local development

- FE
  - Navigate to the chat-fe folder
  - Run the following commands:
    - `nvm use` - This will make sure u are using the right version of node
    - `npm install` - Install the deps
    - `nom run dev` - Runs the vite server.
- BE
  - Navigate to the `chat-be/python_scripts` for installing python deps.
  - Run `pip install -r python_scripts/requirements.txt` - Install the deps.
  - Navigate to the `chat-be/node_scripst` for installing node deps.
  - Run `npm install`
  - Run `node server.js` - This starts the BE server.

## Code

We have two files in `chat-be/node_scripts` - `server.js` - This runs the Node Express server - `script.js` - Is just a node script that would than invoke the python script.
But the logic to invoke the python script is same:

```js
const { spawn } = require("child_process");

// this invokes the python script
const pythonProcess = spawn(
  "python3",
  // path to the python file as first value and argument to the script as second
  [path.join(__dirname, "..", "python_scripts", "agent.py"), prompt],
  {
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  }
);

// this is where we get data from the script
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
```

The python script is simple, the main crux is we are transferring data using the standard i/p and o/p, which is `print` statement in python

```py
# Stream the response
    stream = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": prompt}
        ],
        stream=True
    )

    # Stream each chunk of the response
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            # Send each text chunk back to Node.js
            print(json.dumps({
                "type": "stream",
                "data": chunk.choices[0].delta.content
            }), flush=True)

    # Send final completion signal
    print(json.dumps({"type": "end"}), flush=True)

```

**NOTE**
I have the docker setup but at the moment the docker container BE is not streaming the chunks. Will try to update it.
