# AWIL Assessment Demo

This is a fullstack demo for the assessment, using Node.js (Express) + MySQL + EJS + Chart.js.

## Features

- **Excel to MySQL**: Import spreadsheet (themes, subthemes, categories, names + “x” mapping) into database
- **Front portal**: User selects theme → subtheme → category, then gets a random name in that category (plus count)
- **Admin portal**: Login required (user: `apple`, password: `apple`)
  - Table list (filter columns, search, add/remove theme/subtheme/category/name)
  - “Assign X” management (assign/unassign names to categories)
  - All changes update the database in real time
- **Data visualization**: Bar and pie charts of data (using Chart.js)
- **Deployable**: Can be hosted on Railway, Render, or other platforms

## Getting Started

### 1. Install dependencies

```bash
npm install
2. Set up database
	•	Import all tables in /init.sql or run provided scripts.
	•	Import Excel data to MySQL (see /import_excel.py).

3. Configure DB
	•	Set environment variables in .env:
DB_HOST=xxx
DB_USER=xxx
DB_PASSWORD=xxx
DB_DATABASE=tool_set
DB_PORT=3306

4. Run locally
node server.js

5. Admin login
	•	Username: apple
	•	Password: apple

Deploy
	•	Deploy to Railway or Render. Set environment variables as above.
