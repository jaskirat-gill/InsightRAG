# Unit Test Documentation

**Project:** InsightRAG
**Total Tests:** 59
**Status:** All passing
**Last Run:** 2026-03-13

---

## Overview

Unit tests cover isolated backend logic across two services. No database, network, S3, Redis, or Qdrant connection is required to run any of these tests. External dependencies are either mocked or exercised through code paths that have built-in fallbacks.

| Service | Test File | Tests | Source File Tested |
|---|---|---|---|
| sync-service | `test_jwt.py` | 9 | `utils/jwt.py` |
| sync-service | `test_password.py` | 6 | `utils/password.py` |
| sync-service | `test_plugin_manager.py` | 11 | `app/plugins/manager.py` |
| document-processing-engine | `test_chunker.py` | 14 | `processing/chunker.py` |
| document-processing-engine | `test_parser.py` | 19 | `processing/parser.py` |
| **Total** | | **59** | |

---

## How to Run

```bash
# sync-service
cd backend/sync-service
pytest -v --tb=short

# document-processing-engine
cd backend/document-processing-engine
pytest -v --tb=short
```

Dependencies for each service are declared in `requirements.txt` and `requirements-test.txt`.

---

## sync-service Tests

### test_jwt.py — 9 tests

**Source:** `backend/sync-service/utils/jwt.py`
**Functions tested:** `create_access_token`, `create_refresh_token`, `decode_token`

The JWT utility is responsible for creating and decoding signed tokens used throughout the authentication flow. These tests verify that tokens are correctly formed, that standard claims are present, that expiry is enforced, and that invalid input is handled gracefully without raising exceptions to callers.

---

#### TEST 1 — `test_access_token_decode_roundtrip`

**What it does:** Creates an access token with a subject claim (`sub`) and immediately decodes it, asserting the subject is preserved.

**Why it matters:** This is the most fundamental correctness check for the JWT utility. If encode/decode does not round-trip the subject, no part of the authentication system can identify the current user.

**Inputs:** `{"sub": "user123"}`
**Expected result:** `decode_token(token)["sub"] == "user123"`

---

#### TEST 2 — `test_access_token_has_type_access`

**What it does:** Verifies that `create_access_token` embeds `"type": "access"` in the token payload.

**Why it matters:** The codebase distinguishes access tokens from refresh tokens by the `type` claim. Middleware that validates tokens checks this field to reject refresh tokens being used where only access tokens are allowed.

**Inputs:** `{"sub": "u1"}`
**Expected result:** `payload["type"] == "access"`

---

#### TEST 3 — `test_access_token_has_iat_and_exp`

**What it does:** Confirms that both `iat` (issued-at) and `exp` (expiry) claims exist in a freshly created access token.

**Why it matters:** Standard JWT security requires both claims. `exp` enables token expiry enforcement; `iat` enables audit trails and can be used to detect tokens issued before a forced logout event.

**Inputs:** `{"sub": "u1"}`
**Expected result:** `"iat" in payload` and `"exp" in payload`

---

#### TEST 4 — `test_access_token_custom_expiry`

**What it does:** Creates an access token with an explicit positive `expires_delta` of 2 hours and verifies it decodes successfully.

**Why it matters:** `create_access_token` accepts an optional `expires_delta` parameter. Callers (such as a "remember me" flow) may pass custom durations. This test verifies the custom path works correctly and does not produce an expired token.

**Inputs:** `{"sub": "u1"}`, `expires_delta=timedelta(hours=2)`
**Expected result:** Token decodes to a non-None payload with `sub == "u1"`

---

#### TEST 5 — `test_expired_access_token_returns_none`

**What it does:** Creates a token with `expires_delta=timedelta(seconds=-1)` (already expired at creation time) and verifies that `decode_token` returns `None` rather than raising an exception.

**Why it matters:** The `decode_token` function catches `JWTError` and returns `None` as a design decision, so callers get a safe sentinel value instead of having to handle exceptions. This test confirms that expired tokens are treated as invalid and that the error-handling contract holds.

**Inputs:** `{"sub": "u1"}`, `expires_delta=timedelta(seconds=-1)`
**Expected result:** `decode_token(token) is None`

