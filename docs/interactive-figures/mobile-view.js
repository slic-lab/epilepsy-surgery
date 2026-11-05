/*
 * Mobile view for the readability Sankey figures.
 *
 * On narrow screens (phones, portrait tablets) the Sankey is too cramped to
 * read, so this script builds a list of the questions, in order and with
 * their readability level, from the figure's own data, and keeps the full
 * figure one tap away
 * in a horizontally scrollable container. Desktop layout is unchanged.
 *
 * Usage, at the end of a figure page:
 *     <script src="mobile-view.js" data-lang="fr"></script>
 */
(function () {
    "use strict";

    var BREAKPOINT = "(max-width: 820px)";
    var FIGURE_MIN_WIDTH = 1100;

    var STRINGS = {
        en: {
            question: "question",
            questions: "questions",
            show: "Show full figure",
            hide: "Hide full figure",
            hint: "Swipe sideways to explore the figure."
        },
        fr: {
            question: "question",
            questions: "questions",
            show: "Voir la figure complète",
            hide: "Masquer la figure complète",
            hint: "Glissez de côté pour explorer la figure."
        }
    };

    var DETAIL_SKIP = /^(Readability category|Words per sentence|Syllables per word|Analyzed text)/i;

    var script = document.currentScript;
    var lang = (script && script.getAttribute("data-lang")) || "en";
    var t = STRINGS[lang] || STRINGS.en;

    function stripTags(html) {
        var div = document.createElement("div");
        div.innerHTML = String(html).replace(/<br\s*\/?>/gi, " ");
        return (div.textContent || "").replace(/\s+/g, " ").trim();
    }

    function addStyles() {
        var css = [
            ".mv-list { display: none; }",
            ".mv-toggle { display: none; }",
            ".mv-hint { display: none; }",
            "@media " + BREAKPOINT + " {",
            "    .mv-list { display: block; }",
            "    .mv-toggle { display: flex; }",
            "    body:not(.mv-show-figure) .plot-container { display: none; }",
            "    body.mv-show-figure .mv-hint { display: block; }",
            "    .mv-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }",
            "    .mv-scroll .plot-container { min-width: " + FIGURE_MIN_WIDTH + "px; }",
            "}",
            ".mv-header { margin: 0.5rem 0.25rem 1.25rem; }",
            ".mv-title { margin: 0; font-size: 1.35rem; line-height: 1.25; }",
            ".mv-subtitle { margin: 0.5rem 0 0; color: #65708a; font-size: 0.85rem; }",
            ".mv-summary {",
            "    display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0 0.25rem 1.25rem; padding: 0;",
            "    list-style: none; font-size: 0.85rem;",
            "}",
            ".mv-summary li { display: flex; align-items: center; gap: 0.4rem; }",
            ".mv-group {",
            "    margin-bottom: 1rem; padding: 1rem 1.1rem;",
            "    border: 1px solid rgba(95, 108, 160, 0.16); border-radius: 18px;",
            "    background: rgba(255, 255, 255, 0.82);",
            "    box-shadow: 0 8px 24px rgba(69, 79, 130, 0.08);",
            "}",
            ".mv-group-head { margin: 0 0 0.4rem; font-size: 1.05rem; line-height: 1.3; }",
            ".mv-badge { display: inline-flex; align-items: center; gap: 0.35rem; margin-right: 0.5rem; color: #16213d; font-weight: 600; }",
            ".mv-dot { flex: none; width: 0.75rem; height: 0.75rem; border-radius: 50%; }",
            ".mv-count { color: #65708a; font-weight: 600; }",
            ".mv-items { margin: 0; padding: 0; list-style: none; }",
            ".mv-item { padding: 0.6rem 0; border-top: 1px solid rgba(95, 108, 160, 0.12); }",
            ".mv-question { margin: 0; font-weight: 600; line-height: 1.4; }",
            ".mv-meta { margin: 0.25rem 0 0; color: #65708a; font-size: 0.8rem; line-height: 1.5; }",
            ".mv-toggle {",
            "    justify-content: center; width: 100%; margin: 0.5rem 0 1rem; padding: 0.85rem 1rem;",
            "    border: 0; border-radius: 999px; color: #ffffff; background: #5367e8;",
            "    font: inherit; font-weight: 700; cursor: pointer;",
            "}",
            ".mv-hint { margin: 0 0 0.75rem; color: #65708a; font-size: 0.85rem; text-align: center; }"
        ].join("\n");
        var style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    function build(gd) {
        var trace = gd.data[0];
        var node = trace.node;
        var link = trace.link;
        var xs = node.x || [];
        var xMin = Math.min.apply(null, xs);
        var xMax = Math.max.apply(null, xs);

        function role(i) {
            if (xs[i] === xMin) { return "section"; }
            if (xs[i] === xMax) { return "level"; }
            return "item";
        }

        // Sections, questions and levels, each in the figure's own order
        // (questions are listed by number, as in the figure's middle column).
        var sections = {};
        var sectionOrder = [];
        var levels = {};
        var levelOrder = [];
        var items = {};

        for (var i = 0; i < node.label.length; i++) {
            if (role(i) === "section") {
                sections[i] = { name: stripTags(node.label[i]), items: [] };
                sectionOrder.push(i);
            } else if (role(i) === "level") {
                levels[i] = { name: stripTags(node.label[i]), color: node.color[i], count: 0 };
                levelOrder.push(i);
            } else {
                items[i] = { question: stripTags(node.label[i]), level: null, details: [] };
            }
        }

        for (var j = 0; j < link.source.length; j++) {
            var src = link.source[j];
            var dst = link.target[j];
            if (role(src) === "section" && role(dst) === "item") {
                sections[src].items.push(dst);
            } else if (role(src) === "item" && role(dst) === "level") {
                var parts = String((link.customdata || [])[j] || "").split(/<br\s*\/?>/i);
                items[src].level = levels[dst];
                items[src].details = parts
                    .map(stripTags)
                    .filter(function (line) { return /\d/.test(line) && line.indexOf(":") > 0 && !DETAIL_SKIP.test(line); });
                levels[dst].count += 1;
            }
        }

        var panel = document.querySelector(".sankey-panel") || document.body;
        var plot = panel.querySelector(".plot-container");

        var list = document.createElement("div");
        list.className = "mv-list";

        var header = document.createElement("header");
        header.className = "mv-header";
        var titleParts = String((gd.layout.title && gd.layout.title.text) || document.title).split(/<br\s*\/?>/i);
        var h1 = document.createElement("h1");
        h1.className = "mv-title";
        h1.textContent = stripTags(titleParts[0]);
        header.appendChild(h1);
        var subtitle = stripTags(titleParts.slice(1).join(" "));
        if (subtitle) {
            var p = document.createElement("p");
            p.className = "mv-subtitle";
            p.textContent = subtitle;
            header.appendChild(p);
        }
        list.appendChild(header);

        function badge(level) {
            var span = document.createElement("span");
            span.className = "mv-badge";
            var dot = document.createElement("span");
            dot.className = "mv-dot";
            dot.style.background = level.color;
            dot.setAttribute("aria-hidden", "true");
            span.appendChild(dot);
            span.appendChild(document.createTextNode(level.name));
            return span;
        }

        // Summary: how many questions fall in each readability level.
        var summary = document.createElement("ul");
        summary.className = "mv-summary";
        levelOrder.forEach(function (idx) {
            var level = levels[idx];
            if (!level.count) { return; }
            var li = document.createElement("li");
            li.appendChild(badge(level));
            var count = document.createElement("span");
            count.className = "mv-count";
            count.textContent = level.count + " " + (level.count > 1 ? t.questions : t.question);
            li.appendChild(count);
            summary.appendChild(li);
        });
        list.appendChild(summary);

        sectionOrder.forEach(function (idx) {
            var group = sections[idx];
            var ids = group.items.slice().sort(function (a, b) { return a - b; });
            if (!ids.length) { return; }
            var section = document.createElement("section");
            section.className = "mv-group";
            var head = document.createElement("h2");
            head.className = "mv-group-head";
            head.textContent = group.name;
            section.appendChild(head);

            var ul = document.createElement("ul");
            ul.className = "mv-items";
            ids.forEach(function (id) {
                var item = items[id];
                var li = document.createElement("li");
                li.className = "mv-item";
                var q = document.createElement("p");
                q.className = "mv-question";
                q.textContent = item.question;
                li.appendChild(q);
                var meta = document.createElement("p");
                meta.className = "mv-meta";
                if (item.level) {
                    meta.appendChild(badge(item.level));
                }
                if (item.details.length) {
                    meta.appendChild(document.createTextNode(item.details.join(" · ")));
                }
                li.appendChild(meta);
                ul.appendChild(li);
            });
            section.appendChild(ul);
            list.appendChild(section);
        });

        var button = document.createElement("button");
        button.type = "button";
        button.className = "mv-toggle";
        button.textContent = t.show;
        button.setAttribute("aria-expanded", "false");

        var hint = document.createElement("p");
        hint.className = "mv-hint";
        hint.textContent = t.hint;

        var scroller = document.createElement("div");
        scroller.className = "mv-scroll";
        plot.parentNode.insertBefore(scroller, plot);
        scroller.appendChild(plot);

        panel.insertBefore(list, scroller);
        panel.insertBefore(button, scroller);
        panel.insertBefore(hint, scroller);

        function resize() {
            if (window.Plotly && window.Plotly.Plots) {
                window.Plotly.Plots.resize(gd);
            }
        }

        button.addEventListener("click", function () {
            var shown = document.body.classList.toggle("mv-show-figure");
            button.textContent = shown ? t.hide : t.show;
            button.setAttribute("aria-expanded", String(shown));
            if (shown) {
                resize();
                button.scrollIntoView({ block: "start" });
            }
        });

        var mq = window.matchMedia(BREAKPOINT);
        var onChange = function () { resize(); };
        if (mq.addEventListener) {
            mq.addEventListener("change", onChange);
        } else if (mq.addListener) {
            mq.addListener(onChange);
        }
        resize();
    }

    function waitForPlot(attempt) {
        var gd = document.querySelector(".js-plotly-plot");
        if (gd && gd.data && gd.data[0] && gd.data[0].node) {
            build(gd);
        } else if (attempt < 100) {
            setTimeout(function () { waitForPlot(attempt + 1); }, 50);
        }
    }

    addStyles();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { waitForPlot(0); });
    } else {
        waitForPlot(0);
    }
})();
