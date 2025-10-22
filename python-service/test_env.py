import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("Environment check:")
print(f"OPENAI_API_KEY: {'SET' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")
print(f"DB_HOST: {os.getenv('DB_HOST')}")
print(f"LLM_MODEL: {os.getenv('LLM_MODEL')}")

# Test OpenAI connection
try:
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model=os.getenv('LLM_MODEL', 'gpt-3.5-turbo'),
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )
    response = llm.invoke("Hello, test message")
    print(f"OpenAI Response: {response.content}")
except Exception as e:
    print(f"OpenAI Error: {e}")