---

#### TEST 6 — `test_refresh_token_has_type_refresh`

**What it does:** Creates a refresh token for a user ID and verifies the decoded payload carries `"type": "refresh"` and the correct `sub`.

**Why it matters:** Refresh tokens are a separate token type with a longer lifespan. The system must be able to reject a refresh token presented at an endpoint that expects an access token, and vice versa. The `type` claim is the mechanism for that distinction.

**Inputs:** `user_id="user42"`
**Expected result:** `payload["type"] == "refresh"` and `payload["sub"] == "user42"`

---

#### TEST 7 — `test_refresh_token_has_unique_jti`

**What it does:** Creates two refresh tokens for the same user and asserts their `jti` (JWT ID) values differ.

**Why it matters:** The `jti` claim is used for refresh token revocation. If two refresh tokens share a `jti`, revoking one would inadvertently invalidate the other. The implementation uses `uuid.uuid4()` to generate `jti`; this test confirms that uniqueness property holds across calls.

**Inputs:** Two calls to `create_refresh_token("user1")`
**Expected result:** `payload1["jti"] != payload2["jti"]`

---

#### TEST 8 — `test_tampered_token_returns_none`

**What it does:** Passes a deliberately invalid token string (`"bad.token.value"`) to `decode_token` and asserts it returns `None`.

**Why it matters:** Any token that arrives over the network might be malformed, truncated, or crafted by an attacker. The function must never raise an unhandled exception in this case — it must return `None` so the caller can respond with an appropriate 401.

**Inputs:** `"bad.token.value"`
**Expected result:** `decode_token("bad.token.value") is None`

---

#### TEST 9 — `test_arbitrary_data_preserved_in_access_token`

**What it does:** Passes extra claims (e.g. `"role": "admin"`) alongside `sub` and confirms they survive the encode/decode round-trip.

**Why it matters:** The API uses `create_access_token` to embed additional context (such as user roles) directly in the token payload to avoid database lookups on every request. If arbitrary claims are silently dropped, role-based access control would silently break.

**Inputs:** `{"sub": "u1", "role": "admin"}`
**Expected result:** `payload["role"] == "admin"`

---

### test_password.py — 6 tests

**Source:** `backend/sync-service/utils/password.py`
**Functions tested:** `hash_password`, `verify_password`

The password utility wraps passlib's bcrypt context. A notable implementation detail is the explicit 72-byte truncation applied before hashing (lines 9–10 and 16–17 of the source), which mirrors bcrypt's internal hard limit. These tests verify both standard behaviour and that edge case.

---

#### TEST 10 — `test_hash_differs_from_plaintext`

**What it does:** Asserts that `hash_password("secret")` does not return the string `"secret"`.

**Why it matters:** The most basic possible sanity check — the hash function must not be a no-op. If this fails it means the bcrypt context is misconfigured and passwords are stored in plaintext.

**Expected result:** `hash_password("secret") != "secret"`

---

#### TEST 11 — `test_verify_correct_password`

**What it does:** Hashes a password then calls `verify_password` with the same plaintext, asserting it returns `True`.

**Why it matters:** This is the primary use case for the password utility: verifying a login attempt. If this fails, no user can log in.

**Expected result:** `verify_password("secret", hash_password("secret")) is True`

---

#### TEST 12 — `test_verify_wrong_password`

**What it does:** Hashes a password then calls `verify_password` with a different plaintext, asserting it returns `False`.

**Why it matters:** The inverse of TEST 11. If `verify_password` returns `True` for an incorrect password, authentication is completely broken and any password would grant access.

**Expected result:** `verify_password("wrong_password", hash_password("secret")) is False`

---

#### TEST 13 — `test_72_byte_truncation_matches`

**What it does:** Creates an 80-character password and its first-72-character prefix. Hashes the 80-char version and verifies that the 72-char version produces a match.

**Why it matters:** The source code explicitly truncates passwords at 72 UTF-8 bytes before hashing, because bcrypt's underlying algorithm silently ignores bytes beyond position 72. The code makes this behaviour explicit (rather than relying on bcrypt's implicit truncation) so that `hash_password` and `verify_password` are consistent with each other. This test confirms that explicit contract holds: a user who registered with a long password can still log in if they type the first 72 characters correctly.

