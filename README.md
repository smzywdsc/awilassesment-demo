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

