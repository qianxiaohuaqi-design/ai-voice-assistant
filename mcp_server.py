import os
import sys

# Suppress Pygame's welcome banner on import so it doesn't print to stdout
# and corrupt the MCP JSON-RPC communication channel.
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "1"

import io
import tempfile
import time
import queue
import threading
import requests
from fastmcp import FastMCP

# Initialize FastMCP Server
mcp = FastMCP("ElevenLabs Speaker")

# Configurable items
# Securely retrieve API Key from environment variables
API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = "x7tNCivOKFAydss7fglA"  # Your custom Voice ID

# Global thread-safe queue to hold audio files that need to be played
speech_queue = queue.Queue()

def playback_worker():
    """
    Background worker that runs in a separate thread.
    It sequentially plays audio files from the speech_queue,
    ensuring multiple speech requests don't overlap or get truncated,
    and performs proper cleanup afterward.
    """
    while True:
        try:
            # Block until an audio file path is available
            temp_path = speech_queue.get()
            if temp_path is None:  # Sentinel value to shut down the worker
                break

            try:
                import pygame
                
                # Initialize the audio mixer
                pygame.mixer.init()
                # Load the temporary MP3 file
                pygame.mixer.music.load(temp_path)
                # Play the loaded track
                pygame.mixer.music.play()

                # Block this background thread until audio completes playing
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)

            except Exception as e:
                # Log errors to stderr to avoid corrupting stdout
                print(f"Error in background playback worker: {e}", file=sys.stderr)
            finally:
                # Release audio resources and clean up mixer
                try:
                    pygame.mixer.quit()
                except Exception:
                    pass

                # Safely remove the temporary audio file
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception as e:
                        print(f"Warning: Could not remove temporary file {temp_path}: {e}", file=sys.stderr)
            
            # Mark the task as done
            speech_queue.task_done()
            
        except Exception as e:
            print(f"Critical error in playback worker loop: {e}", file=sys.stderr)
            time.sleep(1)

# Start the background playback thread as a daemon thread
# It will exit automatically when the main MCP process shuts down
worker_thread = threading.Thread(target=playback_worker, daemon=True)
worker_thread.start()


@mcp.tool()
def speak(text: str) -> str:
    """
    Converts the input text into speech using the ElevenLabs API, and queues it
    to play through the computer's default speakers. Returns immediately to prevent timeouts.

    Args:
        text (str): The message or text to convert to speech and play.
    """
    if not API_KEY:
        return "Error: ELEVENLABS_API_KEY environment variable is not configured."

    if not text.strip():
        return "Error: The provided text is empty."

    # 1. Fetch audio from ElevenLabs API
    api_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",  # Multilingual v2 supports multiple languages
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        if response.status_code != 200:
            return f"Error from ElevenLabs API ({response.status_code}): {response.text}"
        audio_bytes = response.content
    except Exception as e:
        return f"Error connecting to ElevenLabs API: {str(e)}"

    # 2. Write audio bytes to temporary file and queue it for asynchronous playback
    try:
        # Create a temporary MP3 file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        # Put the path in the background thread queue
        speech_queue.put(temp_path)

    except Exception as e:
        return f"Error writing temporary audio file: {str(e)}"

    return f"Successfully queued speech: '{text}'"

if __name__ == "__main__":
    mcp.run()