**Inputs:** `long_password = "a" * 80`, `truncated = "a" * 72`
**Expected result:** `verify_password(truncated, hash_password(long_password)) is True`

---

#### TEST 14 — `test_different_passwords_produce_different_hashes`

**What it does:** Hashes two distinct passwords and asserts the hashes differ.

**Why it matters:** Confirms there is no hash collision for obviously different inputs, and that the function is not returning a constant value regardless of input.

**Expected result:** `hash_password("password1") != hash_password("password2")`

---

#### TEST 15 — `test_bcrypt_salting_produces_different_hashes_for_same_input`

**What it does:** Hashes the same password twice and asserts the two resulting hash strings are different, then verifies that both hashes still verify correctly against the original password.

**Why it matters:** bcrypt generates a fresh random salt on every call. If two calls to `hash_password` with the same input produced identical output, it would indicate the salt is fixed or absent — which would make the system vulnerable to precomputed rainbow-table attacks. This test confirms that salting is working and that each independently-salted hash still verifies.

**Expected result:** `hash1 != hash2`, and `verify_password("same_password", hash1) is True`, and `verify_password("same_password", hash2) is True`

---

### test_plugin_manager.py — 11 tests

**Source:** `backend/sync-service/app/plugins/manager.py`
**Functions tested:** `register_plugin`, `get_plugin_class`, `get_active_plugins`, `get_active_plugin_by_name`, `deactivate_plugin`, `reinitialize_plugin`, `get_discovered_plugins_info`

`PluginManager` is the central registry for source plugins (e.g. S3, future connectors). It maintains two internal dictionaries: `_plugins` (registered classes) and `_active_instances` (initialized, connected instances). Tests use a minimal in-process `ConcretePlugin` subclass — no S3 credentials, no database session, no network calls.

---

#### TEST 16 — `test_register_and_get_plugin_class`

**What it does:** Registers a plugin class under a name and immediately retrieves it, asserting identity.

**Why it matters:** `register_plugin` is the entry point for all plugin discovery. If a class cannot be retrieved after registration, no plugin will ever be usable.

**Expected result:** `manager.get_plugin_class("ConcretePlugin") is ConcretePlugin`

---

#### TEST 17 — `test_get_unknown_plugin_returns_none`

**What it does:** Calls `get_plugin_class` with a name that was never registered and asserts `None` is returned.

**Why it matters:** The manager is expected to return `None` (not raise `KeyError`) for unknown plugins, since callers like `initialize_active_plugins` check for `None` and log a warning rather than crashing.

**Expected result:** `manager.get_plugin_class("nonexistent") is None`

---

#### TEST 18 — `test_get_active_plugins_empty_initially`

**What it does:** Creates a fresh `PluginManager` and asserts `get_active_plugins()` returns an empty list.

**Why it matters:** Initial state correctness. If a freshly constructed manager reports pre-existing active plugins, the application startup logic would behave unpredictably.

**Expected result:** `manager.get_active_plugins() == []`

---

#### TEST 19 — `test_get_active_plugin_by_name_returns_instance`

**What it does:** Injects a plugin instance directly into `_active_instances` and retrieves it by name.

**Why it matters:** `get_active_plugin_by_name` is used during sync operations to look up a specific plugin. This test confirms the lookup works for a known name.

**Expected result:** `manager.get_active_plugin_by_name("my_plugin") is instance`

---

#### TEST 20 — `test_get_active_plugin_by_name_missing_returns_none`

**What it does:** Calls `get_active_plugin_by_name` with a name that has no active instance, asserts `None` is returned.

**Why it matters:** Callers check for `None` to handle the case where a plugin config exists in the database but the plugin failed to initialize. If this raises instead of returning `None`, the application would crash on every sync attempt for a misconfigured plugin.

**Expected result:** `manager.get_active_plugin_by_name("ghost") is None`

---

#### TEST 21 — `test_deactivate_removes_instance`

