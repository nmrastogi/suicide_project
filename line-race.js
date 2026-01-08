// Global state for line graph race
let rawData = [];
let processedData = {};
let lineRaceMetric = 'deaths';
let currentLineRaceYear = 2014;
let isLineRacePlaying = true;
let lineRaceAnimationInterval = null;
let lineRaceSpeed = 800; // milliseconds per year
let selectedLineRaceStates = new Set(); // Selected states for filtering
let colorScale = null;

// Color palette for different states
const stateColors = d3.schemeCategory10.concat(d3.schemeSet2, d3.schemeSet3);

// Initialize the line graph race
async function init() {
    await loadData();
    setupLineGraphRace();
    updateColorScale();
    renderLineGraphRace();
    startLineRaceAnimation();
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

// Setup line graph race visualization
function setupLineGraphRace() {
    // Metric toggle
    d3.selectAll('#line-race-metric-toggle .toggle-btn').on('click', function() {
        d3.selectAll('#line-race-metric-toggle .toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        lineRaceMetric = d3.select(this).attr('data-metric');
        updateColorScale();
        renderLineGraphRace();
    });

    // Play/Pause button
    d3.select('#line-play-pause-btn').on('click', function() {
        isLineRacePlaying = !isLineRacePlaying;
        updateLinePlayPauseButton();
        if (isLineRacePlaying) {
            startLineRaceAnimation();
        } else {
            stopLineRaceAnimation();
        }
    });

    // Speed slider
    const speedSlider = d3.select('#line-speed-slider');
    const speedDisplay = d3.select('#line-speed-display');
    
    speedSlider.on('input', function() {
        lineRaceSpeed = +this.value;
        speedDisplay.text(`${lineRaceSpeed}ms`);
        if (isLineRacePlaying) {
            stopLineRaceAnimation();
            startLineRaceAnimation();
        }
    });

    // Update button state
    updateLinePlayPauseButton();
    
    // State filter setup
    setupLineRaceStateFilter();
}

// Setup state filter for line graph race
function setupLineRaceStateFilter() {
    if (!processedData.allStates || processedData.allStates.length === 0) {
        return; // Data not loaded yet
    }
    
    const stateSelect = d3.select('#line-state-filter');
    
    // Clear existing options
    stateSelect.selectAll('option').remove();
    
    // Populate dropdown with all states
    processedData.allStates.forEach(state => {
        stateSelect.append('option')
            .attr('value', state)
            .text(state)
            .property('selected', false);
    });
    
    // Initialize with no states selected (user must choose)
    selectedLineRaceStates = new Set();
    
    // Handle state selection changes
    stateSelect.on('change', function() {
        selectedLineRaceStates = new Set(Array.from(this.selectedOptions).map(opt => opt.value));
        renderLineGraphRace();
    });
    
    // Select all button
    d3.select('#line-select-all-states').on('click', function() {
        processedData.allStates.forEach(state => {
            const option = stateSelect.select(`option[value="${state}"]`);
            option.property('selected', true);
        });
        selectedLineRaceStates = new Set(processedData.allStates);
        renderLineGraphRace();
    });
    
    // Clear all button
    d3.select('#line-clear-all-states').on('click', function() {
        stateSelect.selectAll('option').property('selected', false);
        selectedLineRaceStates = new Set();
        renderLineGraphRace();
    });
}

// Update color scale based on metric
function updateColorScale() {
    const allYearsData = processedData.allYears.flatMap(year => 
        processedData.byYear[year] || []
    );
    const values = allYearsData.map(d => lineRaceMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([min, max]);
}

// Start animation
function startLineRaceAnimation() {
    if (lineRaceAnimationInterval) {
        clearInterval(lineRaceAnimationInterval);
    }
    
    lineRaceAnimationInterval = setInterval(function() {
        if (isLineRacePlaying) {
            currentLineRaceYear++;
            if (currentLineRaceYear > 2023) {
                currentLineRaceYear = 2014; // Loop back
            }
            renderLineGraphRace();
        }
    }, lineRaceSpeed);
}

// Stop animation
function stopLineRaceAnimation() {
    if (lineRaceAnimationInterval) {
        clearInterval(lineRaceAnimationInterval);
        lineRaceAnimationInterval = null;
    }
}

// Update play/pause button
function updateLinePlayPauseButton() {
    const btn = d3.select('#line-play-pause-btn');
    const text = d3.select('#line-play-pause-text');
    if (isLineRacePlaying) {
        text.text('Pause');
        btn.classed('active', false);
    } else {
        text.text('Play');
        btn.classed('active', true);
    }
}

// Render line graph race
function renderLineGraphRace() {
    if (!processedData.allStates || processedData.allStates.length === 0) {
        return;
    }

    const container = d3.select('#line-race-container');
    const width = container.node().getBoundingClientRect().width - 40;
    const height = Math.max(500, width * 0.6);
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };

    const svg = d3.select('#line-race-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    // Get years up to current year
    const yearsToShow = processedData.allYears.filter(y => y <= currentLineRaceYear);
    
    // Get states to display
    const statesToShow = selectedLineRaceStates.size > 0 
        ? Array.from(selectedLineRaceStates).sort()
        : [];

    if (statesToShow.length === 0) {
        // Show message to select states
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .style('fill', '#666')
            .text('Please select states from the dropdown above to see their trends');
        return;
    }

    // Prepare data for each state
    const stateDataMap = new Map();
    statesToShow.forEach((state, index) => {
        const stateData = processedData.byState[state] || [];
        const sortedData = stateData
            .filter(d => yearsToShow.includes(d.year))
            .sort((a, b) => a.year - b.year)
            .map(d => ({
                year: d.year,
                value: lineRaceMetric === 'deaths' ? d.deaths : d.rate,
                state: state
            }));
        stateDataMap.set(state, {
            data: sortedData,
            color: stateColors[index % stateColors.length]
        });
    });

    // Create scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(processedData.allYears))
        .range([margin.left, width - margin.right]);

    const allValues = Array.from(stateDataMap.values())
        .flatMap(d => d.data.map(dd => dd.value));
    const yScale = d3.scaleLinear()
        .domain(d3.extent(allValues))
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Grid lines
    const yTicks = yScale.ticks(8);
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
        if (lineRaceMetric === 'deaths') {
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
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .text('Year');

    svg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .text(lineRaceMetric === 'deaths' ? 'Total Deaths' : 'Age Adjusted Rate');

    // Line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

    // Draw lines for each state
    stateDataMap.forEach((stateInfo, state) => {
        if (stateInfo.data.length === 0) return;

        // Draw line
        svg.append('path')
            .datum(stateInfo.data)
            .attr('class', 'line-path')
            .attr('d', line)
            .attr('stroke', stateInfo.color)
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.9)
            .on('mouseover', function() {
                d3.select(this).attr('stroke-width', 4);
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke-width', 2.5);
            });

        // Draw points
        svg.selectAll(`.point-${state.replace(/\s+/g, '-')}`)
            .data(stateInfo.data)
            .enter()
            .append('circle')
            .attr('class', 'line-point')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.value))
            .attr('r', 4)
            .attr('fill', stateInfo.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .on('mouseover', function(event, d) {
                showTooltip(event, {
                    title: state,
                    items: [
                        { label: 'Year', value: d.year },
                        { label: lineRaceMetric === 'deaths' ? 'Deaths' : 'Rate', 
                          value: lineRaceMetric === 'deaths' 
                            ? d.value.toLocaleString() 
                            : d.value.toFixed(2) }
                    ]
                });
                d3.select(this).attr('r', 6);
            })
            .on('mousemove', moveTooltip)
            .on('mouseout', function() {
                hideTooltip();
                d3.select(this).attr('r', 4);
            });
    });

    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);

    let legendY = 0;
    stateDataMap.forEach((stateInfo, state) => {
        const legendItem = legend.append('g')
            .attr('transform', `translate(0, ${legendY})`);

        legendItem.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', stateInfo.color)
            .attr('stroke-width', 2.5);

        legendItem.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .attr('font-size', '11px')
            .style('fill', '#333')
            .text(state);

        legendY += 20;
    });

    // Update year indicator
    d3.select('#current-year-display').text(currentLineRaceYear);
    d3.select('#year-progress').text(
        `Year ${currentLineRaceYear - 2013} of 10 (2014-2023)`
    );
    
    // Calculate and display average for current year
    const currentYearData = processedData.byYear[currentLineRaceYear] || [];
    const filteredCurrentData = currentYearData.filter(d => statesToShow.includes(d.state));
    if (filteredCurrentData.length > 0) {
        const avg = lineRaceMetric === 'deaths'
            ? filteredCurrentData.reduce((sum, d) => sum + d.deaths, 0) / filteredCurrentData.length
            : filteredCurrentData.reduce((sum, d) => sum + d.rate, 0) / filteredCurrentData.length;
        
        d3.select('#total-value-display').text(
            lineRaceMetric === 'deaths'
                ? `Average: ${avg.toFixed(0)}`
                : `Average: ${avg.toFixed(2)}`
        );
    } else {
        d3.select('#total-value-display').text('');
    }
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
