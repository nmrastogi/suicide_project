# US Suicide Statistics Visualization

An interactive web visualization showcasing suicide statistics by US state from 2014-2023.

## Features

### Main Dashboard (`index.html`)
- **Interactive Choropleth Map**: Color-coded US map showing suicide statistics by state with state name labels (abbreviations like CA, AZ, etc.)
- **Time Series Chart**: Trends over time with support for comparing multiple states
- **Bar Chart**: State-by-state comparison for the selected year
- **Year Slider**: Filter data by year (2014-2023)
- **State Filter**: Multi-select dropdown to focus on specific states
- **Metric Toggle**: Switch between Total Deaths and Age Adjusted Rate (defaults to Age Adjusted Rate)
- **Age-Adjusted Rate Definition**: Clear explanation of what age-adjusted rate means and why it's used
- **Comparison Mode**: Enable side-by-side comparison of multiple states
- **Interactive Tooltips**: Hover over any element for detailed information

### Additional Visualizations

- **Race Visualizations** (`race-combined.html`): Combined page featuring both:
  - **Bar Chart Race**: Animated ranking of states over time with smooth transitions
  - **Line Graph Race**: Select states and watch animated line graphs showing trends from 2014-2023
  - Toggle between views, with independent controls for each visualization

- **Animated Map** (`animated-map.html`): Watch state colors change over time with automatic year progression. Features a compact year indicator at the top and play/pause controls.

- **Scroll Map** (`scroll-map.html`): Scroll-based visualization where the map updates automatically as you scroll down the page, progressing through years from 2014 to 2023.

- **Scatter Plot** (`scatter-plot.html`): Explore the relationship between Total Deaths and Age Adjusted Rate with year filters and optional trend lines.

- **Heatmap** (`heatmap.html`): Comprehensive State × Year overview with color-coded intensity, sortable by state or year.

- **Percentage Change** (`percentage-change.html`): Visualize which states increased or decreased most from 2014 to 2023 with detailed change metrics.

## Getting Started

### Local Development

1. **Using a Local Server** (Recommended):
   - Python 3: `python -m http.server 8000`
   - Python 2: `python -m SimpleHTTPServer 8000`
   - Node.js: `npx http-server`
   - VS Code: Use the "Live Server" extension

2. Open your browser and navigate to `http://localhost:8000`

### Direct File Access

Due to CORS restrictions, you cannot simply open `index.html` directly in a browser. You must use a local web server.

## Usage

### Main Dashboard
1. **Select a Year**: Use the year slider to view data for a specific year
2. **Choose a Metric**: Toggle between "Total Deaths" and "Age Adjusted Rate" (defaults to Age Adjusted Rate)
3. **Read the Definition**: The age-adjusted rate definition is displayed when that metric is selected
4. **Filter States**: Use the state dropdown to focus on specific states (hold Ctrl/Cmd to select multiple)
5. **Enable Comparison Mode**: Check the comparison mode checkbox, then click states on the map to compare them
6. **Hover for Details**: Move your mouse over any visualization element to see detailed information

### Additional Visualizations

- **Race Visualizations**: Click "Open Race Visualizations in New Page" to access the combined bar chart race and line graph race. Toggle between the two views using the buttons at the top. Each visualization has its own controls for play/pause, speed adjustment, metric selection, and state filtering.

- **Animated Map**: Click "Open Animated Map" to see an automatically progressing map showing year-by-year changes. The year indicator is displayed at the top center. Use play/pause controls and adjust the speed as needed.

- **Scroll Map**: Click "Open Scroll Map" to experience a scroll-driven visualization. Simply scroll down the page and watch the map update year by year from 2014 to 2023. The year updates automatically based on your scroll position.

- **Scatter Plot**: Explore relationships between metrics with year filters and optional trend lines.

- **Heatmap**: View all states and years simultaneously with sortable options.

- **Percentage Change**: See which states changed most from 2014 to 2023 with detailed change metrics.

## Data Source

