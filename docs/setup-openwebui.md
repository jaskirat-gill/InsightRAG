## Set up OpenWebUI and API access key

Follow the instructions at https://docs.openwebui.com/reference/monitoring/.

### Run Ollama

Follow the instructions at https://ollama.com.

### Install an Ollama model

Available models are listed at https://ollama.com/search. You can install one with `ollama pull <model-name>`. I recommend selecting a relatively small model (under 15 GB).

## Set up the MCP server in OpenWebUI

Go to `Settings` -> `Admin Settings` -> `External Tools` -> click the `+` icon -> change type to `MCP` (from the default `OpenAPI`) -> set `Auth` to `None` -> set URL to your MCP server URL: `http://host.docker.internal:8002/mcp` -> set an ID and name (arbitrary) -> check the connection (the sync icon next to the URL should pass) -> save.

## Set up the `.env` file for OpenWebUI API access

Our KB system needs OpenWebUI's API key to interact with it. Please provide the key in the `.env` file. There are four new values required for this chat interface, all listed in `.env.example`, but only the API key needs to be changed. The others can be copied as-is.

After that, the chat interface should work.
