// Shared data
let rawData = [];
let processedData = {};

// Bar Chart Race state
let barRaceMetric = 'rate';
let currentBarRaceYear = 2014;
let isBarRacePlaying = true;
let barRaceAnimationInterval = null;
let barRaceSpeed = 800;
let selectedBarRaceStates = new Set();

// Line Graph Race state
let lineRaceMetric = 'rate';
let currentLineRaceYear = 2014;
let isLineRacePlaying = true;
let lineRaceAnimationInterval = null;
let lineRaceSpeed = 800;
let selectedLineRaceStates = new Set();
let lineColorScale = null;

// Color palette for line graph
const stateColors = d3.schemeCategory10.concat(d3.schemeSet2, d3.schemeSet3);

// Current active view
let activeView = 'bar'; // 'bar' or 'line'

// Initialize combined race visualizations
async function init() {
    await loadData();
    setupViewToggle();
    setupBarChartRace();
    setupLineGraphRace();
    updateLineColorScale();
    renderBarChartRace();
    renderLineGraphRace();
    if (activeView === 'bar') {
        startBarRaceAnimation();
    } else {
        startLineRaceAnimation();
    }
}

// Load and parse CSV data (shared)
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

        processedData = {
            byState: {},
            byYear: {},
            allStates: [...new Set(rawData.map(d => d.state))].sort(),
            allYears: [...new Set(rawData.map(d => d.year))].sort()
        };

        rawData.forEach(d => {
            if (!processedData.byState[d.state]) {
                processedData.byState[d.state] = [];
            }
            processedData.byState[d.state].push(d);

            if (!processedData.byYear[d.year]) {
                processedData.byYear[d.year] = [];
            }
            processedData.byYear[d.year].push(d);
        });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Setup view toggle
function setupViewToggle() {
    d3.select('#bar-race-view-btn').on('click', function() {
        activeView = 'bar';
        d3.select('#bar-race-view-btn').classed('active', true);
        d3.select('#line-race-view-btn').classed('active', false);
        d3.select('#bar-race-section').classed('active', true);
        d3.select('#line-race-section').classed('active', false);
        
        // Stop line animation, start bar animation
        stopLineRaceAnimation();
        if (isBarRacePlaying) {
            startBarRaceAnimation();
        }
    });

    d3.select('#line-race-view-btn').on('click', function() {
        activeView = 'line';
        d3.select('#bar-race-view-btn').classed('active', false);
        d3.select('#line-race-view-btn').classed('active', true);
        d3.select('#bar-race-section').classed('active', false);
        d3.select('#line-race-section').classed('active', true);
        
        // Stop bar animation, start line animation
        stopBarRaceAnimation();
        if (isLineRacePlaying) {
            startLineRaceAnimation();
        }
    });
}

// ========== BAR CHART RACE FUNCTIONS ==========

