// Global state
let rawData = [];
let processedData = {};
let usStates = null;
let selectedYear = 2014;
let selectedMetric = 'deaths';
let selectedStates = new Set();
let comparisonMode = false;
let colorScale = null;
let scrollMetric = 'deaths';
let currentScrollStateIndex = 0;

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

// Initialize the application
async function init() {
    await loadData();
    await loadMap();
    setupControls();
    updateAllVisualizations();
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

        // Initialize selected states to all states
        selectedStates = new Set(processedData.allStates);
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
        // Fallback: try alternative CDN
        try {
            const response = await fetch('https://raw.githubusercontent.com/topojson/us-atlas/master/states-10m.json');
            const us = await response.json();
            usStates = topojson.feature(us, us.objects.states);
        } catch (error2) {
            console.error('Error loading map from fallback:', error2);
        }
    }
}

// Setup all interactive controls
function setupControls() {
    // Year slider
    const yearSlider = d3.select('#year-slider');
    const yearDisplay = d3.select('#year-display');
    
    yearSlider.on('input', function() {
        selectedYear = +this.value;
        yearDisplay.text(selectedYear);
        updateAllVisualizations();
    });

    // Metric toggle
    d3.selectAll('.toggle-btn').on('click', function() {
        d3.selectAll('.toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        selectedMetric = d3.select(this).attr('data-metric');
        
        // Show/hide age-adjusted rate explanation
        const rateInfo = d3.select('#rate-info');
        if (selectedMetric === 'rate') {
            rateInfo.style('display', 'block');
        } else {
            rateInfo.style('display', 'none');
        }
        
        updateAllVisualizations();
    });

    // Comparison mode
    d3.select('#comparison-mode').on('change', function() {
        comparisonMode = this.checked;
        updateAllVisualizations();
    });

    // State filter dropdown
    const stateSelect = d3.select('#state-filter');
    processedData.allStates.forEach(state => {
        stateSelect.append('option')
            .attr('value', state)
            .text(state)
            .property('selected', true);
    });

    stateSelect.on('change', function() {
        selectedStates = new Set(Array.from(this.selectedOptions).map(opt => opt.value));
        updateAllVisualizations();
    });

    // Select all / Clear all buttons
    d3.select('#select-all-states').on('click', function() {
        processedData.allStates.forEach(state => {
            const option = stateSelect.select(`option[value="${state}"]`);
            option.property('selected', true);
        });
        selectedStates = new Set(processedData.allStates);
        updateAllVisualizations();
    });

    d3.select('#clear-all-states').on('click', function() {
        stateSelect.selectAll('option').property('selected', false);
        selectedStates = new Set();
        updateAllVisualizations();
    });

    // Open bar chart race in new page
    d3.select('#open-race-btn').on('click', function() {
        window.open('bar-race.html', '_blank');
    });

    // Open animated map in new page
    d3.select('#open-animated-map-btn').on('click', function() {
        window.open('animated-map.html', '_blank');
    });

    // Open line graph race in new page
    d3.select('#open-line-race-btn').on('click', function() {
        window.open('line-race.html', '_blank');
    });
}

// Update all visualizations
function updateAllVisualizations() {
    updateColorScale();
    renderMap();
    renderTimeSeries();
    renderBarChart();
}

// Update color scale based on selected metric
function updateColorScale() {
    const currentData = processedData.byYear[selectedYear] || [];
    const values = currentData.map(d => selectedMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    // Reverse domain so higher values = redder (darker), lower values = yellower (lighter)
    colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([min, max]);
}

// Render choropleth map
function renderMap() {
    if (!usStates) {
        d3.select('#map-loading').style('display', 'block');
        return;
    }

    d3.select('#map-loading').style('display', 'none');

    const container = d3.select('#map-container');
    const width = container.node().getBoundingClientRect().width;
    const height = Math.max(500, width * 0.6);

    const svg = d3.select('#map-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    const projection = d3.geoAlbersUsa()
        .fitSize([width - 40, height - 40], usStates);

    const path = d3.geoPath().projection(projection);

    const currentData = processedData.byYear[selectedYear] || [];
    const dataMap = new Map(currentData.map(d => [d.state, d]));

    const featuresWithData = usStates.features.map(feature => {
        const stateName = feature.properties.name;
        const data = dataMap.get(stateName);
        return { feature, stateName, data };
    });

    svg.append('g')
        .selectAll('path')
        .data(featuresWithData)
        .enter()
        .append('path')
        .attr('class', d => {
            let classes = 'state-path';
            if (selectedStates.has(d.stateName)) {
                classes += ' selected';
            }
            return classes;
        })
        .attr('d', d => path(d.feature))
        .attr('fill', d => {
            if (!d.data) return '#e0e0e0';
            const value = selectedMetric === 'deaths' ? d.data.deaths : d.data.rate;
            return colorScale(value);
        })
        .on('mouseover', function(event, d) {
            if (d.data) {
                showTooltip(event, {
                    title: d.stateName,
                    items: [
                        { label: 'Year', value: selectedYear },
                        { label: 'Deaths', value: d.data.deaths.toLocaleString() },
                        { label: 'Age Adjusted Rate', value: d.data.rate.toFixed(2) }
                    ]
                });
            }
            d3.select(this).raise();
        })
        .on('mousemove', function(event) {
            moveTooltip(event);
        })
        .on('mouseout', function() {
            hideTooltip();
        })
        .on('click', function(event, d) {
            if (comparisonMode && d.data) {
                toggleStateSelection(d.stateName);
            }
        });

    // Add state labels with backgrounds
    const labelGroups = svg.append('g')
        .selectAll('.state-label-group')
        .data(featuresWithData)
        .enter()
        .append('g')
        .attr('class', 'state-label-group')
        .attr('pointer-events', 'none')
        .attr('transform', d => {
            const centroid = path.centroid(d.feature);
            return `translate(${centroid[0]}, ${centroid[1]})`;
        });

    // Add background circle
    labelGroups.append('circle')
        .attr('class', 'state-label-bg')
        .attr('r', 12)
        .attr('fill', 'white')
        .attr('fill-opacity', 0.85)
        .attr('stroke', 'rgba(0, 0, 0, 0.2)')
        .attr('stroke-width', '0.5px');

    // Add text
    labelGroups.append('text')
        .attr('class', 'state-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1a1a1a')
        .text(d => {
            const stateAbbr = stateNameMap[d.stateName] || d.stateName.substring(0, 2).toUpperCase();
            return stateAbbr;
        });

    // Render legend
    renderMapLegend();
}

// Render map legend
function renderMapLegend() {
    const legend = d3.select('#map-legend');
    legend.selectAll('*').remove();

    const currentData = processedData.byYear[selectedYear] || [];
    const values = currentData.map(d => selectedMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    legend.append('div')
        .attr('class', 'legend-title')
        .text(selectedMetric === 'deaths' ? 'Total Deaths' : 'Age Adjusted Rate');

    const gradient = legend.append('div')
        .attr('class', 'legend-scale');

    const svg = gradient.append('svg')
        .attr('width', 200)
        .attr('height', 20);

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', 'legend-gradient');

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
        .attr('fill', 'url(#legend-gradient)')
        .attr('stroke', '#ccc')
        .attr('rx', 4);

    const labels = legend.append('div')
        .attr('class', 'legend-labels');

    labels.append('span').text(min.toFixed(selectedMetric === 'deaths' ? 0 : 1));
    labels.append('span').text(max.toFixed(selectedMetric === 'deaths' ? 0 : 1));
}

// Render time series chart
function renderTimeSeries() {
    const container = d3.select('#time-series-container');
    const width = container.node().getBoundingClientRect().width;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };

    const svg = d3.select('#time-series-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    const xScale = d3.scaleLinear()
        .domain(d3.extent(processedData.allYears))
        .range([margin.left, width - margin.right]);

    const allValues = rawData.map(d => selectedMetric === 'deaths' ? d.deaths : d.rate);
    const yScale = d3.scaleLinear()
        .domain(d3.extent(allValues))
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Grid lines
    const yTicks = yScale.ticks(5);
    svg.append('g')
        .selectAll('line')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d));

    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'));
    const yAxis = d3.axisLeft(yScale).tickFormat(d => {
        if (selectedMetric === 'deaths') {
            return d >= 1000 ? `${(d / 1000).toFixed(1)}k` : d;
        }
        return d.toFixed(1);
    });

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .attr('class', 'axis')
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .attr('class', 'axis')
        .call(yAxis);

    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .attr('text-anchor', 'middle')
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text(selectedMetric === 'deaths' ? 'Total Deaths' : 'Age Adjusted Rate');

    // Lines
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(selectedMetric === 'deaths' ? d.deaths : d.rate))
        .curve(d3.curveMonotoneX);

    const colors = d3.schemeCategory10;

    if (comparisonMode && selectedStates.size > 0) {
        // Multiple lines for selected states
        let colorIndex = 0;
        selectedStates.forEach(state => {
            const stateData = processedData.byState[state] || [];
            const sortedData = stateData.sort((a, b) => a.year - b.year);

            svg.append('path')
                .datum(sortedData)
                .attr('class', 'line')
                .attr('d', line)
                .attr('stroke', colors[colorIndex % colors.length])
                .attr('stroke-width', 2.5)
                .on('mouseover', function() {
                    d3.select(this).attr('stroke-width', 4);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('stroke-width', 2.5);
                });

            // Points
            svg.selectAll(`.point-${state}`)
                .data(sortedData)
                .enter()
                .append('circle')
                .attr('class', 'line-point')
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(selectedMetric === 'deaths' ? d.deaths : d.rate))
                .attr('r', 4)
                .attr('fill', colors[colorIndex % colors.length])
                .on('mouseover', function(event, d) {
                    showTooltip(event, {
                        title: state,
                        items: [
                            { label: 'Year', value: d.year },
                            { label: 'Deaths', value: d.deaths.toLocaleString() },
                            { label: 'Age Adjusted Rate', value: d.rate.toFixed(2) }
                        ]
                    });
                })
                .on('mousemove', moveTooltip)
                .on('mouseout', hideTooltip);

            colorIndex++;
        });
    } else {
        // Single line: average across all states or selected states
        const statesToUse = selectedStates.size > 0 ? Array.from(selectedStates) : processedData.allStates;
        const averagedData = processedData.allYears.map(year => {
            const yearData = processedData.byYear[year] || [];
            const filteredData = yearData.filter(d => statesToUse.includes(d.state));
            if (filteredData.length === 0) return null;

            const avg = d3.mean(filteredData, d => selectedMetric === 'deaths' ? d.deaths : d.rate);
            return { year, value: avg };
        }).filter(d => d !== null);

        svg.append('path')
            .datum(averagedData)
            .attr('class', 'line')
            .attr('d', d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.value))
                .curve(d3.curveMonotoneX))
            .attr('stroke', colors[0])
            .attr('stroke-width', 2.5);

        // Points
        svg.selectAll('.point-avg')
            .data(averagedData)
            .enter()
            .append('circle')
            .attr('class', 'line-point')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.value))
            .attr('r', 4)
            .attr('fill', colors[0])
            .on('mouseover', function(event, d) {
                showTooltip(event, {
                    title: `Average (${statesToUse.length} states)`,
                    items: [
                        { label: 'Year', value: d.year },
                        { label: selectedMetric === 'deaths' ? 'Avg Deaths' : 'Avg Rate', 
                          value: d.value.toFixed(selectedMetric === 'deaths' ? 0 : 2) }
                    ]
                });
            })
            .on('mousemove', moveTooltip)
            .on('mouseout', hideTooltip);
    }
}

