# Engineering Manifest

## Project Setup

### Requirements
- **Node.js**
- **PostgreSQL**
- **TypeScript**

---

### Installation
To install the dependencies:
```bash
$ npm install
```

---

### Running the App
To start the application:
```bash
$ npm run start
```

---

### Installing Packages
- For development dependencies:
```bash
$ npm i --save-dev <package>
```
- For regular dependencies:
```bash
$ npm i <package>
```

---

## Folder Structure

### Overview
The application is structured for modularity, scalability, and maintainability.

```plaintext
src/
├── common/
│   ├── interfaces/       # Shared interface definitions
│   ├── messages/         # ADMIN and internal messages
│       ├── internal/
│       ├── admin/
│       └── index.ts
├── config/
│   ├── ConfigConstant.ts # Application configuration constants
│   ├── Constant.ts       # General constants
│   ├── DatabaseHandler.ts # Database connection logic
│   ├── EnvHandler.ts     # Environment variable handler
│   ├── Init.ts           # Initialization logic
│   └── index.ts
├── controllers/
│   ├── admin/
│       ├── auth/
│           ├── App.ts   # Authentication logic
│           └── index.ts
├── core/
│   ├── interfaces/
│       ├── config.interface.ts # Config-related interfaces
│   ├── Config.ts        # Core configuration handler
│   ├── Kit.ts           # Core utility toolkit
│   └── index.ts
├── cron/
│   ├── daily-update/
│       ├── MailSend.ts                            # Every 1 hours update task
│       ├── NotificationSend.ts                    # Every 1 hours update task
│       └── index.ts
│   └── index.ts
├── data/
│   ├── Countries.ts     # Country-related data
│   └── index.ts
├── middleware/
│   ├── AllowOrigin.ts   # Middleware for setting CORS headers
│   ├── AdminAuth.ts     # ADMIN authentication middleware
│   ├── BodyTrimmer.ts   # Middleware to trim request bodies
│   └── UserAuth.ts      # User authentication middleware
├── models/
│   ├── user/
│       ├── interfaces/  # User model interfaces
│       ├── User.ts      # User entity definition
│       └── index.ts
│   ├── DaoPlugin.ts     # Shared CRUD/pagination statics, applied to every model's schema
│   ├── Filters.ts       # Query filters for models
│   └── index.ts
├── routes/
│   ├── config/
│       ├── Constant.ts  # Route-specific constants
│   ├── Admin.ts         # Admin route definitions
│   ├── Api.ts           # Api route definitions
│   └── index.ts
├── services/
│   ├── client/          # Client-related services
│   ├── mail/            # Mail services
│   ├── media/           # Media-related services
│   └── token/           # Token handling services
├── utils/
│   ├── Arrays.ts        # Utility functions for arrays
│   ├── Dates.ts         # Utility functions for date handling
│   ├── Error.ts         # Error handling utilities
│   ├── Log.ts           # Logging utilities
│   ├── Sanitize.ts      # Sanitize utilities
│   └── Values.ts        # Utility functions for value manipulation
├── views/
│   ├── email/
│       ├── master/
│           ├── layout.ejs # Layout partial for email templates
│       ├── login-otp.ejs  # Login OTP email template
│       └── master.ejs
├── app.ts              # Main application entry point
storage/                # External files or temporary storage
.env                    # Environment configuration file
index.ts                # Entry point for starting the server
package.json            # Project metadata and dependencies
tsconfig.json           # TypeScript configuration
```

---

## Coding Standards

### Code Format
- **Auto-formatting is prohibited.**

### Naming Conventions
- **Folder Names**: kebab-case  
- **File Names**: PascalCase  
- **Class Names**: PascalCase  
- **Variable Names**: camelCase  
- **Method Names**: camelCase  

### API Naming and Routes
- Use **camelCase** for API names.  
- Group routes logically. Example:  
  ```
  auth/sign-up
  auth/sign-up/otp/verify
  auth/sign-up/otp/resend
  user/profile/update-details
  ```

### Code Comments
- Use block comments with clear markers. Example:
```typescript
// Comment start {
   // Your code here...
// } Comment end
```
- Add comments for **constant variables.**

### Cleanup
- **Remove unused code.**  
- Keep **backup files separate** and **do not push backups.**

---

## Module Import Order
1. **NPM Packages**  
2. **Models** (Mongoose models - CRUD/pagination statics live on the model itself, see `DaoPlugin.ts`)
3. **Helpers**  
4. **Services**  
5. **Others**:
   - Constants
   - Messages
   - Config
6. **Interfaces**

---

## Postman API Guidelines

### Folder Structure
- Use **camelCase** with spaces for folder names.  
- Name requests with **camelCase and spaces**.  

### Save Responses
- Save sample responses for reference.

---

## Git Management

### Branching Strategy
- **Live Branch**: `main`  
- **Staging Branch**: `dev`

#### Branch Naming
- Use **camelCase** with slashes `/`. Example:  
  - `api/user/auth`  
  - `feature/core-module`

### Development Process
1. Pull the latest changes from `dev`:  
   ```bash
   git pull origin dev
   ```
2. Create a new branch:  
   ```bash
   git checkout -b <new-branch-name>
   ```

### Code Push Process
1. Stage and stash changes:
   ```bash
   git status
   git add .
   git stash
   ```
2. Commit changes:
   ```bash
   git commit -m "Your message"
   ```
3. Pull latest from `main`:
   ```bash
   git pull origin main
   ```
4. Apply stashed changes:
   ```bash
   git stash apply
   ```
5. Push changes to the new branch:
   ```bash
   git push origin <branch-name>
   ```

---

## <span style="color: #A91D3A;">Important Notes</span>
- <span style="color: #A91D3A;">Do not reuse credentials, project names, or logos from old projects.</span>
- <span style="color: #A91D3A;">Do not push sensitive data or credentials to Git or make them public.</span> 
- <span style="color: #A91D3A;">Maintain strict confidentiality for project-related information.</span>