function setupBarChartRace() {
    d3.selectAll('#bar-race-metric-toggle .toggle-btn').on('click', function() {
        d3.selectAll('#bar-race-metric-toggle .toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        barRaceMetric = d3.select(this).attr('data-metric');
        renderBarChartRace();
    });

    d3.select('#bar-play-pause-btn').on('click', function() {
        isBarRacePlaying = !isBarRacePlaying;
        updateBarPlayPauseButton();
        if (isBarRacePlaying) {
            startBarRaceAnimation();
        } else {
            stopBarRaceAnimation();
        }
    });

    const speedSlider = d3.select('#bar-speed-slider');
    const speedDisplay = d3.select('#bar-speed-display');
    
    speedSlider.on('input', function() {
        barRaceSpeed = +this.value;
        speedDisplay.text(`${barRaceSpeed}ms`);
        if (isBarRacePlaying) {
            stopBarRaceAnimation();
            startBarRaceAnimation();
        }
    });

    updateBarPlayPauseButton();
    setupBarRaceStateFilter();
}

function setupBarRaceStateFilter() {
    if (!processedData.allStates || processedData.allStates.length === 0) return;
    
    const stateSelect = d3.select('#bar-state-filter');
    stateSelect.selectAll('option').remove();
    
    processedData.allStates.forEach(state => {
        stateSelect.append('option')
            .attr('value', state)
            .text(state)
            .property('selected', true);
    });
    
    selectedBarRaceStates = new Set(processedData.allStates);
    
    stateSelect.on('change', function() {
        selectedBarRaceStates = new Set(Array.from(this.selectedOptions).map(opt => opt.value));
        renderBarChartRace();
    });
    
    d3.select('#bar-select-all-states').on('click', function() {
        processedData.allStates.forEach(state => {
            stateSelect.select(`option[value="${state}"]`).property('selected', true);
        });
        selectedBarRaceStates = new Set(processedData.allStates);
        renderBarChartRace();
    });
    
    d3.select('#bar-clear-all-states').on('click', function() {
        stateSelect.selectAll('option').property('selected', false);
        selectedBarRaceStates = new Set();
        renderBarChartRace();
    });
}

function startBarRaceAnimation() {
    if (barRaceAnimationInterval) clearInterval(barRaceAnimationInterval);
    if (activeView !== 'bar') return;
    
    barRaceAnimationInterval = setInterval(function() {
        if (isBarRacePlaying && activeView === 'bar') {
            currentBarRaceYear++;
            if (currentBarRaceYear > 2023) currentBarRaceYear = 2014;
            renderBarChartRace();
        }
    }, barRaceSpeed);
}

function stopBarRaceAnimation() {
    if (barRaceAnimationInterval) {
        clearInterval(barRaceAnimationInterval);
        barRaceAnimationInterval = null;
    }
}

function updateBarPlayPauseButton() {
    const btn = d3.select('#bar-play-pause-btn');
    const text = d3.select('#bar-play-pause-text');
    if (isBarRacePlaying) {
        text.text('Pause');
        btn.classed('active', false);
    } else {
        text.text('Play');
        btn.classed('active', true);
    }
}

function renderBarChartRace() {
    if (!processedData.byYear || !processedData.byYear[currentBarRaceYear]) return;
    if (activeView !== 'bar') return;

    const container = d3.select('#bar-race-chart');
    const containerNode = container.node();
    if (!containerNode) return;
    
    const width = containerNode.getBoundingClientRect().width;
    const labelAreaWidth = 200;
    const barStartX = labelAreaWidth + 20;
    const margin = { top: 40, right: 200, bottom: 40, left: barStartX };

    const yearData = processedData.byYear[currentBarRaceYear] || [];
    let filteredData = yearData;
    if (selectedBarRaceStates.size > 0) {
        filteredData = yearData.filter(d => selectedBarRaceStates.has(d.state));
    }
    
    const sortedData = filteredData
        .map(d => ({
            state: d.state,
            deaths: d.deaths,
            rate: d.rate,
            value: barRaceMetric === 'deaths' ? d.deaths : d.rate
        }))
        .sort((a, b) => b.value - a.value);
    
    const numStatesToShow = sortedData.length || 1;
    const height = Math.max(400, numStatesToShow * 24 + 60);

    const svg = d3.select('#bar-race-svg')
        .attr('width', width)
        .attr('height', height);

    if (sortedData.length === 0) return;

    const maxValue = d3.max(sortedData, d => d.value);
    const xScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleBand()
        .domain(sortedData.map(d => d.state))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([d3.min(sortedData, d => d.value), maxValue]);

    let xAxisG = svg.select('.x-axis-group');
    let yAxisG = svg.select('.y-axis-group');
    let gridG = svg.select('.grid-group');

    if (xAxisG.empty()) xAxisG = svg.append('g').attr('class', 'x-axis-group');
    if (yAxisG.empty()) yAxisG = svg.append('g').attr('class', 'y-axis-group');
    if (gridG.empty()) gridG = svg.append('g').attr('class', 'grid-group');

    const xTicks = xScale.ticks(4);
    const gridLines = gridG.selectAll('.grid-line').data(xTicks, d => d);

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

    const xAxis = d3.axisTop(xScale)
        .ticks(4)
        .tickFormat(d => {
            if (barRaceMetric === 'deaths') {
                if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
                if (d >= 1000) return `${(d / 1000).toFixed(0)}k`;
                return d.toString();
            }
            return d.toFixed(1);
        });
    const yAxis = d3.axisLeft(yScale).tickSize(0).tickFormat('');

    xAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(0, ${margin.top})`)
        .call(xAxis);

    yAxisG.transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(yAxis);
    
    yAxisG.selectAll('.domain').remove();

    const bars = svg.selectAll('.race-bar').data(sortedData, d => d.state);

    bars.exit()
        .transition()
        .duration(400)
        .ease(d3.easeCubicIn)
        .attr('width', 0)
        .attr('x', margin.left)
        .remove();

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

    const labels = svg.selectAll('.state-label').data(sortedData, d => d.state);
    const labelBackgrounds = svg.selectAll('.state-label-bg').data(sortedData, d => d.state);

    labelBackgrounds.enter()
        .append('rect')
        .attr('class', 'state-label-bg')
        .attr('x', 10)
        .attr('y', d => yScale(d.state))
        .attr('width', labelAreaWidth)
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
        .attr('x', labelAreaWidth - 10)
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
        .attr('x', labelAreaWidth - 10)
        .attr('y', d => yScale(d.state) + yScale.bandwidth() / 2)
        .attr('opacity', 1)
        .text(d => d.state);

    labels.exit()
        .transition()
        .duration(400)
        .attr('opacity', 0)
        .remove();

    const valueLabels = svg.selectAll('.value-label').data(sortedData, d => d.state);

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
            if (barRaceMetric === 'deaths') {
                return d.deaths.toLocaleString();
            }
            return d.rate.toFixed(2);
        });

    valueLabels.exit()
        .transition()
        .duration(400)
        .attr('opacity', 0)
        .remove();

    svg.selectAll('.race-bar')
        .on('mouseover', function(event, d) {
            showTooltip(event, {
                title: `${d.state} - ${currentBarRaceYear}`,
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

    d3.select('#bar-current-year-display').text(currentBarRaceYear);
    d3.select('#bar-year-progress').text(
        `Year ${currentBarRaceYear - 2013} of 10 (2014-2023)`
    );
    
    const total = barRaceMetric === 'deaths' 
        ? yearData.reduce((sum, d) => sum + d.deaths, 0)
        : yearData.reduce((sum, d) => sum + d.rate, 0) / yearData.length;
    
    d3.select('#bar-total-value-display').text(
        barRaceMetric === 'deaths' 
            ? `Total: ${total.toLocaleString()}`
            : `Average: ${total.toFixed(2)}`
    );
}

// ========== LINE GRAPH RACE FUNCTIONS ==========

function setupLineGraphRace() {
    d3.selectAll('#line-race-metric-toggle .toggle-btn').on('click', function() {
        d3.selectAll('#line-race-metric-toggle .toggle-btn').classed('active', false);
        d3.select(this).classed('active', true);
        lineRaceMetric = d3.select(this).attr('data-metric');
        updateLineColorScale();
        renderLineGraphRace();
    });

    d3.select('#line-play-pause-btn').on('click', function() {
        isLineRacePlaying = !isLineRacePlaying;
        updateLinePlayPauseButton();
        if (isLineRacePlaying) {
            startLineRaceAnimation();
        } else {
            stopLineRaceAnimation();
        }
    });

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

    updateLinePlayPauseButton();
    setupLineRaceStateFilter();
}

function setupLineRaceStateFilter() {
    if (!processedData.allStates || processedData.allStates.length === 0) return;
    
    const stateSelect = d3.select('#line-state-filter');
    stateSelect.selectAll('option').remove();
    
    processedData.allStates.forEach(state => {
        stateSelect.append('option')
            .attr('value', state)
            .text(state)
            .property('selected', false);
    });
    
    selectedLineRaceStates = new Set();
    
    stateSelect.on('change', function() {
        selectedLineRaceStates = new Set(Array.from(this.selectedOptions).map(opt => opt.value));
        renderLineGraphRace();
    });
    
    d3.select('#line-select-all-states').on('click', function() {
        processedData.allStates.forEach(state => {
            stateSelect.select(`option[value="${state}"]`).property('selected', true);
        });
        selectedLineRaceStates = new Set(processedData.allStates);
        renderLineGraphRace();
    });
    
    d3.select('#line-clear-all-states').on('click', function() {
        stateSelect.selectAll('option').property('selected', false);
        selectedLineRaceStates = new Set();
        renderLineGraphRace();
    });
}

function updateLineColorScale() {
    const allYearsData = processedData.allYears.flatMap(year => 
        processedData.byYear[year] || []
    );
    const values = allYearsData.map(d => lineRaceMetric === 'deaths' ? d.deaths : d.rate);
    const min = d3.min(values);
    const max = d3.max(values);

    lineColorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([min, max]);
}

function startLineRaceAnimation() {
    if (lineRaceAnimationInterval) clearInterval(lineRaceAnimationInterval);
    if (activeView !== 'line') return;
    
    lineRaceAnimationInterval = setInterval(function() {
        if (isLineRacePlaying && activeView === 'line') {
            currentLineRaceYear++;
            if (currentLineRaceYear > 2023) currentLineRaceYear = 2014;
            renderLineGraphRace();
        }
    }, lineRaceSpeed);
}

function stopLineRaceAnimation() {
    if (lineRaceAnimationInterval) {
        clearInterval(lineRaceAnimationInterval);
        lineRaceAnimationInterval = null;
    }
}

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

function renderLineGraphRace() {
    if (!processedData.allStates || processedData.allStates.length === 0) return;
    if (activeView !== 'line') return;

    const container = d3.select('#line-race-container');
    const width = container.node().getBoundingClientRect().width - 40;
    const height = Math.max(500, width * 0.6);
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };

    const svg = d3.select('#line-race-svg')
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove();

    const yearsToShow = processedData.allYears.filter(y => y <= currentLineRaceYear);
    const statesToShow = selectedLineRaceStates.size > 0 
        ? Array.from(selectedLineRaceStates).sort()
        : [];

    if (statesToShow.length === 0) {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .style('fill', '#666')
            .text('Please select states from the dropdown above to see their trends');
        return;
    }

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

    const xScale = d3.scaleLinear()
        .domain(d3.extent(processedData.allYears))
        .range([margin.left, width - margin.right]);

    const allValues = Array.from(stateDataMap.values())
        .flatMap(d => d.data.map(dd => dd.value));
    const yScale = d3.scaleLinear()
        .domain(d3.extent(allValues))
        .nice()
        .range([height - margin.bottom, margin.top]);

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

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

    stateDataMap.forEach((stateInfo, state) => {
        if (stateInfo.data.length === 0) return;

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

    d3.select('#line-current-year-display').text(currentLineRaceYear);
    d3.select('#line-year-progress').text(
        `Year ${currentLineRaceYear - 2013} of 10 (2014-2023)`
    );
    
    const currentYearData = processedData.byYear[currentLineRaceYear] || [];
    const filteredCurrentData = currentYearData.filter(d => statesToShow.includes(d.state));
    if (filteredCurrentData.length > 0) {
        const avg = lineRaceMetric === 'deaths'
            ? filteredCurrentData.reduce((sum, d) => sum + d.deaths, 0) / filteredCurrentData.length
            : filteredCurrentData.reduce((sum, d) => sum + d.rate, 0) / filteredCurrentData.length;
        
        d3.select('#line-total-value-display').text(
            lineRaceMetric === 'deaths'
                ? `Average: ${avg.toFixed(0)}`
                : `Average: ${avg.toFixed(2)}`
        );
    } else {
        d3.select('#line-total-value-display').text('');
    }
}

// ========== SHARED TOOLTIP FUNCTIONS ==========

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
