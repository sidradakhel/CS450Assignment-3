import React, { Component } from "react";
import "./App.css";
import * as d3 from "d3";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputText: "",
      wordFrequency: [],
    };
  }

  componentDidMount() {
    this.renderChart();
  }
  componentDidUpdate() {
    this.renderChart();
  }

  getWordFrequency = (text) => {
    const commonWords = new Set([
      "the", "and", "a", "an", "in", "on", "at", "for", "with", "about", "as", "by", "to", "of", "from", "that", "which",
      "who", "whom", "this", "these", "those", "it", "its", "they", "their", "them", "we", "our", "ours", "you", "your",
      "yours", "he", "him", "his", "she", "her", "hers", "us", "theirs", "i", "me", "my", "myself", "yourself", "yourselves",
      "was", "were", "is", "am", "are", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing",
      "if", "each", "how", "what", "without", "through", "over", "under", "above", "below", "between", "among", "during",
      "before", "after", "until", "while", "off", "out", "into", "against", "amongst", "throughout", "despite", "towards",
      "upon", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't", "doesn't", "didn't", "don't", "won't",
      "wouldn't", "can't", "couldn't", "shouldn't", "mustn't", "needn't", "daren't"
    ]);

    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=_`~()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

    const filtered = words.filter(w => !commonWords.has(w));
    const freq = filtered.reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(freq);
  };

  measureWidth(svg, text, fontSize) {
    const m = svg.append("text")
      .attr("class", "word")
      .style("visibility", "hidden")
      .attr("font-size", fontSize)
      .attr("x", -9999)
      .attr("y", -9999)
      .text(text);
    const w = m.node().getBBox().width;
    m.remove();
    return w;
  }

  renderChart() {
    // same behavior: take top-5 by frequency (then alpha)
    const top = [...this.state.wordFrequency]
      .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
      .slice(0, 5);

    const root = d3.select(".svg_parent");
    const W = 1000;
    const H = 400;

    root
      .attr("width", W)
      .attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .style("overflow", "visible");

    if (top.length === 0) {
      root.selectAll("*").remove();
      return;
    }

    // font size scale (same domain/range as before)
    const vals = top.map(d => d[1]);
    const vMin = d3.min(vals) ?? 1;
    const vMax = d3.max(vals) ?? 1;
    const fSize = d3.scaleLinear().domain([vMin, vMax]).range([28, 140]);

    // layout bookkeeping (same math, new names)
    const PAD_L = 40;
    const PAD_R = 40;
    const span = Math.max(1, W - PAD_L - PAD_R);

    let sizesPx = top.map(d => fSize(d[1]));
    let textW = top.map((d, i) => this.measureWidth(root, d[0], sizesPx[i]));

    const n = textW.length;
    const maxSize = d3.max(sizesPx) || 28;
    const GAP_MIN = Math.max(24, maxSize * 0.08);
    const GAP_FLOOR = 8;

    let sumText = textW.reduce((a, b) => a + b, 0);
    let needed = sumText + (n > 1 ? (n - 1) * GAP_MIN : 0);

    if (needed > span) {
      const shrink = span / needed;
      sizesPx = sizesPx.map(s => Math.max(8, s * shrink));
      textW = top.map((d, i) => this.measureWidth(root, d[0], sizesPx[i]));
      sumText = textW.reduce((a, b) => a + b, 0);
    }

    let gapPx = n > 1 ? (span - sumText) / (n - 1) : 0;
    if (gapPx < GAP_FLOOR) gapPx = GAP_FLOOR;

    let total = sumText + (n - 1) * gapPx;
    if (total > span) {
      const k = span / total;
      gapPx *= k;
      total = sumText + (n - 1) * gapPx;
    }

    const left0 = PAD_L + (span - total) / 2;
    const xLeft = new Array(n).fill(0);
    xLeft[0] = left0;
    for (let i = 1; i < n; i++) {
      xLeft[i] = xLeft[i - 1] + textW[i - 1] + gapPx;
    }

    const yMid = H / 2;
    const renderData = top.map((d, i) => ({
      word: d[0],
      count: d[1],
      size: sizesPx[i],
      x: xLeft[i],
      y: yMid
    }));

    const tween = d3.transition().duration(900).ease(d3.easeCubicOut);

    const nodes = root.selectAll("text.word").data(renderData, d => d.word);

    nodes.exit().transition(tween).style("opacity", 0).remove();

    nodes
      .transition(tween)
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("font-size", d => d.size);

    nodes
      .enter()
      .append("text")
      .attr("class", "word")
      .attr("text-anchor", "start")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("font-size", 1)
      .style("opacity", 0)
      .text(d => d.word)
      .transition(tween)
      .style("opacity", 1)
      .attr("font-size", d => d.size);
  }
  handleGenerate = () => {
    const wf = this.getWordFrequency(this.state.inputText);
    this.setState({ wordFrequency: wf });
  };

  render() {
    return (
      <div className="parent">
        <div className="child1" style={{ width: 1000 }}>
          <textarea
            id="input_field"
            style={{ height: 150, width: 1000 }}
            value={this.state.inputText}
            onChange={(e) => this.setState({ inputText: e.target.value })}
            placeholder="Paste text here…"
          />
          <button
            type="button"
            style={{ marginTop: 10, height: 40, width: 1000 }}
            onClick={this.handleGenerate}
          >
            Generate WordCloud
          </button>
        </div>

        <div className="child2">
          <svg className="svg_parent" />
        </div>
      </div>
    );
  }
}

export default App;