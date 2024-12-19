# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY ./python_scripts/requirements.txt ./python_scripts/
RUN pip install --no-cache-dir -r python_scripts/requirements.txt

# Copy Node.js application dependencies
WORKDIR /app/node_scripts
COPY ./node_scripts/package*.json ./
RUN npm install --no-cache

# Back to root working directory
WORKDIR /app

# Copy the rest of the project files
COPY . .

# Expose the necessary port
EXPOSE 5000

# Command to run the application
CMD ["node", "node_scripts/server.js"]