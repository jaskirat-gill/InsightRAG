## Tester task list - Peer Testing
**Group Name** OpenWebUI Group B
---

### Test case 1: [Create end user]

#### Steps to test
1. Navigate to the login page
2. Select "Create one"
3. Fill in Email and Password (Full Name is optional)
4. Click "Create Account"
5. Automatically redirected to login page after create successfully (Expected Behavior 1,2,3)
6. Login with credentials by clicking "Sign In" (Expected Behavior 4)

#### Expected Behavior
1. Should be able to successfully create user
2. After user is create successfully, should be redirected to login page
3. The login credentials should be automatically filled with the just created account
4. Should be able to successfully signin with the correct credentials

---

### Test case 2: [Login as developer]

#### Steps to test
1. Navigate to the login page
2. Login with the credentials you just created (Expected Behavior 1,2,3,4)

#### Expected Behavior
1. Should see your full name and your role
![Alt text](/test/testcase2.png)
2. Should see "Knowledge Bases", "Chat Interface", "Analytics" displayed corrected
![Alt text](/test/testcase2-func.png)
3. Should see the bottom navigation bar with the functionalities, when mouse are placed on the icons, the corresponding name should pop up
![Alt text](/test/testcase2-bottom.png)
4. Should be able to interact with the functionalities as a developer

---

### Test case 3: [Log out]

#### Steps to test
1. Click on "Logout" button on the bottom navigation bar (Expected Behavior 1)
![Alt text](/test/testcase3.png) 

#### Expected Behavior
1. Should succesfsfully been logout from the account and redirected to the login page

---

### Test case 4: [Admin and Knowledge Bases]

#### Steps to test
1. Navigate to the login page
2. Login with the credentials: 
    Email:admin@example.com
    Password:Admin123!
3. Click "Sign In" (Expected Behavior 1)
4. Click "Knowledge Bases" (Expected Behavior 2,3)
5. Click "Search knowledge bases..." and type in "Personal Notes" (Expected Behavior 4)
6. Click "+ Create New" on the top right corner (Expected Behavior 5)
7. Click "Create Knowledge Bases" (Expcected Behavior 6)
![Alt text](/test/testcase4-create.png)
8. Click on a the "Product Documentation" document (Expected Behavior 7)
![Alt text](/test/testcase4-prod.png)
9. Click on "API Authentication Guide" document
![Alt text](/test/testcase4-guide.png)

#### Expected Behavior
1. Should see the role dispalyed as admin
![Alt text](/test/testcase4-admin.png)
2. Should see the document collections in Knowledge Bases
3. Should see the health status, documents count, size, and last sync time for the document collections
![Alt text](/test/testcase4-doc.png)
4. Should be able to search for specific documentations
![Alt text](/test/testcase4-search.png)
5. Should see a popup to Create Knowledge Base and should be able to fill in different fields and should be able to click "Cancel" and return to the Knowledge Bases page
![Alt text](/test/testcase4-pop.png)
6. Should see the new document collection created with the created name, health status, documents count, size, and lasy synced.
![Alt text](/test/testcase4-new.png)
7. Should see all the related field to the document displaying 
![Alt text](/test/testcase4-test.png)
8. Should see all the related field to the document displaying with all the button clickable. All the information are currently stubbed, but should be able to view all the related functionalities and how they will display (Overview, Strategy, Chunks, Health, and Document View)
![Alt text](/test/testcase4-detail.png)

---

### Test case 5: [Settings - Plugin]

#### Steps to test
1. Click on "Settings" in the bottom navigation bar (Expected Behavior 1)
![Alt text](/test/testcase5-icon.png)
2. Click on "Plugins" (Expected Behavior 2)
3. Click on "+ Add Plugin" (Expected Behavior 3)
4. After filling in correct credentials for bucket name, aws region, access key id, secret access key, connection should be established after click on "Save Changes" (Expected Behavior 4)
5. Click on "Save Changes" and changes should be saved (Expected Behavior 5)
6. This establishes KB-mapping

#### Expected Behavior
1. Settings page should slide out from the right and should be able to interact with "General" and "Plugins"
![Alt text](/test/testcase5-settings.png)
2. Plugins should show page as
![Alt text](/test/testcase5-plugin.png)
3. A dropdown selection for Plugin should show when trying to add plugin
![Alt text](/test/testcase5-s3.png)
4. Should be able to save changes and test connection
![Alt text](/test/testcase5-connection.png)
5. After refreshing page and navigate back to "Plugins", the S3 Plugin should be saved. 

---

### Test Case 6.1 / 6.2 – Either Applicable
### Test case 6.1: [Chat] 
#### Steps to test
1. Click on "Chat" in the bottom navigation bar (Expected Behavior 1)
![Alt text](/test/testcase6-icon.png)

2. In the top-left corner, select the model and MCP server. The MCP server is connected to our knowledge base, and this setting allows the LLM to access our knowledge base. (Expected Behavior 2)
![Alt text](/test/testcase6-model-and-mcp.png)

3. Chat with the LLM to query the knowledge base. (Expected Behavior 3)
![Alt text](/test/testcase6-chat-box.png)

#### Expected Behavior
1. You should be presented with the chat interface.
2. You should be able to select the pre-configured models and MCP servers.
3. You should be able to get answers that include knowledge stored in our knowledge base, with references. (We recommend using the prompt "search about box filter".)
![Alt text](/test/testcase6-kb-response.png)

---

### Test case 6.2 [using MCP server in third party app]
#### Steps to test
1. Open the third party LLM deaktop that allow local mcp connection, in this example, Claude desktop are used.
2. Set up the mcp connection and make sure it is running
![alt text](/test/testcase6.2-claude-mcp-set-up.png)
3. Ask question inside claude desktop 

#### Expected Behaviour
You should be able to get answers that include knowledge stored in our knowledge base, with references.
![alt text](/test/testcase6.2-expected-answer.png)