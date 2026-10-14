(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const expressionEl = $("expression");
  const resultEl = $("result");
  const labelEl = $("displayLabel");
  const scientificPanel = $("scientificPanel");
  const historyPanel = $("historyPanel");
  const historyList = $("historyList");
  const toastEl = $("toast");
  let expression = "";
  let justEvaluated = false;
  let toastTimer;

  const STORAGE_KEY = "quickcalc-history-v1";
  let history = loadHistory();

  function loadHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.slice(0, 30) : [];
    } catch (_) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30))); }
    catch (_) { showToast("History could not be saved on this browser."); }
  }
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }
  function formatNumber(value) {
    if (!Number.isFinite(value)) throw new Error("Result is not finite");
    if (Object.is(value, -0)) value = 0;
    if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
      return value.toExponential(7).replace(/\.?0+e/, "e");
    }
    return Number(value.toPrecision(12)).toString();
  }
  function pretty(expr) { return expr.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−"); }
  function render() {
    expressionEl.textContent = expression ? pretty(expression) : "0";
    expressionEl.scrollLeft = expressionEl.scrollWidth;
  }
  function append(value) {
    if (justEvaluated && /^[0-9.]$/.test(value)) expression = "";
    justEvaluated = false;
    if (value === ".") {
      const lastNumber = expression.split(/[+\-*/()]/).pop();
      if (lastNumber.includes(".")) return;
      if (!lastNumber) expression += "0";
    }
    expression += value;
    resultEl.textContent = "";
    labelEl.textContent = "READY TO CALCULATE";
    render();
  }
  function clearAll() {
    expression = "";
    resultEl.textContent = "";
    labelEl.textContent = "READY TO CALCULATE";
    justEvaluated = false;
    render();
  }
  function backspace() {
    expression = expression.slice(0, -1);
    resultEl.textContent = "";
    justEvaluated = false;
    render();
  }
  function toggleSign() {
    if (!expression) { expression = "-"; render(); return; }
    const match = expression.match(/(\d*\.?\d+)(?!.*\d)/);
    if (match) {
      const start = match.index;
      const before = expression.slice(0, start);
      const number = match[0];
      expression = before.endsWith("-") && (before.length === 1 || /[+*/(]$/.test(before.slice(0, -1)))
        ? before.slice(0, -1) + number : before + "(-" + number + ")";
    } else expression = "-" + expression;
    render();
  }
  function addPercent() {
    const match = expression.match(/(\d*\.?\d+)(?!.*\d)/);
    if (!match) return;
    const start = match.index;
    expression = expression.slice(0, start) + "(" + match[0] + "/100)";
    render();
  }

  // Tokenizer + recursive-descent parser. No eval() or Function() is used.
  function tokenize(input) {
    const s = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const rest = s.slice(i);
      const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if (number) { tokens.push({type:"number", value:Number(number[0])}); i += number[0].length; continue; }
      const ident = rest.match(/^[a-zA-Z]+/);
      if (ident) {
        const name = ident[0].toLowerCase();
        if (name === "pi") tokens.push({type:"number", value:Math.PI});
        else if (name === "e") tokens.push({type:"number", value:Math.E});
        else if (["sin","cos","tan","log","ln","sqrt"].includes(name)) tokens.push({type:"func", value:name});
        else throw new Error("Unknown function");
        i += ident[0].length; continue;
      }
      if (s[i] === "π") { tokens.push({type:"number",value:Math.PI}); i++; continue; }
      if ("+-*/^()%".includes(s[i])) { tokens.push({type:s[i],value:s[i]}); i++; continue; }
      throw new Error("Invalid character");
    }
    // Implicit multiplication: 2π, 2(3+4), (2)(3), 2sin(30)
    const out = [];
    for (let j=0;j<tokens.length;j++) {
      const prev = out[out.length-1], cur = tokens[j];
      const prevEnds = prev && (prev.type==="number" || prev.type===")" );
      const curStarts = cur.type==="number" || cur.type==="(" || cur.type==="func";
      if (prevEnds && curStarts) out.push({type:"*",value:"*"});
      out.push(cur);
    }
    return out;
  }
  function calculate(input) {
    const tokens = tokenize(input);
    let pos = 0;
    const peek = () => tokens[pos];
    const eat = (type) => { if (peek() && peek().type===type) return tokens[pos++]; return null; };
    function primary() {
      if (eat("+")) return primary();
      if (eat("-")) return -primary();
      if (eat("(")) {
        const value = addSub();
        if (!eat(")")) throw new Error("Missing closing bracket");
        return value;
      }
      const func = eat("func");
      if (func) {
        let arg;
        if (eat("(")) {
          arg = addSub();
          if (!eat(")")) throw new Error("Missing closing bracket");
        } else arg = primary();
        let v;
        switch (func.value) {
          case "sin": v = Math.sin(arg * Math.PI / 180); break;
          case "cos": v = Math.cos(arg * Math.PI / 180); break;
          case "tan": v = Math.tan(arg * Math.PI / 180); break;
          case "log": if (arg <= 0) throw new Error("log needs a positive number"); v = Math.log10(arg); break;
          case "ln": if (arg <= 0) throw new Error("ln needs a positive number"); v = Math.log(arg); break;
          case "sqrt": if (arg < 0) throw new Error("Cannot square-root a negative number"); v = Math.sqrt(arg); break;
          default: throw new Error("Unknown function");
        }
        return v;
      }
      const n = eat("number");
      if (n) return n.value;
      throw new Error("Check your expression");
    }
    function power() {
      let left = primary();
      if (eat("^")) left = Math.pow(left, power());
      return left;
    }
    function mulDiv() {
      let v = power();
      while (peek() && ["*","/","%"].includes(peek().type)) {
        const op = tokens[pos++].type, right = power();
        if (op === "*") v *= right;
        else if (op === "/") { if (right === 0) throw new Error("Cannot divide by zero"); v /= right; }
        else v %= right;
      }
      return v;
    }
    function addSub() {
      let v = mulDiv();
      while (peek() && (peek().type === "+" || peek().type === "-")) {
        const op = tokens[pos++].type, right = mulDiv();
        v = op === "+" ? v + right : v - right;
      }
      return v;
    }
    const value = addSub();
    if (pos !== tokens.length) throw new Error("Check your brackets or operators");
    if (!Number.isFinite(value)) throw new Error("Result is outside the supported range");
    return value;
  }

  function evaluate() {
    if (!expression.trim()) return;
    try {
      const answer = calculate(expression);
      const formatted = formatNumber(answer);
      history.unshift({ expression: pretty(expression), answer: formatted, time: Date.now() });
      history = history.slice(0, 30);
      saveHistory();
      renderHistory();
      resultEl.textContent = "= " + formatted;
      labelEl.textContent = "CALCULATED RESULT";
      expression = formatted;
      justEvaluated = true;
      render();
    } catch (err) {
      resultEl.textContent = "";
      labelEl.textContent = "CHECK YOUR EXPRESSION";
      showToast(err && err.message ? err.message : "Could not calculate that expression.");
    }
  }

  function renderHistory() {
    historyList.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Your calculations will appear here.";
      historyList.appendChild(empty);
      return;
    }
    history.forEach((item) => {
      const button = document.createElement("button");
      button.className = "history-item";
      button.type = "button";
      const eq = document.createElement("span");
      eq.className = "history-equation";
      eq.textContent = item.expression;
      const answer = document.createElement("span");
      answer.className = "history-answer";
      answer.textContent = item.answer;
      button.append(eq, answer);
      button.addEventListener("click", () => {
        expression = item.answer;
        justEvaluated = true;
        resultEl.textContent = "";
        labelEl.textContent = "REUSED RESULT";
        render();
        historyPanel.classList.add("hidden");
        $("historyToggle").classList.remove("active");
      });
      historyList.appendChild(button);
    });
  }

  document.getElementById("keypad").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action, value = button.dataset.value;
    if (action === "digit") append(value);
    else if (action === "decimal") append(".");
    else if (action === "operator") {
      if (!expression && value !== "−") return;
      const op = value === "×" ? "*" : value === "÷" ? "/" : value === "−" ? "-" : value;
      if (/[+\-*/]$/.test(expression)) expression = expression.slice(0,-1);
      append(op);
    } else if (action === "clear") clearAll();
    else if (action === "backspace") backspace();
    else if (action === "sign") toggleSign();
    else if (action === "percent") addPercent();
    else if (action === "equals") evaluate();
  });

  scientificPanel.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='func']");
    if (!button) return;
    const value = button.dataset.value;
    if (value === "^2") append("^2");
    else if (value === "^") append("^");
    else if (value === "π") append("π");
    else if (value === "e") append("e");
    else append(value);
  });
  $("scientificToggle").addEventListener("click", () => {
    scientificPanel.classList.toggle("hidden");
    $("scientificToggle").classList.toggle("active");
  });
  $("historyToggle").addEventListener("click", () => {
    historyPanel.classList.toggle("hidden");
    $("historyToggle").classList.toggle("active");
    if (!historyPanel.classList.contains("hidden")) renderHistory();
  });
  $("clearHistory").addEventListener("click", () => {
    history = [];
    saveHistory();
    renderHistory();
    showToast("Calculation history cleared.");
  });

  document.addEventListener("keydown", (event) => {
    if (/^[0-9]$/.test(event.key)) append(event.key);
    else if (event.key === ".") append(".");
    else if (event.key === "+") append("+");
    else if (event.key === "-") append("-");
    else if (event.key === "*") append("*");
    else if (event.key === "/") { event.preventDefault(); append("/"); }
    else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); evaluate(); }
    else if (event.key === "Backspace") backspace();
    else if (event.key === "Escape") clearAll();
    else if (event.key === "(" || event.key === ")") append(event.key);
  });

  render();
  renderHistory();
})();