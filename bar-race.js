// Global state for bar chart race
let rawData = [];
let processedData = {};
let raceMetric = 'deaths';
let currentRaceYear = 2014;
let isRacePlaying = true;
let raceAnimationInterval = null;
let raceSpeed = 800; // milliseconds per year

// Initialize the bar chart race
async function init() {
    await loadData();
    setupBarChartRace();
    renderBarChartRace();
    startRaceAnimation();
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

// Setup bar chart race visualization
function setupBarChartRace() {
    // Metric toggle for bar race
    d3.selectAll('#race-metric-toggle .toggle-btn').on('click', function() {
        d3.selectAll('#race-metric-toggle .toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        raceMetric = d3.select(this).attr('data-metric');
        renderBarChartRace();
    });

    // Play/Pause button
    d3.select('#play-pause-btn').on('click', function() {
        isRacePlaying = !isRacePlaying;
        updatePlayPauseButton();
        if (isRacePlaying) {
            startRaceAnimation();
        } else {
            stopRaceAnimation();
        }
    });

    // Speed slider
    const speedSlider = d3.select('#speed-slider');
    const speedDisplay = d3.select('#speed-display');
    
    speedSlider.on('input', function() {
        raceSpeed = +this.value;
        speedDisplay.text(`${raceSpeed}ms`);
        if (isRacePlaying) {
            stopRaceAnimation();
            startRaceAnimation();
        }
    });

    // Update button state
    updatePlayPauseButton();
}

// Start the automatic animation
function startRaceAnimation() {
    if (raceAnimationInterval) {
        clearInterval(raceAnimationInterval);
    }
    
    raceAnimationInterval = setInterval(function() {
        if (isRacePlaying) {
            currentRaceYear++;
            if (currentRaceYear > 2023) {
                currentRaceYear = 2014; // Loop back to start
            }
            renderBarChartRace();
        }
    }, raceSpeed);
}

// Stop the automatic animation
function stopRaceAnimation() {
    if (raceAnimationInterval) {
        clearInterval(raceAnimationInterval);
        raceAnimationInterval = null;
    }
}

// Update play/pause button text
function updatePlayPauseButton() {
    const btn = d3.select('#play-pause-btn');
    const text = d3.select('#play-pause-text');
    if (isRacePlaying) {
        text.text('Pause');
        btn.classed('active', false);
    } else {
        text.text('Play');
        btn.classed('active', true);
    }
}

// Render bar chart race for current year with smooth animations
function renderBarChartRace() {
    if (!processedData.byYear || !processedData.byYear[currentRaceYear]) return;

    const container = d3.select('#bar-race-chart');
    const containerNode = container.node();
    if (!containerNode) return;
    
    const width = containerNode.getBoundingClientRect().width;
    // Show all states
    const totalStates = processedData.allStates ? processedData.allStates.length : 51;
    const height = totalStates * 35 + 100;
    // Define label area and bar start position clearly
    const labelAreaWidth = 200; // Space reserved for labels on the left
    const barStartX = labelAreaWidth + 20; // Bars start after labels with 20px gap
    const margin = { top: 40, right: 200, bottom: 40, left: barStartX };

    const svg = d3.select('#bar-race-svg')
        .attr('width', width)
        .attr('height', height);

    // Get data for current year
    const yearData = processedData.byYear[currentRaceYear] || [];
    
    // Sort by selected metric (descending) - show all states
    const sortedData = yearData
        .map(d => ({
            state: d.state,
            deaths: d.deaths,
            rate: d.rate,
            value: raceMetric === 'deaths' ? d.deaths : d.rate
        }))
        .sort((a, b) => b.value - a.value);

    if (sortedData.length === 0) return;

    // Scales
    const maxValue = d3.max(sortedData, d => d.value);
    const xScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleBand()
        .domain(sortedData.map(d => d.state))
        .range([margin.top, height - margin.bottom])
        .padding(0.3); // Increased padding for more space between bars

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([d3.min(sortedData, d => d.value), maxValue]);

    // Keep axes and grid - update them smoothly
    let xAxisG = svg.select('.x-axis-group');
    let yAxisG = svg.select('.y-axis-group');
    let gridG = svg.select('.grid-group');

    if (xAxisG.empty()) {
        xAxisG = svg.append('g').attr('class', 'x-axis-group');
    }
    if (yAxisG.empty()) {
        yAxisG = svg.append('g').attr('class', 'y-axis-group');
    }
    if (gridG.empty()) {
        gridG = svg.append('g').attr('class', 'grid-group');
    }

    // Update grid lines - match axis ticks
    const xTicks = xScale.ticks(4);
    const gridLines = gridG.selectAll('.grid-line')
        .data(xTicks, d => d);

    gridLines.enter()
        .append('line')
        .attr('class', 'grid-line')
        .merge(gridLines)
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom);

    gridLines.exit().remove();

    // Update axes - reduce tick count for cleaner x-axis
    const xAxis = d3.axisTop(xScale)
        .ticks(4) // Reduce to 4 ticks for less clutter
        .tickFormat(d => {
            if (raceMetric === 'deaths') {
                if (d >= 1000000) {
                    return `${(d / 1000000).toFixed(1)}M`;
                } else if (d >= 1000) {
                    return `${(d / 1000).toFixed(0)}k`;
                }
                return d.toString();
            }
            return d.toFixed(1);
        });
    const yAxis = d3.axisLeft(yScale)
        .tickSize(0) // Remove tick lines
        .tickFormat(''); // Hide axis labels - we use custom labels instead

    xAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(0, ${margin.top})`)
        .call(xAxis);

    // Hide y-axis completely since we use custom labels
    yAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);
    
    // Remove the y-axis line (domain) to prevent intersection with bars
    yAxisG.selectAll('.domain').remove();

    // Bars with smooth position and width transitions
    const bars = svg.selectAll('.race-bar')
        .data(sortedData, d => d.state); // Key function for smooth transitions

    // Exit: remove bars that are no longer in top list
    bars.exit()
        .transition()
        .duration(400)
        .ease(d3.easeCubicIn)
        .attr('width', 0)
        .attr('x', margin.left)
        .remove();

    // Enter: new bars start from width 0
    const barsEnter = bars.enter()
        .append('rect')
        .attr('class', 'race-bar')
        .attr('x', margin.left)
        .attr('y', d => yScale(d.state))
        .attr('width', 0)
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('opacity', 0);

    // Update: smooth transitions for position and width
    barsEnter.merge(bars)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('x', margin.left)
        .attr('y', d => yScale(d.state))
        .attr('width', d => xScale(d.value) - margin.left)
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.value))
        .attr('opacity', 1);

    // State labels - smooth position transitions with better visibility
    const labels = svg.selectAll('.state-label')
        .data(sortedData, d => d.state);

    // Add text background for better readability
    const labelBackgrounds = svg.selectAll('.state-label-bg')
        .data(sortedData, d => d.state);

    labelBackgrounds.enter()
        .append('rect')
        .attr('class', 'state-label-bg')
        .attr('x', 10) // Start from left edge
        .attr('y', d => yScale(d.state))
        .attr('width', labelAreaWidth) // Width to cover label area
        .attr('height', yScale.bandwidth())
        .attr('fill', 'white')
        .attr('opacity', 0.9)
        .merge(labelBackgrounds)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('y', d => yScale(d.state))
        .attr('width', labelAreaWidth)
        .attr('height', yScale.bandwidth());

    labelBackgrounds.exit().remove();

    labels.enter()
        .append('text')
        .attr('class', 'state-label')
        .attr('x', labelAreaWidth - 10) // Position at end of label area
        .attr('y', d => yScale(d.state) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '16px')
        .attr('font-weight', '600')
        .attr('fill', '#1a1a1a')
        .attr('opacity', 0)
        .merge(labels)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('x', labelAreaWidth - 10) // Right-aligned at end of label area
        .attr('y', d => yScale(d.state) + yScale.bandwidth() / 2)
        .attr('opacity', 1)
        .text(d => d.state);

    labels.exit()
        .transition()
        .duration(400)
        .attr('opacity', 0)
        .remove();

    // Value labels - smooth position transitions
    const valueLabels = svg.selectAll('.value-label')
        .data(sortedData, d => d.state);

    valueLabels.enter()
        .append('text')
        .attr('class', 'value-label')
        .attr('x', d => xScale(d.value) + 15)
        .attr('y', d => yScale(d.state) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', '#2c3e50')
        .attr('opacity', 0)
        .merge(valueLabels)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('x', d => xScale(d.value) + 15)
        .attr('y', d => yScale(d.state) + yScale.bandwidth() / 2)
        .attr('opacity', 1)
        .text(d => {
            if (raceMetric === 'deaths') {
                return d.deaths.toLocaleString();
            }
            return d.rate.toFixed(2);
        });

    valueLabels.exit()
        .transition()
        .duration(400)
        .attr('opacity', 0)
        .remove();

    // Rank labels removed - no longer showing rank numbers

    // Hover interactions
    svg.selectAll('.race-bar')
        .on('mouseover', function(event, d) {
            showTooltip(event, {
                title: `${d.state} - ${currentRaceYear}`,
                items: [
                    { label: 'Rank', value: `#${sortedData.indexOf(d) + 1}` },
                    { label: 'Deaths', value: d.deaths.toLocaleString() },
                    { label: 'Age Adjusted Rate', value: d.rate.toFixed(2) }
                ]
            });
            d3.select(this).attr('opacity', 0.8);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', function() {
            hideTooltip();
            d3.select(this).attr('opacity', 1);
        });

    // Update year indicator
    d3.select('#current-year-display').text(currentRaceYear);
    d3.select('#year-progress').text(
        `Year ${currentRaceYear - 2013} of 10 (2014-2023)`
    );
    
    // Calculate and display total
    const total = raceMetric === 'deaths' 
        ? yearData.reduce((sum, d) => sum + d.deaths, 0)
        : yearData.reduce((sum, d) => sum + d.rate, 0) / yearData.length;
    
    d3.select('#total-value-display').text(
        raceMetric === 'deaths' 
            ? `Total: ${total.toLocaleString()}`
            : `Average: ${total.toFixed(2)}`
    );
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
    
    // Prevent tooltip from going off-screen
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

