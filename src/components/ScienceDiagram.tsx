import { useEffect, useRef, type FC } from "react";
import * as d3 from "d3";

interface ScienceDiagramProps {
  topic: string;
  theme: "light" | "dark";
}

export const ScienceDiagram: FC<ScienceDiagramProps> = ({ topic, theme }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const color = theme === "dark" ? "#fff" : "#000";

    if (topic === "Water Cycle") {
      // Simple Water Cycle Diagram
      const g = svg.append("g").attr("transform", "translate(50,50)");

      // Sun
      g.append("circle")
        .attr("cx", 500)
        .attr("cy", 20)
        .attr("r", 30)
        .attr("fill", "#FDB813");

      // Ocean
      g.append("rect")
        .attr("x", 0)
        .attr("y", 300)
        .attr("width", 500)
        .attr("height", 50)
        .attr("fill", "#0077be")
        .attr("rx", 10);

      // Mountains
      g.append("path")
        .attr("d", "M 0 300 L 100 100 L 200 300 Z")
        .attr("fill", theme === "dark" ? "#333" : "#ccc");

      // Arrows
      const arrowData = [
        { d: "M 400 280 Q 420 200 400 120", label: "Evaporation" },
        { d: "M 350 80 Q 250 50 150 80", label: "Condensation" },
        { d: "M 100 100 Q 80 200 100 280", label: "Precipitation" },
      ];

      g.selectAll(".arrow")
        .data(arrowData)
        .enter()
        .append("path")
        .attr("d", (d) => d.d)
        .attr("stroke", "#3B82F6")
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .attr("marker-end", "url(#arrowhead)");

      g.selectAll(".label")
        .data(arrowData)
        .enter()
        .append("text")
        .attr("x", (d, i) => (i === 0 ? 430 : i === 1 ? 250 : 50))
        .attr("y", (d, i) => (i === 0 ? 200 : i === 1 ? 40 : 200))
        .attr("fill", color)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text((d) => d.label);

      // Define arrowhead
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#3B82F6");
    } else if (topic === "Solar System") {
      const g = svg.append("g").attr("transform", "translate(300,200)");

      // Sun
      g.append("circle").attr("r", 40).attr("fill", "#FDB813");

      const planets = [
        { r: 60, size: 5, color: "#A5A5A5", name: "Mercury" },
        { r: 90, size: 8, color: "#E3BB76", name: "Venus" },
        { r: 130, size: 9, color: "#2271B3", name: "Earth" },
        { r: 170, size: 7, color: "#E27B58", name: "Mars" },
      ];

      planets.forEach((p) => {
        g.append("circle")
          .attr("r", p.r)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-opacity", 0.2);
        g.append("circle")
          .attr("cx", p.r)
          .attr("r", p.size)
          .attr("fill", p.color)
          .append("title")
          .text(p.name);
      });
    }
  }, [topic, theme]);

  return (
    <div className="flex justify-center bg-black/5 dark:bg-white/5 rounded-2xl p-4 overflow-hidden">
      <svg ref={svgRef} width="600" height="400" viewBox="0 0 600 400" />
    </div>
  );
};