**What it does:** Adds an instance to `_active_instances`, calls `deactivate_plugin`, then confirms the instance is gone.

**Why it matters:** Plugin deactivation is triggered when a user disables a sync source. The deactivated plugin must no longer appear in the active list or participate in sync operations.

**Expected result:** `manager.get_active_plugin_by_name("my_plugin") is None` after deactivation

---

#### TEST 22 — `test_deactivate_nonexistent_is_noop`

**What it does:** Calls `deactivate_plugin` with a name that was never in `_active_instances`, asserts no exception is raised.

**Why it matters:** The API may call deactivate on a plugin that never successfully initialized (e.g. one that failed `test_connection`). The manager must handle this gracefully rather than crashing.

**Expected result:** Function completes silently without raising

---

#### TEST 23 — `test_reinitialize_plugin_stores_instance`

**What it does:** Registers a plugin class, then calls `reinitialize_plugin` with a mock config object, and verifies the resulting instance is stored and is of the correct type.

**Why it matters:** `reinitialize_plugin` is called when a user edits a plugin's configuration at runtime. It must correctly create a new instance, call `initialize` with the new config, and replace any previous instance in `_active_instances`.

**Expected result:** `manager.get_active_plugin_by_name("test_instance")` is a `ConcretePlugin` instance

---

#### TEST 24 — `test_reinitialize_plugin_unknown_class_is_noop`

**What it does:** Calls `reinitialize_plugin` with a config whose `class_name` is not registered, asserts nothing is stored and no exception is raised.

**Why it matters:** If a plugin module is removed from the codebase but its config row remains in the database, `reinitialize_plugin` must log a warning and continue rather than crashing the sync service.

**Expected result:** `manager.get_active_plugin_by_name("will_not_store") is None` and no exception raised

---

#### TEST 25 — `test_get_discovered_plugins_info_returns_schema`

**What it does:** Registers a plugin class then calls `get_discovered_plugins_info`, asserting the returned list contains the correct `class_name` and `config_schema`.

**Why it matters:** `get_discovered_plugins_info` powers the frontend's dynamic plugin configuration UI — it returns the schema that tells the UI which fields to render. If the class name or schema is wrong, the UI cannot build the correct form for that plugin.

**Expected result:** `info[0]["class_name"] == "ConcretePlugin"` and `info[0]["config_schema"][0]["name"] == "bucket"`

---

#### TEST 26 — `test_get_active_plugins_returns_all_instances`

**What it does:** Injects two instances into `_active_instances` and asserts `get_active_plugins()` returns a list containing both.

**Why it matters:** The sync orchestrator iterates over all active plugins to trigger syncs. If `get_active_plugins` omits any plugin, that source will silently stop syncing without any error.

**Expected result:** `len(active) == 2` and both instances are present

---

## document-processing-engine Tests

### test_chunker.py — 14 tests

**Source:** `backend/document-processing-engine/processing/chunker.py`
**Functions tested:** `chunk_semantic`, `_simple_split`, `_build_section_map`, `_lookup_metadata`

The chunker converts parsed document elements into fixed-size, overlapping text chunks suitable for embedding. `chunk_semantic` uses LlamaIndex's `SentenceSplitter` when available, with automatic fallback to the internal `_simple_split` function. All tests run through the fallback path so they are dependency-free.

---

#### TEST 27 — `test_empty_elements_returns_empty_list`

**What it does:** Calls `chunk_semantic([])` with an empty element list and asserts the result is `[]`.

**Why it matters:** The pipeline may encounter empty documents (e.g. a PDF with only images). The chunker must return an empty list rather than raising an exception or producing chunks with empty text.

**Expected result:** `chunk_semantic([]) == []`

---

#### TEST 28 — `test_whitespace_only_elements_returns_empty`

**What it does:** Provides elements whose `text` fields contain only spaces and newlines, asserts `chunk_semantic` returns `[]`.

**Why it matters:** After joining elements, `chunk_semantic` checks `if not full_text.strip()` before proceeding. This test confirms that guard works correctly — a document consisting entirely of whitespace must not produce chunks that would embed as zero-signal vectors.

