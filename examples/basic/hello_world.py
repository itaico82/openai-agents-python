"""
Basic example demonstrating simple agent usage with OpenAI Agents SDK.
"""
import asyncio
import os
from dotenv import load_dotenv

from agents import Agent, Runner

# Load environment variables from .env file
load_dotenv()

def main():
    # Create a simple agent with basic instructions
    agent = Agent(
        name="Assistant",
        instructions="You are a helpful assistant that provides concise responses."
    )

    # Run the agent synchronously
    result = Runner.run_sync(
        agent,
        "Write a haiku about artificial intelligence."
    )
    
    # Print the final output
    print("\nAgent's response:")
    print(result.final_output)

if __name__ == "__main__":
    # Ensure OPENAI_API_KEY is set
    if not os.getenv("OPENAI_API_KEY"):
        print("Please set your OPENAI_API_KEY environment variable.")
        exit(1)
    
    main()
