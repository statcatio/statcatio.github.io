/* =====================================================================
   Chart Lab — an interactive Plotly playground.
   Live preview runs on Plotly.js; the copyable snippet is Plotly for
   Python. Both are driven from one `state` object, and every sample
   dataset is a small fixed array, so the code reproduces the preview
   exactly (paste-and-run, no random seeds).
   ===================================================================== */
(function () {
  "use strict";

  /* ---- palettes (curated, mostly colorblind-friendly) ---------------- */
  var PALETTES = {
    statcat: { name: "Statcat", colors: ["#3C6E9F", "#E1A140", "#6ECEC6", "#9E4A34", "#8E7CC3", "#5AA469"] },
    okabe:   { name: "Okabe–Ito", colors: ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9"] },
    retro:   { name: "Retro paper", colors: ["#C1642D", "#4C7A63", "#B58A2E", "#6E5A8E", "#9E4A34", "#37697E"] },
    cool:    { name: "Cool", colors: ["#013A63", "#2A6F97", "#468FAF", "#61A5C2", "#89C2D9", "#A9D6E5"] },
    warm:    { name: "Warm", colors: ["#9E4A34", "#C1642D", "#E1A140", "#E9C46A", "#F4A261", "#E76F51"] }
  };
  var SWATCHES = ["#3C6E9F", "#9E4A34", "#4C7A63", "#E1A140", "#6E5A8E", "#1C1A14"];
  var COLORSCALES = ["Viridis", "Cividis", "Blues", "YlOrRd", "Greens"];

  /* ---- backgrounds --------------------------------------------------- */
  var BG = {
    paper:       { plot: "#EFF3E3", paper: "#EFF3E3", font: "#1C1A14", grid: "rgba(28,26,20,0.10)" },
    white:       { plot: "#FFFFFF", paper: "#FFFFFF", font: "#1C1A14", grid: "rgba(28,26,20,0.08)" },
    dark:        { plot: "#1C1A14", paper: "#1C1A14", font: "#EFF3E3", grid: "rgba(239,243,227,0.14)" },
    transparent: { plot: "rgba(0,0,0,0)", paper: "rgba(0,0,0,0)", font: "#1C1A14", grid: "rgba(28,26,20,0.10)" }
  };
  var BG_LABEL = { paper: "Paper", white: "White", dark: "Dark", transparent: "None" };

  /* ---- sample data (small + fixed = preview matches code) ------------ */
  var D = {
    bar:    { x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], y: [12, 19, 15, 22, 18, 25] },
    group:  { cats: ["Q1", "Q2", "Q3", "Q4"], series: { "2024": [18, 22, 20, 27], "2025": [24, 26, 25, 31] } },
    line:   { x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], y: [8, 12, 9, 15, 17, 22] },
    area:   { x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], y: [5, 8, 12, 9, 14, 18] },
    scatter:{ x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], y: [2, 3, 5, 4, 7, 8, 7, 10, 9, 12, 13, 15] },
    bubble: { x: [1, 2, 3, 4, 5, 6, 7, 8], y: [10, 14, 9, 17, 13, 20, 16, 22], size: [18, 34, 12, 28, 40, 22, 30, 16] },
    hist:   { v: [42, 55, 48, 61, 53, 47, 59, 52, 44, 63, 50, 57, 46, 54, 60, 49, 51, 58, 43, 56, 52, 48, 62, 45, 53, 50, 59, 47, 55, 51, 46, 60, 54, 49, 57, 52, 44, 58, 50, 56] },
    box:    { groups: { "A": [22, 25, 27, 23, 29, 24, 26, 28, 21, 30, 25, 27], "B": [31, 34, 29, 36, 33, 30, 35, 32, 28, 37, 33, 31], "C": [18, 21, 17, 23, 20, 19, 22, 16, 24, 20, 18, 21] } },
    heat:   { x: ["Mon", "Tue", "Wed", "Thu", "Fri"], y: ["9am", "12pm", "3pm", "6pm"], z: [[4, 7, 9, 6, 12], [8, 11, 13, 10, 15], [6, 9, 12, 8, 14], [3, 5, 7, 4, 9]] },
    pie:    { labels: ["Python", "SQL", "R", "Other"], values: [45, 25, 20, 10] }
  };

  /* ---- little Python codegen helpers --------------------------------- */
  function pyStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
  function pyArr(a) {
    return "[" + a.map(function (v) { return typeof v === "number" ? v : pyStr(v); }).join(", ") + "]";
  }
  function pyArr2(a) { return "[" + a.map(pyArr).join(", ") + "]"; }

  // fig.update_layout(...) as Python, mirroring layoutJS
  function layoutPy(s, axes) {
    var bg = BG[s.bg], lines = [];
    if (s.title) lines.push("    title=" + pyStr(s.title) + ",");
    lines.push("    plot_bgcolor=" + pyStr(bg.plot) + ",");
    lines.push("    paper_bgcolor=" + pyStr(bg.paper) + ",");
    lines.push('    font=dict(family="Spline Sans Mono, monospace", color=' + pyStr(bg.font) + "),");
    lines.push("    showlegend=" + (s.legend ? "True" : "False") + ",");
    if (axes && s.xTitle) lines.push("    xaxis_title=" + pyStr(s.xTitle) + ",");
    if (axes && s.yTitle) lines.push("    yaxis_title=" + pyStr(s.yTitle) + ",");
    return "fig.update_layout(\n" + lines.join("\n") + "\n)";
  }

  // Plotly.js layout object, mirroring layoutPy
  function layoutJS(s, axes) {
    var bg = BG[s.bg];
    var L = {
      plot_bgcolor: bg.plot, paper_bgcolor: bg.paper,
      font: { family: "Spline Sans Mono, monospace", color: bg.font, size: 13 },
      margin: { t: s.title ? 52 : 22, r: 24, b: axes ? 54 : 22, l: axes ? 58 : 22 },
      showlegend: s.legend,
      legend: { orientation: "h", y: -0.2, font: { size: 11 } }
    };
    if (s.title) L.title = { text: s.title, font: { size: 18 } };
    if (axes) {
      L.xaxis = { title: { text: s.xTitle }, gridcolor: bg.grid, zerolinecolor: bg.grid, linecolor: bg.grid };
      L.yaxis = { title: { text: s.yTitle }, gridcolor: bg.grid, zerolinecolor: bg.grid, linecolor: bg.grid };
    }
    return L;
  }

  function join() {
    return Array.prototype.filter.call(arguments, function (x) { return x; }).join("\n");
  }

  // long-form arrays for grouped/box/violin data
  function longForm(cats, series) {
    var cat = [], grp = [], val = [];
    Object.keys(series).forEach(function (k) {
      cats.forEach(function (c, i) { cat.push(c); grp.push(k); val.push(series[k][i]); });
    });
    return { cat: cat, grp: grp, val: val };
  }
  function longGroups(groups) {
    var grp = [], val = [];
    Object.keys(groups).forEach(function (k) {
      groups[k].forEach(function (v) { grp.push(k); val.push(v); });
    });
    return { grp: grp, val: val };
  }

  /* ---- chart definitions --------------------------------------------- */
  var CHARTS = {
    bar: {
      label: "Bar", name: "Bar chart", axes: true, color: "single", labels: true,
      use: "— compare a value across a handful of categories.",
      docs: "https://plotly.com/python/bar-charts/",
      js: function (s) {
        var t = { type: "bar", name: "sales", x: D.bar.x, y: D.bar.y, marker: { color: s.color } };
        if (s.labels) { t.text = D.bar.y.map(String); t.textposition = "outside"; }
        return [t];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\n    \"month\": " + pyArr(D.bar.x) + ",\n    \"sales\": " + pyArr(D.bar.y) + ",\n})";
        var fig = "fig = px.bar(df, x=\"month\", y=\"sales\"," + (s.labels ? " text_auto=True," : "") +
          "\n             color_discrete_sequence=[" + pyStr(s.color) + "])";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    group: {
      label: "Grouped bar", name: "Grouped bar chart", axes: true, color: "palette", labels: true,
      use: "— compare categories across two or more groups.",
      docs: "https://plotly.com/python/bar-charts/",
      js: function (s) {
        return Object.keys(D.group.series).map(function (k, i) {
          var t = { type: "bar", name: k, x: D.group.cats, y: D.group.series[k], marker: { color: s.palette[i % s.palette.length] } };
          if (s.labels) { t.text = D.group.series[k].map(String); t.textposition = "outside"; }
          return t;
        });
      },
      py: function (s) {
        var lf = longForm(D.group.cats, D.group.series);
        var df = "df = pd.DataFrame({\n    \"quarter\": " + pyArr(lf.cat) + ",\n    \"year\": " + pyArr(lf.grp) + ",\n    \"value\": " + pyArr(lf.val) + ",\n})";
        var fig = "fig = px.bar(df, x=\"quarter\", y=\"value\", color=\"year\", barmode=\"group\"," +
          (s.labels ? " text_auto=True," : "") + "\n             color_discrete_sequence=" + pyArr(s.palette) + ")";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    line: {
      label: "Line", name: "Line chart", axes: true, color: "single", labels: true,
      use: "— show how something changes over time.",
      docs: "https://plotly.com/python/line-charts/",
      js: function (s) {
        var t = { type: "scatter", name: "value", mode: s.labels ? "lines+markers+text" : "lines+markers",
          x: D.line.x, y: D.line.y, line: { color: s.color, width: 2.5 }, marker: { color: s.color } };
        if (s.labels) { t.text = D.line.y.map(String); t.textposition = "top center"; }
        return [t];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\n    \"month\": " + pyArr(D.line.x) + ",\n    \"value\": " + pyArr(D.line.y) + ",\n})";
        var fig = "fig = px.line(df, x=\"month\", y=\"value\", markers=True,\n              color_discrete_sequence=[" + pyStr(s.color) + "])";
        var lab = s.labels ? "fig.update_traces(mode=\"lines+markers+text\", text=df[\"value\"], textposition=\"top center\")" : "";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, lab, "", layoutPy(s, true), "fig.show()");
      }
    },

    area: {
      label: "Area", name: "Area chart", axes: true, color: "single", labels: false,
      use: "— a line chart when the magnitude matters, not just the trend.",
      docs: "https://plotly.com/python/filled-area-plots/",
      js: function (s) {
        return [{ type: "scatter", name: "value", mode: "lines", fill: "tozeroy", x: D.area.x, y: D.area.y,
          line: { color: s.color, width: 2.5 },
          fillcolor: hexA(s.color, 0.25) }];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\n    \"month\": " + pyArr(D.area.x) + ",\n    \"value\": " + pyArr(D.area.y) + ",\n})";
        var fig = "fig = px.area(df, x=\"month\", y=\"value\",\n              color_discrete_sequence=[" + pyStr(s.color) + "])";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    scatter: {
      label: "Scatter", name: "Scatter plot", axes: true, color: "single", labels: false,
      use: "— reveal the relationship between two numeric variables.",
      docs: "https://plotly.com/python/line-and-scatter/",
      js: function (s) {
        return [{ type: "scatter", name: "points", mode: "markers", x: D.scatter.x, y: D.scatter.y,
          marker: { color: s.color, size: 11, line: { width: 0 } } }];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\n    \"x\": " + pyArr(D.scatter.x) + ",\n    \"y\": " + pyArr(D.scatter.y) + ",\n})";
        var fig = "fig = px.scatter(df, x=\"x\", y=\"y\",\n                 color_discrete_sequence=[" + pyStr(s.color) + "])";
        var sz = "fig.update_traces(marker=dict(size=11))";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, sz, "", layoutPy(s, true), "fig.show()");
      }
    },

    bubble: {
      label: "Bubble", name: "Bubble chart", axes: true, color: "single", labels: false,
      use: "— a scatter plot with a third variable encoded as size.",
      docs: "https://plotly.com/python/bubble-charts/",
      js: function (s) {
        var ref = sizeref(D.bubble.size);
        return [{ type: "scatter", name: "points", mode: "markers", x: D.bubble.x, y: D.bubble.y,
          marker: { color: s.color, size: D.bubble.size, sizemode: "area", sizeref: ref, line: { width: 0 } } }];
      },
      py: function (s) {
        var ref = sizeref(D.bubble.size);
        var fig = "fig = go.Figure(go.Scatter(\n" +
          "    x=" + pyArr(D.bubble.x) + ", y=" + pyArr(D.bubble.y) + ", mode=\"markers\",\n" +
          "    marker=dict(size=" + pyArr(D.bubble.size) + ", color=" + pyStr(s.color) + ",\n" +
          "                sizemode=\"area\", sizeref=" + ref + ", line=dict(width=0)),\n))";
        return join("import plotly.graph_objects as go", "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    hist: {
      label: "Histogram", name: "Histogram", axes: true, color: "single", labels: false,
      use: "— see the shape of a single distribution.",
      docs: "https://plotly.com/python/histograms/",
      js: function (s) {
        return [{ type: "histogram", name: "value", x: D.hist.v, nbinsx: 8, marker: { color: s.color } }];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\"value\": " + pyArr(D.hist.v) + "})";
        var fig = "fig = px.histogram(df, x=\"value\", nbins=8,\n                   color_discrete_sequence=[" + pyStr(s.color) + "])";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    box: {
      label: "Box", name: "Box plot", axes: true, color: "palette", labels: false,
      use: "— compare distributions and spot outliers across groups.",
      docs: "https://plotly.com/python/box-plots/",
      js: function (s) {
        return Object.keys(D.box.groups).map(function (k, i) {
          return { type: "box", name: k, y: D.box.groups[k], marker: { color: s.palette[i % s.palette.length] }, line: { color: s.palette[i % s.palette.length] } };
        });
      },
      py: function (s) {
        var lf = longGroups(D.box.groups);
        var df = "df = pd.DataFrame({\n    \"group\": " + pyArr(lf.grp) + ",\n    \"value\": " + pyArr(lf.val) + ",\n})";
        var fig = "fig = px.box(df, x=\"group\", y=\"value\", color=\"group\",\n             color_discrete_sequence=" + pyArr(s.palette) + ")";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    violin: {
      label: "Violin", name: "Violin plot", axes: true, color: "palette", labels: false,
      use: "— like a box plot, but shows the full distribution's shape.",
      docs: "https://plotly.com/python/violin/",
      js: function (s) {
        return Object.keys(D.box.groups).map(function (k, i) {
          return { type: "violin", name: k, y: D.box.groups[k], box: { visible: true }, meanline: { visible: true },
            line: { color: s.palette[i % s.palette.length] }, fillcolor: hexA(s.palette[i % s.palette.length], 0.25) };
        });
      },
      py: function (s) {
        var lf = longGroups(D.box.groups);
        var df = "df = pd.DataFrame({\n    \"group\": " + pyArr(lf.grp) + ",\n    \"value\": " + pyArr(lf.val) + ",\n})";
        var fig = "fig = px.violin(df, x=\"group\", y=\"value\", color=\"group\", box=True,\n                color_discrete_sequence=" + pyArr(s.palette) + ")";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    heat: {
      label: "Heatmap", name: "Heatmap", axes: true, color: "colorscale", labels: true,
      use: "— show magnitude across two categorical dimensions.",
      docs: "https://plotly.com/python/heatmaps/",
      js: function (s) {
        var t = { type: "heatmap", z: D.heat.z, x: D.heat.x, y: D.heat.y, colorscale: s.colorscale };
        if (s.labels) { t.text = D.heat.z; t.texttemplate = "%{z}"; t.textfont = { size: 11 }; }
        return [t];
      },
      py: function (s) {
        var fig = "fig = go.Figure(go.Heatmap(\n" +
          "    z=" + pyArr2(D.heat.z) + ",\n    x=" + pyArr(D.heat.x) + ", y=" + pyArr(D.heat.y) + ",\n" +
          "    colorscale=" + pyStr(s.colorscale) + (s.labels ? ",\n    texttemplate=\"%{z}\"" : "") + ",\n))";
        return join("import plotly.graph_objects as go", "", fig, "", layoutPy(s, true), "fig.show()");
      }
    },

    pie: {
      label: "Pie", name: "Pie chart", axes: false, color: "palette", labels: true,
      use: "— show parts of a whole. Best with only a few slices.",
      docs: "https://plotly.com/python/pie-charts/",
      js: function (s) {
        return [{ type: "pie", labels: D.pie.labels, values: D.pie.values,
          marker: { colors: s.palette }, textinfo: s.labels ? "label+percent" : "none", sort: false }];
      },
      py: function (s) {
        var df = "df = pd.DataFrame({\n    \"category\": " + pyArr(D.pie.labels) + ",\n    \"value\": " + pyArr(D.pie.values) + ",\n})";
        var fig = "fig = px.pie(df, names=\"category\", values=\"value\", sort=False,\n             color_discrete_sequence=" + pyArr(s.palette) + ")";
        var info = "fig.update_traces(textinfo=" + pyStr(s.labels ? "label+percent" : "none") + ")";
        return join("import plotly.express as px", "import pandas as pd", "", df, "", fig, info, "", layoutPy(s, false), "fig.show()");
      }
    }
  };

  var ORDER = ["bar", "group", "line", "area", "scatter", "bubble", "hist", "box", "violin", "heat", "pie"];

  /* ---- tiny color + math utils --------------------------------------- */
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function sizeref(sizes) {
    var max = Math.max.apply(null, sizes);
    return Math.round((2 * max / (44 * 44)) * 10000) / 10000; // desired max ~44px
  }

  /* ---- state --------------------------------------------------------- */
  var state = {
    chartType: "bar",
    color: "#3C6E9F",
    paletteId: "statcat",
    palette: PALETTES.statcat.colors,
    colorscale: "Viridis",
    bg: "paper",
    labels: false,
    legend: true,
    title: "",
    xTitle: "",
    yTitle: ""
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---- build control UIs --------------------------------------------- */
  function pressGroup(container, selector, isActive) {
    Array.prototype.forEach.call(container.querySelectorAll(selector), function (el) {
      el.setAttribute("aria-pressed", isActive(el) ? "true" : "false");
    });
  }

  function buildTypeSeg() {
    var c = $("type-seg");
    ORDER.forEach(function (key) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.dataset.type = key;
      b.textContent = CHARTS[key].label;
      b.setAttribute("aria-pressed", key === state.chartType ? "true" : "false");
      b.addEventListener("click", function () {
        state.chartType = key;
        pressGroup(c, ".chip", function (el) { return el.dataset.type === key; });
        syncControls();
        render();
      });
      c.appendChild(b);
    });
  }

  function buildColorSwatches() {
    var c = $("color-swatches"), picker = $("color-picker");
    SWATCHES.forEach(function (hex) {
      var b = document.createElement("button");
      b.className = "swatch"; b.type = "button"; b.dataset.color = hex;
      b.style.background = hex; b.setAttribute("aria-label", hex);
      b.addEventListener("click", function () {
        state.color = hex; picker.value = hex;
        pressGroup(c, ".swatch", function (el) { return el.dataset.color === state.color; });
        render();
      });
      c.insertBefore(b, picker);
    });
    picker.addEventListener("input", function () {
      state.color = picker.value;
      pressGroup(c, ".swatch", function (el) { return el.dataset.color === state.color; });
      render();
    });
    // explicit init so the default doesn't depend on browser form-restoration
    picker.value = state.color;
    pressGroup(c, ".swatch", function (el) { return el.dataset.color === state.color; });
  }

  function buildPaletteChips() {
    var c = $("palette-chips");
    Object.keys(PALETTES).forEach(function (id) {
      var p = PALETTES[id];
      var b = document.createElement("button");
      b.className = "pal-chip"; b.type = "button"; b.dataset.pal = id;
      b.title = p.name;
      b.setAttribute("aria-label", p.name);
      p.colors.slice(0, 5).forEach(function (col) {
        var i = document.createElement("i"); i.style.background = col; b.appendChild(i);
      });
      b.setAttribute("aria-pressed", id === state.paletteId ? "true" : "false");
      b.addEventListener("click", function () {
        state.paletteId = id; state.palette = p.colors;
        pressGroup(c, ".pal-chip", function (el) { return el.dataset.pal === id; });
        render();
      });
      c.appendChild(b);
    });
  }

  function buildColorscaleSeg() {
    var c = $("colorscale-seg");
    COLORSCALES.forEach(function (name) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.dataset.scale = name;
      b.textContent = name;
      b.setAttribute("aria-pressed", name === state.colorscale ? "true" : "false");
      b.addEventListener("click", function () {
        state.colorscale = name;
        pressGroup(c, ".chip", function (el) { return el.dataset.scale === name; });
        render();
      });
      c.appendChild(b);
    });
  }

  function buildBgSeg() {
    var c = $("bg-seg");
    Object.keys(BG_LABEL).forEach(function (key) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.dataset.bg = key;
      b.textContent = BG_LABEL[key];
      b.setAttribute("aria-pressed", key === state.bg ? "true" : "false");
      b.addEventListener("click", function () {
        state.bg = key;
        pressGroup(c, ".chip", function (el) { return el.dataset.bg === key; });
        render();
      });
      c.appendChild(b);
    });
  }

  /* ---- show/hide controls per chart type ----------------------------- */
  // legend is only useful on multi-series charts; default it sensibly per type
  var LEGEND_ON = { group: 1, box: 1, violin: 1, pie: 1 };

  function syncControls() {
    var cfg = CHARTS[state.chartType];
    $("field-color").hidden = cfg.color !== "single";
    $("field-palette").hidden = cfg.color !== "palette";
    $("field-colorscale").hidden = cfg.color !== "colorscale";
    $("axis-titles").style.display = cfg.axes ? "" : "none";

    var labelsWrap = $("wrap-labels"), labelsInput = $("opt-labels");
    labelsWrap.style.display = cfg.labels ? "" : "none";
    if (!cfg.labels) { labelsInput.checked = false; state.labels = false; }

    state.legend = !!LEGEND_ON[state.chartType];
    $("opt-legend").checked = state.legend;
  }

  /* ---- render -------------------------------------------------------- */
  var Plot = window.Plotly;
  function render() {
    var cfg = CHARTS[state.chartType];
    var config = { responsive: true, displayModeBar: false };
    if (Plot) Plot.react("plot", cfg.js(state), layoutJS(state, cfg.axes), config);

    $("code").textContent = cfg.py(state);
    $("chart-name").textContent = cfg.name;
    $("chart-use").textContent = cfg.use;
    $("docs-link").href = cfg.docs;
  }

  /* ---- wire the rest ------------------------------------------------- */
  function wire() {
    $("opt-labels").addEventListener("change", function (e) { state.labels = e.target.checked; render(); });
    $("opt-legend").addEventListener("change", function (e) { state.legend = e.target.checked; render(); });
    $("t-title").addEventListener("input", function (e) { state.title = e.target.value; render(); });
    $("t-x").addEventListener("input", function (e) { state.xTitle = e.target.value; render(); });
    $("t-y").addEventListener("input", function (e) { state.yTitle = e.target.value; render(); });

    var copyBtn = $("copy-btn");
    copyBtn.addEventListener("click", function () {
      var text = $("code").textContent;
      var done = function () {
        copyBtn.textContent = "Copied ✓"; copyBtn.classList.add("done");
        clearTimeout(copyBtn._t);
        copyBtn._t = setTimeout(function () { copyBtn.textContent = "Copy"; copyBtn.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });

    // footer cat: small idle blink
    var cat = document.querySelector(".cat-btn");
    if (cat && !reduce) {
      var face = cat.querySelector(".cat-face");
      var AWAKE = " /\\_/\\\n( o.o )\n > ^ <", BLINK = " /\\_/\\\n( -.- )\n > ^ <";
      setInterval(function () {
        face.textContent = BLINK;
        setTimeout(function () { face.textContent = AWAKE; }, 160);
      }, 4600);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---- go ------------------------------------------------------------ */
  buildTypeSeg();
  buildColorSwatches();
  buildPaletteChips();
  buildColorscaleSeg();
  buildBgSeg();
  wire();
  syncControls();
  render();
})();