**Inputs:** `[make_element("   "), make_element("\n\n\t")]`
**Expected result:** `[]`

---

#### TEST 29 — `test_chunk_index_is_sequential`

**What it does:** Produces multiple chunks from a large text block and verifies that `chunk_index` values are `0, 1, 2, ...` with no gaps or duplicates.

**Why it matters:** `chunk_index` is stored in the database and used to reassemble document context in order. Gaps or duplicates would corrupt retrieval ordering.

**Expected result:** `chunk["chunk_index"] == i` for every `i`

---

#### TEST 30 — `test_chunk_output_has_required_keys`

**What it does:** Produces chunks from a short sentence and verifies that each chunk dict contains exactly the five expected keys: `chunk_text`, `chunk_index`, `section_title`, `page_number`, `token_count`.

**Why it matters:** The downstream indexer and database writer access these keys by name. A missing key would cause a `KeyError` crash during indexing.

**Expected result:** All five keys present in every chunk

---

#### TEST 31 — `test_token_count_matches_word_count`

**What it does:** Chunks a five-word sentence with a large chunk size so it fits in one chunk, then verifies `token_count == len(chunk_text.split())`.

**Why it matters:** `token_count` is stored in the database and used for budget calculations when assembling context windows for LLM queries. If it is computed incorrectly, the system will either truncate context unnecessarily or exceed token limits.

**Expected result:** `chunks[0]["token_count"] == len(chunks[0]["chunk_text"].split())`

---

#### TEST 32 — `test_section_metadata_propagated`

**What it does:** Creates an element with `section_title="Intro"` and `page_number=1`, runs it through `chunk_semantic`, and asserts that `"Intro"` appears in at least one chunk's `section_title`.

**Why it matters:** Section and page metadata is used in the retrieval UI to show users which part of a document a result came from. If metadata is silently dropped during chunking, search results lose their source attribution.

**Expected result:** `"Intro"` appears in the set of `section_title` values across all chunks

---

#### TEST 33 — `test_simple_split_empty_string`

**What it does:** Calls `_simple_split("", 512, 50)` and asserts the result is `[]`.

**Why it matters:** The fallback splitter must handle empty input without producing chunks containing empty strings, which would embed as meaningless vectors and pollute the vector index.

**Expected result:** `_simple_split("", 512, 50) == []`

---

#### TEST 34 — `test_simple_split_respects_chunk_size`

**What it does:** Splits a 1000-word text with `chunk_size=10` and verifies that no chunk exceeds 10 words.

**Why it matters:** The chunk size is the primary control over embedding quality and retrieval precision. If chunks exceed the configured size, they may exceed the embedding model's token limit, causing errors or truncated embeddings.

**Expected result:** `len(chunk.split()) <= 10` for every chunk

---

#### TEST 35 — `test_simple_split_single_chunk_when_text_fits`

**What it does:** Splits a 3-word string with `chunk_size=512` and asserts exactly one chunk is produced containing the full text.

**Why it matters:** Short documents or short sections should not be unnecessarily split. Splitting short text into multiple chunks degrades retrieval accuracy by distributing context that belongs together.

**Expected result:** `len(chunks) == 1` and `chunks[0] == "one two three"`

---

#### TEST 36 — `test_simple_split_overlap_repeats_words`

**What it does:** Splits a 20-word sequence `"0 1 2 ... 19"` with `chunk_size=5` and `overlap=2`, then verifies that the last 2 words of each chunk appear in the first 2 words of the next chunk.

**Why it matters:** Overlap is the mechanism that preserves context across chunk boundaries. Without it, a sentence that spans a boundary would be split with neither half having enough context to be useful for retrieval. This test confirms the overlap contract is honoured.

**Expected result:** For each consecutive pair of chunks, their word sets at the boundary intersect

---

#### TEST 37 — `test_build_section_map_positions`

**What it does:** Builds a section map from two elements with known text and verifies that both entries appear with correct `section_title` and `page_number` values.

**Why it matters:** The section map is the internal data structure that associates character positions in the full document text with section/page metadata. If positions or metadata are recorded incorrectly, `_lookup_metadata` will assign chunks to the wrong section.