The visualization uses data from `data-table.csv` with the following columns:
- Year (2014-2023)
- State (all 50 US states + DC)
- Deaths (total number of deaths)
- Age Adjusted Rate (per 100,000 population, adjusted for age distribution)
- URL (reference link)

## Age-Adjusted Rate

**Definition**: The age-adjusted rate is the number of deaths per 100,000 population, standardized to account for differences in age distribution between states. This statistical adjustment allows for fair comparisons across states with varying age demographics, as older populations typically have higher mortality rates. The rate is calculated using a standard population age distribution, ensuring that differences in rates reflect actual health outcomes rather than differences in population age structure.

All visualizations default to showing the Age Adjusted Rate metric, as it provides a more accurate comparison across states.

## Technology Stack

- **D3.js v7**: For data visualization and map rendering
- **TopoJSON**: For US state boundaries
- **Vanilla JavaScript**: No build tools required
- **Modern CSS**: Responsive design with CSS Grid and Flexbox

## Browser Compatibility

Works best in modern browsers (Chrome, Firefox, Safari, Edge) that support:
- ES6+ JavaScript features
- SVG rendering
- CSS Grid and Flexbox

## File Structure

```
data_viz_sui/
├── index.html              # Main dashboard
├── script.js               # Main dashboard logic
├── styles.css              # Shared styles
├── animated-map.html       # Animated map visualization
├── animated-map.js         # Animated map logic
├── scroll-map.html         # Scroll-based map visualization
├── scroll-map.js           # Scroll map logic
├── race-combined.html      # Combined bar chart race and line graph race
├── race-combined.js        # Combined race visualizations logic
├── bar-race.html           # Bar chart race (standalone)
├── bar-race.js             # Bar chart race logic (standalone)
├── line-race.html          # Line graph race (standalone)
├── line-race.js            # Line graph race logic (standalone)
├── scatter-plot.html       # Scatter plot visualization
├── scatter-plot.js         # Scatter plot logic
├── heatmap.html            # Heatmap visualization
├── heatmap.js              # Heatmap logic
├── percentage-change.html  # Percentage change visualization
├── percentage-change.js    # Percentage change logic
├── data-table.csv          # Data source (REQUIRED)
└── README.md               # This file
```

## Deployment

This is a static website that can be deployed to:
- **GitHub Pages** (Recommended): See deployment instructions below
- Netlify
- Vercel
- Any static hosting service

### GitHub Pages Deployment

1. Create a GitHub repository
2. Push all files to the repository
3. Go to Settings → Pages
4. Select "Deploy from a branch" → Choose `main` branch and `/ (root)` folder
5. Your site will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

**Important**: Make sure `data-table.csv` is included in your repository as it's required for all visualizations. The CSV file must be in the root directory.

## Key Features

- **Default Metric**: All visualizations default to "Age Adjusted Rate" for better state-to-state comparisons
- **State Labels on Maps**: All maps display state abbreviations (CA, AZ, etc.) with readable labels
- **Animated Visualizations**: Multiple animated views showing temporal changes
- **Interactive Controls**: Play/pause, speed adjustment, and filtering options
- **Multiple View Types**: Maps, charts, races, scatter plots, heatmaps, and change analysis
- **Scroll-Based Interaction**: Unique scroll-driven map visualization
- **Combined Visualizations**: Bar chart race and line graph race available on a single page
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **No Build Required**: Pure HTML, CSS, and JavaScript - just open and view
- **Educational Content**: Clear definitions and explanations of metrics

## Notes

- The map uses US state boundaries loaded from a CDN (TopoJSON)
- All data is loaded from the local CSV file (`data-table.csv`)
- All visualizations are fully responsive and work on mobile devices
- State name abbreviations are automatically mapped for better readability
- Color scales are optimized for accessibility and visual clarity
- All visualizations start with "Age Adjusted Rate" as the default metric
- The age-adjusted rate definition is displayed on the main dashboard when that metric is selected