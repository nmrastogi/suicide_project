// Global state for scroll map
let rawData = [];
let processedData = {};
let usStates = null;
let scrollMetric = 'deaths';
let currentScrollYear = 2014;
let colorScale = null;

// State name mapping for TopoJSON
const stateNameMap = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
    'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
    'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
    'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
    'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
    'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
    'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
    'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Initialize the scroll map
async function init() {
    await loadData();
    await loadMap();
    setupScrollMap();
    updateColorScale();
    renderScrollMap();
    setupScrollListener();
}

// Load and parse CSV data
async function loadData() {
    try {
        const response = await fetch('data-table.csv');
        const csvText = await response.text();
        rawData = d3.csvParse(csvText, d => {
            return {
                year: +d.Year,
                state: d.State,
                deaths: +d.Deaths,
                rate: +d['Age Adjusted Rate'],
                url: d.URL
            };
        });

        // Process data for efficient lookup
        processedData = {
            byState: {},
            byYear: {},
            allStates: [...new Set(rawData.map(d => d.state))].sort(),
            allYears: [...new Set(rawData.map(d => d.year))].sort()
        };

        rawData.forEach(d => {
            // Group by state
            if (!processedData.byState[d.state]) {
                processedData.byState[d.state] = [];
            }
            processedData.byState[d.state].push(d);

            // Group by year
            if (!processedData.byYear[d.year]) {
                processedData.byYear[d.year] = [];
            }
            processedData.byYear[d.year].push(d);
        });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load US states TopoJSON
async function loadMap() {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
        const us = await response.json();
        usStates = topojson.feature(us, us.objects.states);
    } catch (error) {
        console.error('Error loading map:', error);
        // Fallback
        try {
            const response = await fetch('https://raw.githubusercontent.com/topojson/us-atlas/master/states-10m.json');
            const us = await response.json();
            usStates = topojson.feature(us, us.objects.states);
        } catch (error2) {
            console.error('Error loading map from fallback:', error2);
        }
    }
}

// Setup scroll map controls
function setupScrollMap() {
    // Metric toggle
    d3.selectAll('#scroll-metric-toggle .toggle-btn').on('click', function() {
        d3.selectAll('#scroll-metric-toggle .toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        scrollMetric = d3.select(this).attr('data-metric');
        updateColorScale();
        renderScrollMap();
    });
}

// Setup scroll listener
function setupScrollListener() {
    let ticking = false;
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateYearFromScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Initial update
    updateYearFromScroll();
}

// Update year based on scroll position
function updateYearFromScroll() {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollableHeight = documentHeight - windowHeight;
    
    // Calculate scroll percentage (0 to 1)
    const scrollPercent = scrollableHeight > 0 
        ? Math.min(Math.max(scrollPosition / scrollableHeight, 0), 1)
        : 0;
    
    // Map scroll percentage to year range (2014 to 2023)
    const yearRange = processedData.allYears[processedData.allYears.length - 1] - processedData.allYears[0];
    const yearIndex = Math.round(scrollPercent * yearRange);
    const newYear = processedData.allYears[0] + yearIndex;
    
    if (newYear !== currentScrollYear) {
        currentScrollYear = newYear;
        renderScrollMap();
    }
}

// Update color scale based on all years data
function updateColorScale() {
    const allYearsData = processedData.allYears.flatMap(year => 
        processedData.byYear[year] || []
    );
    const values = allYearsData.map(d => scrollMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([min, max]);
}

// Render scroll map
function renderScrollMap() {
    if (!usStates) {
        return;
    }

    const container = d3.select('.sticky-map-section');
    const width = Math.min(1200, window.innerWidth * 0.9);
    const height = Math.max(600, width * 0.6);

    const svg = d3.select('#scroll-map-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    // Update color scale if needed
    if (!colorScale) {
        updateColorScale();
    }

    const projection = d3.geoAlbersUsa()
        .fitSize([width - 40, height - 40], usStates);

    const path = d3.geoPath().projection(projection);

    const currentData = processedData.byYear[currentScrollYear] || [];
    const dataMap = new Map(currentData.map(d => [d.state, d]));

    const featuresWithData = usStates.features.map(feature => {
        const stateName = feature.properties.name;
        const data = dataMap.get(stateName);
        return { feature, stateName, data };
    });

    // Draw paths
    svg.append('g')
        .selectAll('path')
        .data(featuresWithData)
        .enter()
        .append('path')
        .attr('class', 'state-path')
        .attr('d', d => path(d.feature))
        .attr('fill', d => {
            if (!d.data) return '#e0e0e0';
            const value = scrollMetric === 'deaths' ? d.data.deaths : d.data.rate;
            return colorScale(value);
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            if (d.data) {
                showTooltip(event, {
                    title: d.stateName,
                    items: [
                        { label: 'Year', value: currentScrollYear },
                        { label: 'Deaths', value: d.data.deaths.toLocaleString() },
                        { label: 'Age Adjusted Rate', value: d.data.rate.toFixed(2) }
                    ]
                });
            }
            d3.select(this).attr('stroke-width', 2.5);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('stroke-width', 1.5);
        });

    // Add state labels
    svg.append('g')
        .selectAll('.state-label-group')
        .data(featuresWithData)
        .enter()
        .append('g')
        .attr('class', 'state-label-group')
        .attr('pointer-events', 'none')
        .attr('transform', d => {
            const centroid = path.centroid(d.feature);
            return `translate(${centroid[0]}, ${centroid[1]})`;
        })
        .each(function(d) {
            const g = d3.select(this);
            
            // Background circle
            g.append('circle')
                .attr('class', 'state-label-bg')
                .attr('r', 12)
                .attr('fill', 'white')
                .attr('fill-opacity', 0.85)
                .attr('stroke', 'rgba(0, 0, 0, 0.2)')
                .attr('stroke-width', '0.5px');

            // Text
            g.append('text')
                .attr('class', 'state-label')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .attr('fill', '#1a1a1a')
                .text(() => {
                    const stateAbbr = stateNameMap[d.stateName] || d.stateName.substring(0, 2).toUpperCase();
                    return stateAbbr;
                });
        });

    // Update year display
    d3.select('#scroll-year-display').text(currentScrollYear);
    const yearIndex = processedData.allYears.indexOf(currentScrollYear) + 1;
    d3.select('#scroll-year-progress').text(
        `Year ${yearIndex} of ${processedData.allYears.length} (${processedData.allYears[0]}-${processedData.allYears[processedData.allYears.length - 1]})`
    );

    // Update legend
    renderScrollLegend();
}

// Render legend
function renderScrollLegend() {
    const legend = d3.select('#scroll-map-legend');
    legend.selectAll('*').remove();

    const allYearsData = processedData.allYears.flatMap(year => 
        processedData.byYear[year] || []
    );
    const values = allYearsData.map(d => scrollMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    legend.append('div')
        .attr('class', 'legend-title')
        .text(scrollMetric === 'deaths' ? 'Total Deaths' : 'Age Adjusted Rate');

    const gradient = legend.append('div')
        .attr('class', 'legend-scale');

    const svg = gradient.append('svg')
        .attr('width', 200)
        .attr('height', 20);

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'scroll-legend-gradient');

    const stops = 10;
    for (let i = 0; i <= stops; i++) {
        const value = min + (max - min) * (i / stops);
        const color = colorScale(value);
        linearGradient.append('stop')
            .attr('offset', `${(i / stops) * 100}%`)
            .attr('stop-color', color);
    }

    svg.append('rect')
        .attr('width', 200)
        .attr('height', 20)
        .attr('fill', 'url(#scroll-legend-gradient)')
        .attr('stroke', '#ccc')
        .attr('rx', 4);

    const labels = legend.append('div')
        .attr('class', 'legend-labels');

    labels.append('span').text(min.toFixed(scrollMetric === 'deaths' ? 0 : 1));
    labels.append('span').text(max.toFixed(scrollMetric === 'deaths' ? 0 : 1));
}

// Tooltip functions
function showTooltip(event, data) {
    const tooltip = d3.select('#tooltip');
    tooltip.selectAll('*').remove();

    tooltip.append('div')
        .attr('class', 'tooltip-title')
        .text(data.title);

    data.items.forEach(item => {
        tooltip.append('div')
            .attr('class', 'tooltip-item')
            .text(`${item.label}: ${item.value}`);
    });

    tooltip.classed('visible', true);
    moveTooltip(event);
}

function moveTooltip(event) {
    const tooltip = d3.select('#tooltip');
    const x = event.clientX;
    const y = event.clientY;
    const tooltipNode = tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = x + 15;
    let top = y + 15;
    
    if (left + tooltipRect.width > windowWidth) {
        left = x - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > windowHeight) {
        top = y - tooltipRect.height - 15;
    }
    
    if (left < 0) left = 10;
    if (top < 0) top = 10;
    
    tooltip
        .style('left', `${left}px`)
        .style('top', `${top}px`);
}

function hideTooltip() {
    d3.select('#tooltip').classed('visible', false);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