**Expected result:** `section_map[0]["section_title"] == "Intro"`, `section_map[1]["section_title"] == "Body"`, correct page numbers

---

#### TEST 38 — `test_build_section_map_start_before_end`

**What it does:** Builds a section map for a single element and verifies `entry["start"] < entry["end"]` for every entry.

**Why it matters:** A malformed map where `start >= end` would indicate the text was not found in the full document string, meaning all subsequent metadata lookups for that section would be based on stale or incorrect positions.

**Expected result:** `entry["start"] < entry["end"]` for all entries

---

#### TEST 39 — `test_lookup_metadata_returns_last_section`

**What it does:** Provides a two-entry section map and calls `_lookup_metadata`, asserting it returns the values from the last entry (`"Second"`, page 2).

**Why it matters:** `_lookup_metadata` iterates through all entries and overwrites `section_title` and `page_number` on each match, so the last entry wins. This is intentional — a chunk that spans multiple sections is attributed to the section it ends in. This test confirms that accumulation behaviour.

**Expected result:** `title == "Second"` and `page == 2`

---

#### TEST 40 — `test_lookup_metadata_empty_map_returns_none`

**What it does:** Calls `_lookup_metadata` with an empty section map and asserts both return values are `None`.

**Why it matters:** Documents without structural metadata (e.g. plain text files) produce an empty section map. Chunks from such documents must have `None` for both fields rather than raising a `KeyError` or returning stale values.

**Expected result:** `(title, page) == (None, None)`

---

### test_parser.py — 19 tests

**Source:** `backend/document-processing-engine/processing/parser.py`
**Functions tested:** `parse_document` (error path), `_parse_plaintext`, `_sanitize_text`, `_resolve_pdf_profile`

The parser converts raw files into structured element lists. It routes to `unstructured` for rich formats and falls back to a plain-text reader for `.txt`, `.md`, and similar files. Tests cover only the pure logic paths that require no external library — the `unstructured`-dependent paths are excluded from unit tests and covered by integration tests instead.

---

#### TEST 41 — `test_missing_file_raises_file_not_found`

**What it does:** Calls `parse_document` with a path that does not exist and asserts `FileNotFoundError` is raised.

**Why it matters:** The pipeline downloads files before parsing. If a download fails silently and an empty path is passed, the parser must fail loudly with a meaningful exception rather than producing empty output or a cryptic error from `unstructured`.

**Expected result:** `pytest.raises(FileNotFoundError)`

---

#### TEST 42 — `test_plaintext_splits_on_double_newline`

**What it does:** Writes a temporary `.txt` file with three paragraphs separated by `\n\n` and asserts `_parse_plaintext` produces exactly three elements with the correct text.

**Why it matters:** The double-newline paragraph split is the fundamental parsing strategy for plain text. If it fails, all `.txt` and `.md` documents will either be returned as a single monolithic element or incorrectly split.

**Expected result:** `len(results) == 3`, each with the matching paragraph text

---

#### TEST 43 — `test_plaintext_result_has_required_keys`

**What it does:** Parses a simple `.txt` file and verifies every returned element has `text`, `metadata`, `metadata.element_type`, `metadata.section_title`, and `metadata.page_number`.

**Why it matters:** The chunker and indexer access these keys by name. A missing key at this stage would cause a `KeyError` crash downstream, potentially failing the entire document processing job silently (since it runs as a Celery task).

**Expected result:** All five keys present in every element

---

#### TEST 44 — `test_plaintext_section_title_and_page_are_none`

**What it does:** Parses a plain `.txt` file and asserts that `section_title` and `page_number` are both `None` in the metadata.

**Why it matters:** Plain text files have no structural markup, so these fields must be explicitly set to `None` rather than being absent or set to a misleading default. Downstream consumers check for `None` to know metadata is unavailable.

**Expected result:** `result["metadata"]["section_title"] is None` and `result["metadata"]["page_number"] is None`

---

#### TEST 45 — `test_plaintext_element_type_is_narrative`

**What it does:** Parses a plain `.txt` file and asserts `element_type == "NarrativeText"` for every element.

