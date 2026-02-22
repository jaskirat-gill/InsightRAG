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
8. Click on "Test"


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

### Test case 6: [Chat]

#### Steps to test
1. Click on "Chat" in the bottom navigation bar
![Alt text](/test/testcase6-icon.png)

#### Expected Behavior
1. !!! (Wait for Shibo's implementation)

---

### Test case 8: []

#### Steps to test
1. 

#### Expected Behavior
1. 

---

### Test case 9: [MCP server - Claude]

#### Steps to test
1. 
#### Expected Behavior
1. 

---