import json
from pathlib import Path

# Load merged data
merged_path = Path('graphify-out/.graphify_merged.json')
with open(merged_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# HTML template with placeholder for data
html_template = """<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <title>Mayhem-Sequence Architectural Graph</title>
    <script src='https://d3js.org/d3.v7.min.js'></script>
    <style>
        body { margin: 0; font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; overflow: hidden; }
        #graph { width: 100vw; height: 100vh; }
        .node { stroke: #1e293b; stroke-width: 1.5px; cursor: pointer; transition: 0.3s; }
        .node:hover { stroke: #fff; stroke-width: 2.5px; }
        .link { stroke: #94a3b8; stroke-opacity: 0.2; stroke-width: 1px; }
        .label { font-size: 10px; fill: #94a3b8; pointer-events: none; opacity: 0.8; }
        .tooltip {
            position: absolute; padding: 12px; background: rgba(30, 41, 59, 0.95);
            border: 1px solid #334155; border-radius: 8px; color: #f1f5f9;
            pointer-events: none; opacity: 0; transition: 0.2s; font-size: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 300px; z-index: 100;
        }
        #ui-overlay { position: absolute; top: 20px; left: 20px; z-index: 10; pointer-events: none; }
        .legend { background: rgba(15, 23, 42, 0.8); padding: 15px; border-radius: 8px; pointer-events: auto; border: 1px solid #334155; }
        h1 { margin: 0 0 10px 0; font-size: 20px; color: #38bdf8; }
        .legend-item { display: flex; align-items: center; margin-bottom: 6px; font-size: 12px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; }
    </style>
</head>
<body>
    <div id='ui-overlay'>
        <div class='legend'>
            <h1>Mayhem-Sequence Map</h1>
            <div class='legend-item'><div class='dot' style='background: #38bdf8;'></div> Code File</div>
            <div class='legend-item'><div class='dot' style='background: #818cf8;'></div> Logic / Route</div>
            <div class='legend-item'><div class='dot' style='background: #fbbf24;'></div> Documentation</div>
            <div class='legend-item'><div class='dot' style='background: #f472b6;'></div> Architectural Concept</div>
            <p style='font-size: 10px; color: #64748b; margin-top: 10px;'>Scroll to Zoom • Drag to Move • Hover for Details</p>
        </div>
    </div>
    <div class='tooltip' id='tooltip'></div>
    <svg id='graph'></svg>

    <script>
        const graphData = REPLACE_ME;

        const width = window.innerWidth;
        const height = window.innerHeight;

        const svg = d3.select('#graph')
            .attr('viewBox', [0, 0, width, height])
            .call(d3.zoom().scaleExtent([0.1, 8]).on('zoom', (event) => {
                container.attr('transform', event.transform);
            }));

        const container = svg.append('g');

        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links || graphData.edges).id(d => d.id).distance(80))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(40));

        const colorScale = (d) => {
            if (d.kind === 'Concept') return '#f472b6';
            if (d.kind === 'Doc' || d.kind === 'File') return '#fbbf24';
            if (d.label && (d.label.endswith('.ts') or d.label.endswith('.tsx'))) return '#38bdf8';
            return '#818cf8';
        };

        const link = container.append('g')
            .selectAll('line')
            .data(graphData.links || graphData.edges)
            .join('line')
            .attr('class', 'link');

        const node = container.append('g')
            .selectAll('circle')
            .data(graphData.nodes)
            .join('circle')
            .attr('class', 'node')
            .attr('r', d => d.kind === 'Concept' ? 10 : 7)
            .attr('fill', colorScale)
            .call(d3.drag()
                .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
                .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
                .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

        const labels = container.append('g')
            .selectAll('text')
            .data(graphData.nodes)
            .join('text')
            .attr('class', 'label')
            .text(d => d.label)
            .attr('dx', 14)
            .attr('dy', 4);

        const tooltip = d3.select('#tooltip');

        node.on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`<strong>${d.label}</strong><br/>${d.summary || d.id}<br/><small style='color:#38bdf8'>${d.kind || 'Module'}</small>`)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY + 15) + 'px');
            
            const neighbors = new Set([d.id]);
            (graphData.links || graphData.edges).forEach(l => {
                if (l.source === d.id || l.source.id === d.id) neighbors.add(l.target.id || l.target);
                if (l.target === d.id || l.target.id === d.id) neighbors.add(l.source.id || l.source);
            });

            node.style('opacity', n => neighbors.has(n.id) ? 1 : 0.1);
            labels.style('opacity', n => neighbors.has(n.id) ? 1 : 0.1);
            link.style('stroke-opacity', l => {
                const s = l.source.id || l.source;
                const t = l.target.id || l.target;
                return (s === d.id || t === d.id) ? 0.8 : 0.05;
            });
        }).on('mouseout', () => {
            tooltip.style('opacity', 0);
            node.style('opacity', 1);
            labels.style('opacity', 0.8);
            link.style('stroke-opacity', 0.2);
        });

        simulation.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('cx', d => d.x).attr('cy', d => d.y);
            labels.attr('x', d => d.x).attr('y', d => d.y);
        });
    </script>
</body>
</html>
"""

with open('graphify-out/graph.html', 'w', encoding='utf-8') as f:
    f.write(html_template.replace('REPLACE_ME', json.dumps(data)))
print('Generated graphify-out/graph.html')