**Why it matters:** The `element_type` field drives display logic in the frontend and filtering logic in retrieval. Plain text has no heading detection, so every element is narrative text. Returning a different type here would confuse the retrieval layer.

**Expected result:** `result["metadata"]["element_type"] == "NarrativeText"`

---

#### TEST 46 — `test_plaintext_skips_blank_paragraphs`

**What it does:** Writes a file with leading/trailing blank lines and consecutive blank lines between paragraphs, asserts no returned element has empty or whitespace-only text.

**Why it matters:** Empty elements would embed as zero-signal vectors, pollute the vector index, and produce spurious search results. The parser must filter them out.

**Expected result:** `result["text"].strip() != ""` for all elements

---

#### TEST 47 — `test_plaintext_nul_bytes_stripped`

**What it does:** Writes a `.txt` file containing a NUL byte (`\x00`) and asserts the returned text has no NUL bytes.

**Why it matters:** PostgreSQL raises an error when storing strings containing NUL bytes (`\x00`). Some binary files or corrupted documents may contain them. The `_sanitize_text` function exists specifically to strip these. This test confirms sanitization is applied during plaintext parsing.

**Expected result:** `"\x00" not in results[0]["text"]`

---

#### TEST 48 — `test_sanitize_strips_nul_bytes`

**What it does:** Calls `_sanitize_text("hello\x00world")` and asserts the result is `"helloworld"`.

**Why it matters:** Direct unit test of the sanitization function itself. Confirms NUL bytes are removed rather than replaced with a space or some other character.

**Expected result:** `"helloworld"`

---

#### TEST 49 — `test_sanitize_multiple_nul_bytes`

**What it does:** Calls `_sanitize_text("\x00a\x00b\x00")` and asserts the result is `"ab"`.

**Why it matters:** Confirms that all NUL bytes are removed, not just the first one. A naive implementation that only removed the first occurrence would fail for documents with repeated NUL bytes.

**Expected result:** `"ab"`

---

#### TEST 50 — `test_sanitize_no_nul_unchanged`

**What it does:** Calls `_sanitize_text("clean text")` and asserts the result equals the input unchanged.

**Why it matters:** Sanitization must be a no-op for normal text. If it modifies clean text (e.g. accidentally strips other characters), document content would be silently corrupted.

**Expected result:** `"clean text"`

---

#### TEST 51 — `test_sanitize_empty_string`

**What it does:** Calls `_sanitize_text("")` and asserts the result is `""`.

**Why it matters:** Edge case — the function must handle empty input without raising. Empty strings appear naturally when an element has no text content after earlier processing steps.

**Expected result:** `""`

---

#### TEST 52 — `test_resolve_explicit_valid_profile_wins`

**What it does:** Calls `_resolve_pdf_profile("any.pdf", "pdf_table_heavy")` and asserts the explicit profile is returned unchanged.

**Why it matters:** Users can override the automatic profile selection by specifying a profile explicitly (e.g. for a financial PDF that happens to have a generic filename). The explicit override must always take precedence over filename heuristics.

**Expected result:** `PDF_PROFILE_TABLE_HEAVY` (`"pdf_table_heavy"`)

---

#### TEST 53 — `test_resolve_invalid_explicit_profile_falls_back`

**What it does:** Passes an invalid profile name (`"unknown_profile"`) as the explicit override, uses a filename with no trigger keywords, and asserts the result falls back to `PDF_PROFILE_AUTO`.

**Why it matters:** A typo or stale config value in the `parse_profile` field must not crash the parser. The code checks `if requested_profile in PDF_PARSE_PROFILES` and falls through to filename detection if the profile is unrecognised.

**Expected result:** `PDF_PROFILE_AUTO` (`"pdf_auto"`)

---

#### TEST 54 — `test_resolve_filename_table_keyword`

**What it does:** Tests three filenames containing financial keywords (`"financial_statement.pdf"`, `"balance_sheet.pdf"`, `"ledger_q4.pdf"`) and asserts each resolves to `PDF_PROFILE_TABLE_HEAVY`.