// Render bar chart
function renderBarChart() {
    const container = d3.select('#bar-chart-container');
    const width = container.node().getBoundingClientRect().width;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };

    const svg = d3.select('#bar-chart-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    const currentData = processedData.byYear[selectedYear] || [];
    let filteredData = currentData;

    if (selectedStates.size > 0) {
        filteredData = currentData.filter(d => selectedStates.has(d.state));
    }

    // Sort by selected metric
    filteredData.sort((a, b) => {
        const aVal = selectedMetric === 'deaths' ? a.deaths : a.rate;
        const bVal = selectedMetric === 'deaths' ? b.deaths : b.rate;
        return bVal - aVal;
    });

    // Limit to top 15 for readability
    filteredData = filteredData.slice(0, 15);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => selectedMetric === 'deaths' ? d.deaths : d.rate)])
        .nice()
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleBand()
        .domain(filteredData.map(d => d.state))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    // Grid lines
    const xTicks = xScale.ticks(5);
    svg.append('g')
        .selectAll('line')
        .data(xTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d => {
        if (selectedMetric === 'deaths') {
            return d >= 1000 ? `${(d / 1000).toFixed(1)}k` : d;
        }
        return d.toFixed(1);
    });
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .attr('class', 'axis')
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .attr('class', 'axis')
        .call(yAxis);

    // Axis labels
    svg.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .text(selectedMetric === 'deaths' ? 'Total Deaths' : 'Age Adjusted Rate');

    // Bars
    svg.selectAll('.bar')
        .data(filteredData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', margin.left)
        .attr('y', d => yScale(d.state))
        .attr('width', d => xScale(selectedMetric === 'deaths' ? d.deaths : d.rate) - margin.left)
        .attr('height', yScale.bandwidth())
        .attr('fill', d => {
            const value = selectedMetric === 'deaths' ? d.deaths : d.rate;
            return colorScale(value);
        })
        .on('mouseover', function(event, d) {
            showTooltip(event, {
                title: d.state,
                items: [
                    { label: 'Year', value: selectedYear },
                    { label: 'Deaths', value: d.deaths.toLocaleString() },
                    { label: 'Age Adjusted Rate', value: d.rate.toFixed(2) }
                ]
            });
            d3.select(this).attr('opacity', 0.7);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 1);
        });
}

// Toggle state selection
function toggleStateSelection(state) {
    if (selectedStates.has(state)) {
        selectedStates.delete(state);
    } else {
        selectedStates.add(state);
    }
    
    // Update dropdown
    const stateSelect = d3.select('#state-filter');
    stateSelect.select(`option[value="${state}"]`).property('selected', selectedStates.has(state));
    
    updateAllVisualizations();
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
    // Use clientX/clientY for screen coordinates since tooltip is absolutely positioned
    const x = event.clientX;
    const y = event.clientY;
    const tooltipNode = tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let left = x + 15;
    let top = y + 15;
    
    // Prevent tooltip from going off-screen
    if (left + tooltipRect.width > windowWidth) {
        left = x - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > windowHeight) {
        top = y - tooltipRect.height - 15;
    }
    
    // Ensure tooltip doesn't go off the left or top edges
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

