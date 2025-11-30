import React, { useMemo, useEffect, useRef } from 'react';
import { Note } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import * as d3 from 'd3';

interface DashboardProps {
  notes: Note[];
}

export const Dashboard: React.FC<DashboardProps> = ({ notes }) => {
  const d3Container = useRef<SVGSVGElement>(null);

  // Stats: Word Count
  const wordCountData = useMemo(() => {
    return notes.map(note => ({
      name: note.title.length > 15 ? note.title.substring(0, 15) + '...' : note.title,
      value: note.content.split(/\s+/).length,
    })).sort((a, b) => b.value - a.value).slice(0, 8); 
  }, [notes]);

  // Stats: Subjects
  const subjectData = useMemo(() => {
      const counts: Record<string, number> = {};
      notes.forEach(n => {
          const subj = n.subject || 'Uncategorized';
          counts[subj] = (counts[subj] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [notes]);

  // Stats: Tags for Bubble Chart
  const tagStats = useMemo(() => {
      const counts: Record<string, number> = {};
      notes.forEach(n => {
          n.tags.forEach(t => {
              counts[t] = (counts[t] || 0) + 1;
          });
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [notes]);

  // D3 Visualization: Bubble Chart
  useEffect(() => {
    if (!d3Container.current || tagStats.length === 0) return;

    const svg = d3.select(d3Container.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 300;
    
    const pack = d3.pack<{name: string, value: number}>()
        .size([width, height])
        .padding(5);

    const root = d3.hierarchy({ children: tagStats } as any)
        .sum((d: any) => d.value);

    const nodes = pack(root).leaves();
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const g = svg.append("g");

    const leaf = g.selectAll("g")
        .data(nodes)
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    leaf.append("circle")
        .attr("r", d => d.r)
        .attr("fill", (d: any) => color(d.data.name))
        .attr("opacity", 0.8)
        .attr("cursor", "pointer")
        .on("mouseover", function() { d3.select(this).attr("opacity", 1); })
        .on("mouseout", function() { d3.select(this).attr("opacity", 0.8); });

    leaf.append("text")
        .text((d: any) => d.data.name.substring(0, d.r / 3))
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .attr("font-size", d => Math.min(d.r / 2, 12))
        .attr("fill", "white")
        .style("pointer-events", "none")
        .style("font-weight", "bold");

  }, [tagStats]);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 custom-scrollbar">
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        <header className="mb-8">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-2 text-lg">Your knowledge hub analytics</p>
        </header>

        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-between h-32">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Notes</div>
                <div className="text-4xl font-bold text-indigo-600">{notes.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-between h-32">
                <div className="text-sm font-medium text-gray-500 uppercase">Subjects</div>
                <div className="text-4xl font-bold text-purple-600">{subjectData.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-between h-32">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Words</div>
                <div className="text-4xl font-bold text-emerald-600">
                    {notes.reduce((acc, n) => acc + n.content.split(' ').length, 0).toLocaleString()}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart: Subjects */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                    Subject Distribution
                </h2>
                <div className="h-64 w-full">
                    {subjectData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={subjectData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {subjectData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={[
                                            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'
                                        ][index % 6]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">No subjects categorized yet</div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {subjectData.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                            {s.name} ({s.value})
                        </span>
                    ))}
                </div>
            </div>

            {/* D3: Tag Cloud */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center">
                <h2 className="text-lg font-bold mb-4 text-gray-800 w-full text-left">Tag Ecosystem</h2>
                {tagStats.length > 0 ? (
                    <div className="w-full h-64 flex items-center justify-center">
                        <svg 
                            ref={d3Container} 
                            viewBox="0 0 400 300"
                            preserveAspectRatio="xMidYMid meet"
                            className="w-full h-full overflow-visible" 
                        />
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 italic">
                        Add tags to notes to visualize them
                    </div>
                )}
            </div>

             {/* Chart: Word Counts */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
                <h2 className="text-lg font-bold mb-6 text-gray-800">Longest Study Notes</h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wordCountData} barSize={40}>
                        <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                        <YAxis hide />
                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                            {wordCountData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7'][index % 3]} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};