**Why it matters:** The `hi_res` strategy used by the table-heavy profile enables OCR and table extraction, which is expensive but necessary for financial documents. Auto-selecting this profile by filename prevents users from needing to configure it manually for obviously tabular documents.

**Expected result:** All three → `PDF_PROFILE_TABLE_HEAVY`

---

#### TEST 55 — `test_resolve_filename_chart_keyword`

**What it does:** Tests three filenames containing visualisation keywords (`"sales_dashboard.pdf"`, `"growth_chart.pdf"`, `"revenue_graph.pdf"`) and asserts each resolves to `PDF_PROFILE_DATAVIZ_HEAVY`.

**Why it matters:** The dataviz-heavy profile enables image extraction (`extract_images_in_pdf=True`), which is needed to capture chart content. Without this profile, data visualisations in PDFs would be silently ignored.

**Expected result:** All three → `PDF_PROFILE_DATAVIZ_HEAVY`

---

#### TEST 56 — `test_resolve_filename_column_keyword`

**What it does:** Tests three filenames containing multi-column layout keywords (`"journal_article.pdf"`, `"newsletter_march.pdf"`, `"magazine_issue.pdf"`) and asserts each resolves to `PDF_PROFILE_MULTICOLUMN`.

**Why it matters:** Multi-column PDFs use `strategy="fast"` which handles column reflow better than `"auto"` for layouts like academic papers and newsletters. Using the wrong strategy on these documents often produces text that interleaves columns.

**Expected result:** All three → `PDF_PROFILE_MULTICOLUMN`

---

#### TEST 57 — `test_resolve_unknown_filename_returns_auto`

**What it does:** Clears the `PDF_DEFAULT_PROFILE` environment variable, then calls `_resolve_pdf_profile("generic_report.pdf", None)` and asserts the result is `PDF_PROFILE_AUTO`.

**Why it matters:** For documents with no recognisable keywords, the system must fall back to the safe default (`"pdf_auto"`) rather than using a stale or undefined value. The `monkeypatch.delenv` ensures the test is not affected by any environment variable that may be set in the CI environment.

**Expected result:** `PDF_PROFILE_AUTO` (`"pdf_auto"`)

---

#### TEST 58 — `test_resolve_env_override_respected`

**What it does:** Sets `PDF_DEFAULT_PROFILE=pdf_multicolumn` via `monkeypatch.setenv`, then parses a generic filename and asserts the profile is `PDF_PROFILE_MULTICOLUMN`.

**Why it matters:** Operators can configure a deployment-wide default profile via the `PDF_DEFAULT_PROFILE` environment variable, overriding the hardcoded `"pdf_auto"` fallback. This is useful when all documents in an organisation follow the same format. This test confirms that environment variable is respected.

**Expected result:** `PDF_PROFILE_MULTICOLUMN` (`"pdf_multicolumn"`)

---

#### TEST 59 — `test_resolve_invalid_env_override_falls_back_to_auto`

**What it does:** Sets `PDF_DEFAULT_PROFILE=not_a_real_profile` via `monkeypatch.setenv`, then parses a generic filename and asserts the result falls back to `PDF_PROFILE_AUTO`.

**Why it matters:** A misconfigured or misspelled `PDF_DEFAULT_PROFILE` environment variable must not crash the parser or silently select an arbitrary profile. The code validates the env value against `PDF_PARSE_PROFILES` and falls back to `"pdf_auto"` if invalid.

**Expected result:** `PDF_PROFILE_AUTO` (`"pdf_auto"`)

---

## What Is Not Covered by Unit Tests

The following areas are intentionally excluded from unit testing because they require live external services. They are covered by higher-level integration and smoke tests.

| Area | Reason |
|---|---|
| Database queries (`asyncpg`, SQLModel sessions) | Requires live PostgreSQL |
| Celery task execution (`worker.py`) | Requires Redis broker |
| Qdrant vector operations | Requires Qdrant service |
| `unstructured` document parsing | Requires the `unstructured` library and system dependencies (Tesseract, Poppler) |
| Full HTTP request/response cycles | Covered by Docker smoke tests in CI |
| S3 plugin sync operations | Requires AWS credentials and bucket |
