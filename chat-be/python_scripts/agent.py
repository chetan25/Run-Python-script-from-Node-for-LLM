import os
import sys
import json
import openai

def print_json(data, end=True):
    """
    Safely print JSON with optional end flag
    """
    try:
        json_str = json.dumps(data)
        print(json_str, flush=True)
        
        if end:
            print(json.dumps({"type": "end"}), flush=True)
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "message": str(e)
        }), flush=True)

def stream_openai_response(prompt):
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

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
                # print_json(chunk.choices[0].delta.content, end=False)

        # Send final completion signal
        print(json.dumps({"type": "end"}), flush=True)


    except Exception as e:
        # Send error back to Node.js
        print(json.dumps({
            "type": "error", 
            "message": str(e)
        }), flush=True)

# Main execution
if __name__ == "__main__":
    # Read prompt from command line argument
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Hello, how are you?"
    stream_openai_response(prompt)